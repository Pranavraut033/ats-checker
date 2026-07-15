import { ATSBreakdown } from "./scoring";
import { ParsedJobDescription, ParsedResume } from "./parser";

export interface ATSWeights {
  skills: number;
  experience: number;
  keywords: number;
  /** How much the resume's real-ATS parseability (formatting/contact/sections) counts toward score. */
  parseability: number;
  education: number;
}

export type SkillAliases = Record<string, string[]>;

export type KeywordCategory = "technical" | "tool" | "concept" | "soft" | "marketing" | "domain";

export interface KeywordEntry {
  canonical: string;
  aliases: string[];
  category: KeywordCategory;
}

export type KeywordRegistry = KeywordEntry[];

export interface ATSProfile {
  name: string;
  mandatorySkills: string[];
  optionalSkills: string[];
  minExperience?: number;
}

export interface KeywordDensityConfig {
  /** Minimum density before a keyword is considered underused (informational only). */
  min: number;
  /** Maximum density before a keyword is considered stuffed. */
  max: number;
  /** Penalty applied when density exceeds max. */
  overusePenalty: number;
}

export interface SectionPenaltyConfig {
  missingSummary?: number;
  missingExperience?: number;
  missingSkills?: number;
  missingEducation?: number;
  /**
   * Penalty when no parseable contact email is detected. Defaults to 12 — a real ATS treats
   * unparseable contact info as a near-knockout (recruiters/automated outreach can't reach the
   * candidate at all), so this is deliberately more than a token warning-only value.
   */
  missingContact?: number;
}

export interface MatchingConfig {
  /**
   * Fall back to stemmed/fuzzy matching (typos, word-form variants like "developing" vs
   * "develop", "ReactJS" vs "react") when an exact alias lookup misses. Default: true.
   * Set to false to reproduce pre-v2 exact-match-only behavior.
   */
  fuzzy?: boolean;
  /** Passed through to fuzzyEqual's bounded Levenshtein distance when fuzzy matching is enabled. */
  threshold?: number;
}

export interface ATSRule {
  id: string;
  description?: string;
  penalty: number;
  warning?: string;
  condition: (context: RuleContext) => boolean;
}

export interface ATSConfig {
  weights?: Partial<ATSWeights>;
  skillAliases?: SkillAliases;
  /** Categorized keyword/alias entries (technical, tool, concept, soft, marketing, domain). Merges over the default registry by canonical term. */
  keywordRegistry?: KeywordRegistry;
  profile?: ATSProfile;
  rules?: ATSRule[];
  keywordDensity?: KeywordDensityConfig;
  sectionPenalties?: SectionPenaltyConfig;
  allowPartialMatches?: boolean;
  /** Stemmed/fuzzy matching behavior for skills/keywords. Defaults to `{ fuzzy: true }`. */
  matching?: MatchingConfig;
  /**
   * ISO date string (e.g. "2024-06-01") used as the "today" reference when
   * computing duration for open-ended date ranges ("Present"/"Current"/"Now").
   * Omit to use the actual current date (live/production behaviour).
   * Set to a fixed value in tests or batch processing to guarantee determinism.
   */
  referenceDate?: string;
}

export interface NormalizedWeights extends ATSWeights {
  /** Weights normalized so they sum to 1. */
  normalizedTotal: number;
}

export interface ResolvedATSConfig {
  weights: NormalizedWeights;
  skillAliases: SkillAliases;
  keywordRegistry: KeywordRegistry;
  /** canonical term -> category, derived once from keywordRegistry. */
  categoryIndex: Map<string, KeywordCategory>;
  profile?: ATSProfile;
  rules: ATSRule[];
  keywordDensity: KeywordDensityConfig;
  sectionPenalties: Required<SectionPenaltyConfig>;
  allowPartialMatches: boolean;
  /** Resolved matching behavior; `fuzzy` is always defined (defaults to true). */
  matching: Required<Pick<MatchingConfig, "fuzzy">> & Pick<MatchingConfig, "threshold">;
  /** Resolved reference date for "Present" duration calculations. */
  referenceDate?: Date;
}

export interface RuleContext {
  resume: ParsedResume;
  job: ParsedJobDescription;
  weights: NormalizedWeights;
  keywordDensity: KeywordDensityConfig;
  breakdown?: ATSBreakdown;
  matchedKeywords?: string[];
  overusedKeywords?: string[];
}
