import { ParsedJobDescription, ParsedResume } from "./parser";
import { ATSBreakdown } from "./scoring";

export interface ATSWeights {
  skills: number;
  experience: number;
  keywords: number;
  education: number;
}

export type SkillAliases = Record<string, string[]>;

export type KeywordCategory =
  "technical" | "tool" | "concept" | "soft" | "marketing" | "domain";

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
  /** Penalty when no parseable contact email is detected. Defaults to 0 (warning-only). */
  missingContact?: number;
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
