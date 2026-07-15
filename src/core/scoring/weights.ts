import {
  defaultKeywordRegistry,
  softwareEngineerProfile,
} from "../../profiles";
import {
  ATSConfig,
  ATSWeights,
  KeywordDensityConfig,
  NormalizedWeights,
  ResolvedATSConfig,
  SectionPenaltyConfig,
} from "../../types/config";
import {
  buildCategoryIndex,
  deriveSkillAliases,
  mergeKeywordRegistries,
} from "../../utils/skills";

// v2 weights: parseability joins the aggregate as the "real ATS reject reason" dimension;
// skills/experience/education give up some share to make room for it, keywords unchanged.
const DEFAULT_WEIGHTS: ATSWeights = {
  skills: 0.25,
  experience: 0.2,
  keywords: 0.25,
  parseability: 0.2,
  education: 0.1,
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
  // Raised from 0 (warning-only) in v1 — a real ATS treats an unparseable contact email as a
  // near-knockout (no way to reach the candidate at all), so this now actually moves the score.
  missingContact: 12,
};

function normalizeWeights(weights: ATSWeights): NormalizedWeights {
  const total =
    weights.skills +
    weights.experience +
    weights.keywords +
    weights.parseability +
    weights.education;
  if (total === 0) {
    // Guard against misconfigured zero weights by falling back to equal distribution
    const equal = 1 / 5;
    return {
      skills: equal,
      experience: equal,
      keywords: equal,
      parseability: equal,
      education: equal,
      normalizedTotal: 1,
    };
  }
  return {
    skills: weights.skills / total,
    experience: weights.experience / total,
    keywords: weights.keywords / total,
    parseability: weights.parseability / total,
    education: weights.education / total,
    normalizedTotal: 1,
  };
}

export function resolveConfig(config: ATSConfig = {}): ResolvedATSConfig {
  const weights: ATSWeights = {
    skills: config.weights?.skills ?? DEFAULT_WEIGHTS.skills,
    experience: config.weights?.experience ?? DEFAULT_WEIGHTS.experience,
    keywords: config.weights?.keywords ?? DEFAULT_WEIGHTS.keywords,
    parseability: config.weights?.parseability ?? DEFAULT_WEIGHTS.parseability,
    education: config.weights?.education ?? DEFAULT_WEIGHTS.education,
  };

  const keywordRegistry = mergeKeywordRegistries(
    defaultKeywordRegistry,
    config.keywordRegistry ?? []
  );

  const resolved: ResolvedATSConfig = {
    weights: normalizeWeights(weights),
    skillAliases: {
      ...deriveSkillAliases(keywordRegistry),
      ...(config.skillAliases ?? {}),
    },
    keywordRegistry,
    categoryIndex: buildCategoryIndex(keywordRegistry),
    profile: config.profile ?? softwareEngineerProfile,
    rules: config.rules ?? [],
    keywordDensity: config.keywordDensity ?? DEFAULT_KEYWORD_DENSITY,
    sectionPenalties: {
      ...DEFAULT_SECTION_PENALTIES,
      ...(config.sectionPenalties ?? {}),
    },
    allowPartialMatches: config.allowPartialMatches ?? true,
    // Fuzzy/stem matching is on by default in v2 (typos, word-form variants like "developing"
    // vs "develop", "ReactJS" vs "react") — callers who want v1's exact-match-only behavior can
    // override via config.matching = { fuzzy: false }.
    matching: {
      fuzzy: config.matching?.fuzzy ?? true,
      threshold: config.matching?.threshold,
    },
    referenceDate: config.referenceDate
      ? new Date(config.referenceDate)
      : undefined,
  };

  return resolved;
}
