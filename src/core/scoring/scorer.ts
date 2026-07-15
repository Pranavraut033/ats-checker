import { ParsedDateRange, ParsedJobDescription, ParsedResume, ResumeSection } from "../../types/parser";
import { ATSAnalysisResult, ATSBreakdown, KeywordWeight, ParseabilityReport, SeniorityMatch } from "../../types/scoring";
import { KeywordCategory, ResolvedATSConfig } from "../../types/config";
import { clamp, countFrequencies, tokenize, unique } from "../../utils/text";
import type { FormattingSignals } from "../../utils/text";
import { normalizeSkill, normalizeSkills, NormalizeSkillOptions } from "../../utils/skills";
import { diffLanguages } from "../../utils/languages";
import { sumExperienceYears } from "../../utils/dates";
import { Seniority, titleMatch } from "../../utils/titles";
import { extractDegreeLevels } from "../parser/jd.parser";

const REQUIRED_SKILL_WEIGHT = 0.7;
const OPTIONAL_SKILL_WEIGHT = 0.3;

// Experience sub-weights: years-worked stays the dominant signal; title-coverage keeps its
// prior share; seniority match is new and deliberately small (max ~15% swing on this component,
// which itself is ~20% of the overall score — see the plan's "keep it proportionate" note).
const EXPERIENCE_YEARS_WEIGHT = 0.65;
const EXPERIENCE_ROLE_WEIGHT = 0.2;
const EXPERIENCE_SENIORITY_WEIGHT = 0.15;

const ALL_CATEGORIES: KeywordCategory[] = ["technical", "tool", "concept", "soft", "marketing", "domain"];

// Rank used to compare resume vs JD seniority. Mirrors utils/titles.ts's internal rank
// (not exported there) — kept in sync manually since the Seniority union is small/stable.
const SENIORITY_RANK: Record<Seniority, number> = {
  junior: 0,
  mid: 1,
  senior: 2,
  lead: 3,
  principal: 4,
};

// Degree "adjacency" rank for softened education scoring (see scoreEducation). MBA shares
// master's rank since it's a peer-level credential, not a subset/superset of it.
const DEGREE_RANK: Record<string, number> = {
  associate: 1,
  bachelor: 2,
  master: 3,
  mba: 3,
  phd: 4,
};

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
  config: ResolvedATSConfig,
  matchOptions: NormalizeSkillOptions
): { score: number; matched: string[]; missing: string[] } {
  const profileRequired = config.profile?.mandatorySkills ?? [];
  const profileOptional = config.profile?.optionalSkills ?? [];

  const required = new Set(
    normalizeSkills([...job.requiredSkills, ...profileRequired], config.skillAliases, matchOptions)
  );
  const optional = new Set(
    normalizeSkills([...job.preferredSkills, ...profileOptional], config.skillAliases, matchOptions)
  );
  const resumeSkills = new Set(normalizeSkills(resume.skills, config.skillAliases, matchOptions));

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

/**
 * Compare resume vs JD seniority. Never penalizes on missing signal (met=true when either
 * side is unknown) — only a confirmed resume-below-required mismatch counts as unmet.
 */
function computeSeniorityMatch(resume: ParsedResume, job: ParsedJobDescription): SeniorityMatch {
  const resumeSeniority = resume.seniority;
  const required = job.seniority;
  const met =
    !resumeSeniority || !required || SENIORITY_RANK[resumeSeniority] >= SENIORITY_RANK[required];
  return { resume: resumeSeniority, required, met };
}

function scoreExperience(
  resume: ParsedResume,
  job: ParsedJobDescription,
  config: ResolvedATSConfig
): { score: number; missingYears: number; seniorityMatch: SeniorityMatch } {
  const seniorityMatch = computeSeniorityMatch(resume, job);
  const requiredYears = job.minExperienceYears ?? config.profile?.minExperience ?? 0;
  if (!requiredYears) {
    return { score: 100, missingYears: 0, seniorityMatch };
  }
  const yearCoverage = clamp(resume.totalExperienceYears / requiredYears, 0, 2);
  const yearsComponent = clamp(yearCoverage, 0, 1) * EXPERIENCE_YEARS_WEIGHT;

  // titleMatch() gives real coverage via stemmed/synonym matching (see utils/titles.ts); an
  // empty JD role-keyword list means the JD asserts no title requirement, so treat that as full
  // credit rather than titleMatch's own "no keywords -> 0" contract (which assumes keywords exist).
  const titleCoverage = job.roleKeywords.length === 0 ? 1 : titleMatch(resume.jobTitles, job.roleKeywords);
  const roleComponent = clamp(titleCoverage, 0, 1) * EXPERIENCE_ROLE_WEIGHT;

  // Modest, capped seniority contribution — at most EXPERIENCE_SENIORITY_WEIGHT (15%) of this
  // component, only applied when the JD actually specifies an experience requirement.
  const seniorityComponent = (seniorityMatch.met ? 1 : 0) * EXPERIENCE_SENIORITY_WEIGHT;

  const score = clamp((yearsComponent + roleComponent + seniorityComponent) * 100, 0, 100);
  const missingYears = Math.max(requiredYears - resume.totalExperienceYears, 0);
  return { score, missingYears: Number(missingYears.toFixed(2)), seniorityMatch };
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
  config: ResolvedATSConfig,
  matchOptions: NormalizeSkillOptions
): { score: number } & ScoringArtifacts {
  // Normalize both sides through the alias map so e.g. "js" ↔ "javascript" match symmetrically
  const jobKeywordSet = new Set(
    job.keywords.map((k) => normalizeSkill(k, config.skillAliases, matchOptions))
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
    normalizeSkill(t, config.skillAliases, matchOptions)
  );
  const resumeTokenSet = new Set(resumeTokens);
  const resumeFrequencies = countFrequencies(resumeTokens);

  const requiredSet = new Set(job.requiredSkills);
  const preferredSet = new Set(job.preferredSkills);
  const jdFrequencies = countFrequencies(
    tokenize(job.normalizedText).map((t) => normalizeSkill(t, config.skillAliases, matchOptions))
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

/**
 * Per-skill years of experience derived from per-role dating: for each canonical skill, merge
 * (overlap-aware, via sumExperienceYears) the date ranges of every experience entry whose
 * per-role `skills` list mentions it. Replaces the old approximation that assumed a matched
 * skill spanned the resume's entire parsed tenure. A skill the resume lists but that never
 * appears in any dated role's bullets gets 0 years here (no dating evidence), which is the
 * correct conservative answer, not a bug.
 */
function computePerSkillExperience(
  resume: ParsedResume,
  config: ResolvedATSConfig,
  matchOptions: NormalizeSkillOptions
): ATSAnalysisResult["perSkillExperience"] {
  const bySkill = new Map<string, ParsedDateRange[]>();
  for (const entry of resume.experience) {
    if (!entry.dates || entry.skills.length === 0) continue;
    const skillsInRole = normalizeSkills(entry.skills, config.skillAliases, matchOptions);
    for (const skill of skillsInRole) {
      const list = bySkill.get(skill) ?? [];
      list.push(entry.dates);
      bySkill.set(skill, list);
    }
  }
  return [...bySkill.entries()]
    .map(([skill, dates]) => ({ skill, years: sumExperienceYears(dates) }))
    .sort((a, b) => a.skill.localeCompare(b.skill));
}

// Informational only — never feeds score/breakdown, same as diffLanguages() below. Now uses
// computePerSkillExperience's per-role dating instead of assuming a matched skill spans the
// resume's overall totalExperienceYears (the naive assumption this replaces).
function computeSkillExperienceGaps(
  resume: ParsedResume,
  job: ParsedJobDescription,
  config: ResolvedATSConfig,
  matchOptions: NormalizeSkillOptions,
  perSkillExperience: ATSAnalysisResult["perSkillExperience"]
): ATSAnalysisResult["skillExperienceGaps"] {
  if (job.skillExperienceRequirements.length === 0) return [];
  const resumeSkills = new Set(normalizeSkills(resume.skills, config.skillAliases, matchOptions));
  const yearsBySkill = new Map(perSkillExperience.map((p) => [p.skill, p.years]));
  const gaps: ATSAnalysisResult["skillExperienceGaps"] = [];
  for (const { skill, years } of job.skillExperienceRequirements) {
    if (!resumeSkills.has(skill)) continue;
    const resumeYears = yearsBySkill.get(skill) ?? 0;
    if (resumeYears < years) {
      gaps.push({ skill, requiredYears: years, resumeYears });
    }
  }
  return gaps.sort((a, b) => a.skill.localeCompare(b.skill));
}

/**
 * Softened education scoring: an exact degree-level match is full credit, but a resume degree
 * "adjacent" to what's required also earns partial credit instead of falling off a 0-cliff.
 * "Adjacent" here means by DEGREE_RANK: holding a higher-ranked degree than required (e.g.
 * Master's when Bachelor's is asked for) earns strong credit (0.85) since it clearly satisfies
 * the underlying requirement; a same-ranked peer credential that isn't a literal string match
 * (e.g. MBA vs "Master's") earns moderate credit (0.6); one rank below (e.g. Bachelor's when
 * Master's is required) earns light credit (0.35); two+ ranks below or no recognizable degree
 * at all earns 0. Multiple JD requirements are averaged.
 */
function scoreEducation(resume: ParsedResume, job: ParsedJobDescription): number {
  if (job.educationRequirements.length === 0) {
    return 100;
  }
  const resumeDegreeLevels = extractDegreeLevels(resume.educationEntries.join(" "));
  if (resumeDegreeLevels.length === 0) {
    return 0;
  }
  const resumeMaxRank = Math.max(...resumeDegreeLevels.map((d) => DEGREE_RANK[d] ?? 0));

  const perRequirementCredit: number[] = job.educationRequirements.map((requirement) => {
    if (resumeDegreeLevels.includes(requirement)) return 1;
    const requiredRank = DEGREE_RANK[requirement] ?? 0;
    const diff = resumeMaxRank - requiredRank;
    if (diff >= 1) return 0.85;
    if (diff === 0) return 0.6;
    if (diff === -1) return 0.35;
    return 0;
  });

  const avgCredit =
    perRequirementCredit.reduce((sum, credit) => sum + credit, 0) / perRequirementCredit.length;
  return clamp(avgCredit * 100, 0, 100);
}

/**
 * Real-ATS parseability score (0-100): starts at 100 and deducts for each formatting/contact/
 * structural signal that would actually trip up an ATS parser (tables/columns misaligning
 * fields, special/control chars corrupting extraction, non-standard bullets not being
 * recognized as list items, scanned/image-only text, unparseable contact info, and too few
 * recognizable sections suggesting the document didn't extract cleanly at all). This is the
 * "real ATS reject reason" dimension the plan calls out — formatting problems are the single
 * biggest cause of real-world ATS rejections, more than any single missing keyword.
 */
export function scoreParseability(
  formatting: FormattingSignals,
  contact: ParsedResume["contact"],
  detectedSections: ResumeSection[]
): { score: number; report: ParseabilityReport } {
  let score = 100;
  const deductions: ParseabilityReport["deductions"] = [];
  const deduct = (points: number, reason: string) => {
    score -= points;
    deductions.push({ reason, points });
  };

  // Tables/columns commonly misalign fields (dates ending up in the wrong "cell") when an ATS
  // parser flattens them back to plain text.
  if (formatting.hasTables) {
    deduct(20, "Table or columnar formatting detected — ATS parsers often misalign fields extracted from tables");
  }
  // Multi-column layouts frequently interleave text from different columns out of reading order.
  if (formatting.hasMultiColumn) {
    deduct(20, "Multi-column layout detected — text may extract out of reading order in real ATS systems");
  }
  // Icon fonts / control chars / replacement chars indicate a lossy extraction upstream.
  if (formatting.hasSpecialChars) {
    deduct(10, "Special or control characters detected — likely icon fonts or a lossy text extraction");
  }
  // Non-standard bullet glyphs (arrows, checkmarks, dingbats) aren't always recognized as list
  // markers by simpler ATS text parsers.
  if (formatting.nonStandardBullets) {
    deduct(8, "Non-standard bullet characters detected — some ATS parsers won't recognize them as list items");
  }
  // A scanned/image-based resume has little to no real extractable text at all — the most
  // severe parseability failure.
  if (formatting.likelyScanned) {
    deduct(30, "Resume text looks scanned or image-based with little extractable text");
  }
  // No parseable email means the ATS/recruiter has no reliable way to reach the candidate.
  if (!contact?.email || !formatting.contactParseable) {
    deduct(15, "No parseable contact email detected");
  }
  // Very few recognizable sections suggests the document didn't extract cleanly in the first
  // place (headers not being recognized, or genuinely missing structure).
  if (detectedSections.length < 3) {
    deduct(10, "Fewer than 3 standard resume sections were detected");
  }

  return {
    score: clamp(score, 0, 100),
    report: {
      ...formatting,
      detectedSectionCount: detectedSections.length,
      deductions,
    },
  };
}

export function calculateScore(
  resume: ParsedResume,
  job: ParsedJobDescription,
  config: ResolvedATSConfig
): ScoreComputation {
  const matchOptions: NormalizeSkillOptions = {
    fuzzy: config.matching.fuzzy,
    maxDistance: config.matching.threshold,
  };

  const skillsResult = scoreSkills(resume, job, config, matchOptions);
  const experienceResult = scoreExperience(resume, job, config);
  const keywordResult = scoreKeywords(resume, job, config, matchOptions);
  const educationScore = scoreEducation(resume, job);
  const parseabilityResult = scoreParseability(resume.formatting, resume.contact, resume.detectedSections);

  const breakdown: ATSBreakdown = {
    skills: skillsResult.score,
    experience: experienceResult.score,
    keywords: keywordResult.score,
    parseability: parseabilityResult.score,
    education: educationScore,
  };

  const weightedScore =
    breakdown.skills * config.weights.skills +
    breakdown.experience * config.weights.experience +
    breakdown.keywords * config.weights.keywords +
    breakdown.parseability * config.weights.parseability +
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

  const perSkillExperience = computePerSkillExperience(resume, config, matchOptions);
  const skillExperienceGaps = computeSkillExperienceGaps(
    resume,
    job,
    config,
    matchOptions,
    perSkillExperience
  );

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
    parseabilityReport: parseabilityResult.report,
    employmentGaps: resume.employmentGaps,
    seniorityMatch: experienceResult.seniorityMatch,
    perSkillExperience,
  };
}
