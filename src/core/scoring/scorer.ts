import { ParsedJobDescription, ParsedResume } from "../../types/parser";
import { ATSAnalysisResult, ATSBreakdown, KeywordWeight } from "../../types/scoring";
import { KeywordCategory, ResolvedATSConfig } from "../../types/config";
import { clamp, countFrequencies, tokenize, unique } from "../../utils/text";
import { normalizeSkill, normalizeSkills } from "../../utils/skills";
import { diffLanguages } from "../../utils/languages";
import { extractDegreeLevels } from "../parser/jd.parser";

const REQUIRED_SKILL_WEIGHT = 0.7;
const OPTIONAL_SKILL_WEIGHT = 0.3;
const EXPERIENCE_YEARS_WEIGHT = 0.75;
const EXPERIENCE_ROLE_WEIGHT = 0.25;

const ALL_CATEGORIES: KeywordCategory[] = ["technical", "tool", "concept", "soft", "marketing", "domain"];

interface ScoringArtifacts {
  matchedKeywords: string[];
  missingKeywords: string[];
  overusedKeywords: string[];
  keywordsByCategory: ATSAnalysisResult["keywordsByCategory"];
  keywordWeights: KeywordWeight[];
}

export interface ScoreComputation extends ATSAnalysisResult {
  // missingSkills / matchedSkills inherited from ATSAnalysisResult
  missingExperienceYears: number;
  educationScore: number;
}

function emptyCategoryBuckets(): ATSAnalysisResult["keywordsByCategory"] {
  const buckets = {} as ATSAnalysisResult["keywordsByCategory"];
  for (const category of ALL_CATEGORIES) {
    buckets[category] = { matched: [], missing: [] };
  }
  return buckets;
}

function scoreSkills(
  resume: ParsedResume,
  job: ParsedJobDescription,
  config: ResolvedATSConfig
): { score: number; matched: string[]; missing: string[] } {
  const profileRequired = config.profile?.mandatorySkills ?? [];
  const profileOptional = config.profile?.optionalSkills ?? [];

  const required = new Set(
    normalizeSkills([...job.requiredSkills, ...profileRequired], config.skillAliases)
  );
  const optional = new Set(
    normalizeSkills([...job.preferredSkills, ...profileOptional], config.skillAliases)
  );
  const resumeSkills = new Set(normalizeSkills(resume.skills, config.skillAliases));

  const matchedRequired = [...required].filter((skill) => resumeSkills.has(skill));
  const matchedOptional = [...optional].filter((skill) => resumeSkills.has(skill));

  const requiredCoverage = required.size === 0 ? 1 : matchedRequired.length / required.size;
  const optionalCoverage = optional.size === 0 ? 1 : matchedOptional.length / optional.size;

  const score = clamp(
    (requiredCoverage * REQUIRED_SKILL_WEIGHT + optionalCoverage * OPTIONAL_SKILL_WEIGHT) * 100,
    0,
    100
  );

  const matched = [...required].filter((skill) => resumeSkills.has(skill)).sort();
  const missing = [...required].filter((skill) => !resumeSkills.has(skill)).sort();
  return { score, matched, missing };
}

function scoreExperience(
  resume: ParsedResume,
  job: ParsedJobDescription,
  config: ResolvedATSConfig
): { score: number; missingYears: number } {
  const requiredYears = job.minExperienceYears ?? config.profile?.minExperience ?? 0;
  if (!requiredYears) {
    return { score: 100, missingYears: 0 };
  }
  const yearCoverage = clamp(resume.totalExperienceYears / requiredYears, 0, 2);
  const yearsComponent = clamp(yearCoverage, 0, 1) * EXPERIENCE_YEARS_WEIGHT;

  // #1 fix: job.roleKeywords are single lowercase tokens ("engineer"), but resume.jobTitles are
  // full phrases ("senior software engineer") — compare via token overlap, not whole-phrase Set.has.
  const jobRoleSet = new Set(job.roleKeywords.map((value) => value.toLowerCase()));
  const resumeTitleTokens = new Set(resume.jobTitles.flatMap((t) => tokenize(t)));
  const matchedRoles = job.roleKeywords.filter((rk) => resumeTitleTokens.has(rk.toLowerCase()));
  const titleCoverage = jobRoleSet.size === 0 ? 1 : matchedRoles.length / jobRoleSet.size;
  const roleComponent = clamp(titleCoverage, 0, 1) * EXPERIENCE_ROLE_WEIGHT;

  const score = clamp((yearsComponent + roleComponent) * 100, 0, 100);
  const missingYears = Math.max(requiredYears - resume.totalExperienceYears, 0);
  return { score, missingYears: Number(missingYears.toFixed(2)) };
}

// ponytail: linear location+freq weighting — no TF-IDF until needed.
function keywordWeightOf(
  keyword: string,
  requiredSet: Set<string>,
  preferredSet: Set<string>,
  jdFrequencies: Record<string, number>
): number {
  const base = requiredSet.has(keyword) ? 3 : preferredSet.has(keyword) ? 2 : 1;
  const freqBonus = Math.min((jdFrequencies[keyword] ?? 1) - 1, 3) * 0.25;
  return base + freqBonus;
}

function scoreKeywords(
  resume: ParsedResume,
  job: ParsedJobDescription,
  config: ResolvedATSConfig
): { score: number } & ScoringArtifacts {
  // Normalize both sides through the alias map so e.g. "js" ↔ "javascript" match symmetrically
  const jobKeywordSet = new Set(
    job.keywords.map((k) => normalizeSkill(k, config.skillAliases))
  );
  if (jobKeywordSet.size === 0) {
    return {
      score: 100,
      matchedKeywords: [],
      missingKeywords: [],
      overusedKeywords: [],
      keywordsByCategory: emptyCategoryBuckets(),
      keywordWeights: [],
    };
  }

  const resumeTokens = tokenize(resume.normalizedText).map((t) =>
    normalizeSkill(t, config.skillAliases)
  );
  const resumeTokenSet = new Set(resumeTokens);
  const resumeFrequencies = countFrequencies(resumeTokens);

  const requiredSet = new Set(job.requiredSkills);
  const preferredSet = new Set(job.preferredSkills);
  const jdFrequencies = countFrequencies(
    tokenize(job.normalizedText).map((t) => normalizeSkill(t, config.skillAliases))
  );
  const weightOf = (keyword: string) => keywordWeightOf(keyword, requiredSet, preferredSet, jdFrequencies);

  const matchedKeywords = [...jobKeywordSet].filter((keyword) => resumeTokenSet.has(keyword));
  const missingKeywords = [...jobKeywordSet].filter((keyword) => !resumeTokenSet.has(keyword));

  // Weighted coverage: a missing required/high-frequency keyword costs more than a body-only one.
  const totalWeight = [...jobKeywordSet].reduce((sum, keyword) => sum + weightOf(keyword), 0);
  const matchedWeight = matchedKeywords.reduce((sum, keyword) => sum + weightOf(keyword), 0);
  const score = clamp((matchedWeight / totalWeight) * 100, 0, 100);

  const totalTokens = resumeTokens.length || 1;
  const overusedKeywords = matchedKeywords.filter((keyword) => {
    const density = (resumeFrequencies[keyword] ?? 0) / totalTokens;
    return density > config.keywordDensity.max;
  });

  const keywordsByCategory = emptyCategoryBuckets();
  for (const keyword of matchedKeywords) {
    keywordsByCategory[config.categoryIndex.get(keyword) ?? "technical"].matched.push(keyword);
  }
  for (const keyword of missingKeywords) {
    keywordsByCategory[config.categoryIndex.get(keyword) ?? "technical"].missing.push(keyword);
  }
  for (const bucket of Object.values(keywordsByCategory)) {
    bucket.matched.sort();
    bucket.missing.sort();
  }

  const keywordWeights: KeywordWeight[] = [...jobKeywordSet]
    .map((term) => {
      const weight = Number(weightOf(term).toFixed(2));
      return {
        term,
        category: config.categoryIndex.get(term) ?? "technical",
        jdWeight: weight,
        resumeWeight: resumeFrequencies[term] ?? 0,
        importance: weight,
      };
    })
    .sort((a, b) => a.term.localeCompare(b.term));

  // Sort for canonical, input-order-independent output
  return {
    score,
    matchedKeywords: unique(matchedKeywords).sort(),
    missingKeywords: unique(missingKeywords).sort(),
    overusedKeywords: unique(overusedKeywords).sort(),
    keywordsByCategory,
    keywordWeights,
  };
}

// ponytail: assumes a matched skill was used across the resume's full parsed tenure, since we
// don't map individual skills to dated roles — a real per-skill-dating upgrade would compare
// requiredYears against years-in-role instead of the resume's overall totalExperienceYears.
// Informational only — never feeds score/breakdown, same as diffLanguages() below.
function computeSkillExperienceGaps(
  resume: ParsedResume,
  job: ParsedJobDescription,
  config: ResolvedATSConfig
): ATSAnalysisResult["skillExperienceGaps"] {
  if (job.skillExperienceRequirements.length === 0) return [];
  const resumeSkills = new Set(normalizeSkills(resume.skills, config.skillAliases));
  const gaps: ATSAnalysisResult["skillExperienceGaps"] = [];
  for (const { skill, years } of job.skillExperienceRequirements) {
    if (resumeSkills.has(skill) && resume.totalExperienceYears < years) {
      gaps.push({ skill, requiredYears: years, resumeYears: resume.totalExperienceYears });
    }
  }
  return gaps.sort((a, b) => a.skill.localeCompare(b.skill));
}

function scoreEducation(resume: ParsedResume, job: ParsedJobDescription): number {
  if (job.educationRequirements.length === 0) {
    return 100;
  }
  const resumeDegreeLevels = extractDegreeLevels(resume.educationEntries.join(" "));
  const matched = job.educationRequirements.filter((requirement) =>
    resumeDegreeLevels.includes(requirement)
  );
  if (matched.length === 0) {
    return 0;
  }
  return clamp((matched.length / job.educationRequirements.length) * 100, 0, 100);
}

export function calculateScore(
  resume: ParsedResume,
  job: ParsedJobDescription,
  config: ResolvedATSConfig
): ScoreComputation {
  const skillsResult = scoreSkills(resume, job, config);
  const experienceResult = scoreExperience(resume, job, config);
  const keywordResult = scoreKeywords(resume, job, config);
  const educationScore = scoreEducation(resume, job);

  const breakdown: ATSBreakdown = {
    skills: skillsResult.score,
    experience: experienceResult.score,
    keywords: keywordResult.score,
    education: educationScore,
  };

  const weightedScore =
    breakdown.skills * config.weights.skills +
    breakdown.experience * config.weights.experience +
    breakdown.keywords * config.weights.keywords +
    breakdown.education * config.weights.education;

  const achievementStrength = {
    strong: resume.achievements.filter((a) => a.strength === "strong").length,
    weak: resume.achievements.filter((a) => a.strength === "weak").length,
  };

  // ponytail: language proficiency is informational, not part of the weighted score —
  // promote to a breakdown component if a real JD weights it explicitly.
  const { matched: matchedLanguages, missing: missingLanguages } = diffLanguages(
    resume.languages,
    job.requiredLanguages
  );

  const skillExperienceGaps = computeSkillExperienceGaps(resume, job, config);

  return {
    score: clamp(Number(weightedScore.toFixed(2)), 0, 100),
    breakdown,
    matchedSkills: skillsResult.matched,
    missingSkills: skillsResult.missing,
    matchedKeywords: keywordResult.matchedKeywords,
    missingKeywords: keywordResult.missingKeywords,
    overusedKeywords: keywordResult.overusedKeywords,
    keywordsByCategory: keywordResult.keywordsByCategory,
    keywordWeights: keywordResult.keywordWeights,
    achievementStrength,
    matchedLanguages,
    missingLanguages,
    skillExperienceGaps,
    suggestions: [],
    warnings: [],
    // detectedSections / parsedExperienceYears / experienceGap / experienceEntries: filled by index.ts
    experienceGap: experienceResult.missingYears,
    detectedSections: [],
    parsedExperienceYears: 0,
    experienceEntries: [],
    missingExperienceYears: experienceResult.missingYears,
    educationScore,
  };
}
