import { ParsedJobDescription, ParsedResume } from "../../types/parser";
import { ATSAnalysisResult, ATSBreakdown } from "../../types/scoring";
import { ResolvedATSConfig } from "../../types/config";
import { clamp, countFrequencies, tokenize, unique } from "../../utils/text";
import { normalizeSkill, normalizeSkills } from "../../utils/skills";

const REQUIRED_SKILL_WEIGHT = 0.7;
const OPTIONAL_SKILL_WEIGHT = 0.3;
const EXPERIENCE_YEARS_WEIGHT = 0.75;
const EXPERIENCE_ROLE_WEIGHT = 0.25;

interface ScoringArtifacts {
  matchedKeywords: string[];
  missingKeywords: string[];
  overusedKeywords: string[];
}

export interface ScoreComputation extends ATSAnalysisResult {
  // missingSkills / matchedSkills inherited from ATSAnalysisResult
  missingExperienceYears: number;
  educationScore: number;
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

  const jobRoleSet = new Set(job.roleKeywords.map((value) => value.toLowerCase()));
  const titleMatches = resume.jobTitles.filter((title) => jobRoleSet.has(title.toLowerCase()));
  const titleCoverage = jobRoleSet.size === 0 ? 1 : titleMatches.length / jobRoleSet.size;
  const roleComponent = clamp(titleCoverage, 0, 1) * EXPERIENCE_ROLE_WEIGHT;

  const score = clamp((yearsComponent + roleComponent) * 100, 0, 100);
  const missingYears = Math.max(requiredYears - resume.totalExperienceYears, 0);
  return { score, missingYears: Number(missingYears.toFixed(2)) };
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
    return { score: 100, matchedKeywords: [], missingKeywords: [], overusedKeywords: [] };
  }

  const resumeTokens = tokenize(resume.normalizedText).map((t) =>
    normalizeSkill(t, config.skillAliases)
  );
  const resumeTokenSet = new Set(resumeTokens);
  const matchedKeywords = [...jobKeywordSet].filter((keyword) => resumeTokenSet.has(keyword));
  const missingKeywords = [...jobKeywordSet].filter((keyword) => !resumeTokenSet.has(keyword));

  const coverage = matchedKeywords.length / jobKeywordSet.size;
  const score = clamp(coverage * 100, 0, 100);

  const frequencies = countFrequencies(resumeTokens);
  const totalTokens = resumeTokens.length || 1;
  const overusedKeywords = matchedKeywords.filter((keyword) => {
    const density = (frequencies[keyword] ?? 0) / totalTokens;
    return density > config.keywordDensity.max;
  });

  // Sort for canonical, input-order-independent output
  return {
    score,
    matchedKeywords: unique(matchedKeywords).sort(),
    missingKeywords: unique(missingKeywords).sort(),
    overusedKeywords: unique(overusedKeywords).sort(),
  };
}

function scoreEducation(resume: ParsedResume, job: ParsedJobDescription): number {
  if (job.educationRequirements.length === 0) {
    return 100;
  }
  const resumeEducationText = resume.educationEntries.join(" ");
  const normalizedEducation = resumeEducationText.toLowerCase();
  const matched = job.educationRequirements.filter((requirement) =>
    normalizedEducation.includes(requirement.toLowerCase())
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

  return {
    score: clamp(Number(weightedScore.toFixed(2)), 0, 100),
    breakdown,
    matchedSkills: skillsResult.matched,
    missingSkills: skillsResult.missing,
    matchedKeywords: keywordResult.matchedKeywords,
    missingKeywords: keywordResult.missingKeywords,
    overusedKeywords: keywordResult.overusedKeywords,
    suggestions: [],
    warnings: [],
    // detectedSections / parsedExperienceYears / experienceGap: filled by index.ts
    experienceGap: experienceResult.missingYears,
    detectedSections: [],
    parsedExperienceYears: 0,
    missingExperienceYears: experienceResult.missingYears,
    educationScore,
  };
}
