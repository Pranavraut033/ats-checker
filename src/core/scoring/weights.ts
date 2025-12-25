import {
  ATSConfig,
  ATSWeights,
  KeywordDensityConfig,
  NormalizedWeights,
  ResolvedATSConfig,
  SectionPenaltyConfig,
} from "../../types/config";
import { defaultSkillAliases, softwareEngineerProfile } from "../../profiles";

const DEFAULT_WEIGHTS: ATSWeights = {
  skills: 0.3,
  experience: 0.3,
  keywords: 0.25,
  education: 0.15,
};

const DEFAULT_KEYWORD_DENSITY: KeywordDensityConfig = {
  min: 0.0025,
  max: 0.04,
  overusePenalty: 5,
};

const DEFAULT_SECTION_PENALTIES: Required<SectionPenaltyConfig> = {
  missingSummary: 4,
  missingExperience: 10,
  missingSkills: 8,
  missingEducation: 6,
};

function normalizeWeights(weights: ATSWeights): NormalizedWeights {
  const total = weights.skills + weights.experience + weights.keywords + weights.education;
  if (total === 0) {
    return { ...weights, normalizedTotal: 1 };
  }
  return {
    skills: weights.skills / total,
    experience: weights.experience / total,
    keywords: weights.keywords / total,
    education: weights.education / total,
    normalizedTotal: 1,
  };
}

export function resolveConfig(config: ATSConfig = {}): ResolvedATSConfig {
  const weights: ATSWeights = {
    skills: config.weights?.skills ?? DEFAULT_WEIGHTS.skills,
    experience: config.weights?.experience ?? DEFAULT_WEIGHTS.experience,
    keywords: config.weights?.keywords ?? DEFAULT_WEIGHTS.keywords,
    education: config.weights?.education ?? DEFAULT_WEIGHTS.education,
  };

  const resolved: ResolvedATSConfig = {
    weights: normalizeWeights(weights),
    skillAliases: { ...defaultSkillAliases, ...(config.skillAliases ?? {}) },
    profile: config.profile ?? softwareEngineerProfile,
    rules: config.rules ?? [],
    keywordDensity: config.keywordDensity ?? DEFAULT_KEYWORD_DENSITY,
    sectionPenalties: {
      ...DEFAULT_SECTION_PENALTIES,
      ...(config.sectionPenalties ?? {}),
    },
    allowPartialMatches: config.allowPartialMatches ?? true,
  };

  return resolved;
}
