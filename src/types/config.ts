import { ATSBreakdown } from "./scoring";
import { ParsedJobDescription, ParsedResume } from "./parser";

export interface ATSWeights {
  skills: number;
  experience: number;
  keywords: number;
  education: number;
}

export type SkillAliases = Record<string, string[]>;

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
  profile?: ATSProfile;
  rules?: ATSRule[];
  keywordDensity?: KeywordDensityConfig;
  sectionPenalties?: SectionPenaltyConfig;
  allowPartialMatches?: boolean;
}

export interface NormalizedWeights extends ATSWeights {
  /** Weights normalized so they sum to 1. */
  normalizedTotal: number;
}

export interface ResolvedATSConfig {
  weights: NormalizedWeights;
  skillAliases: SkillAliases;
  profile?: ATSProfile;
  rules: ATSRule[];
  keywordDensity: KeywordDensityConfig;
  sectionPenalties: Required<SectionPenaltyConfig>;
  allowPartialMatches: boolean;
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
