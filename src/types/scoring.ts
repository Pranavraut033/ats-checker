import { ATSConfig, KeywordCategory } from "./config";
import type { LLMConfig } from "./llm";
import type { ParsedExperienceEntry, ParsedLanguage } from "./parser";

export interface ATSBreakdown {
  skills: number;
  experience: number;
  keywords: number;
  education: number;
}

export interface AnalyzeResumeInput {
  resumeText: string;
  jobDescription: string;
  config?: ATSConfig;
  llm?: LLMConfig;
}

export interface KeywordWeight {
  term: string;
  category: KeywordCategory;
  /** Importance of this term in the job description (location + frequency based). */
  jdWeight: number;
  /** How often this term appears in the resume. */
  resumeWeight: number;
  /** Alias of jdWeight — how much this term matters for the role. */
  importance: number;
}

export interface ATSAnalysisResult {
  score: number;
  breakdown: ATSBreakdown;
  /** Skills found in the resume that satisfy JD + profile requirements. */
  matchedSkills: string[];
  /** Required skills absent from the resume. */
  missingSkills: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  overusedKeywords: string[];
  /** Matched/missing keywords grouped by category (technical, tool, concept, soft, marketing, domain). */
  keywordsByCategory: Record<KeywordCategory, { matched: string[]; missing: string[] }>;
  /** Per-keyword JD importance and resume usage, for callers who want the raw numbers. */
  keywordWeights: KeywordWeight[];
  /** Count of resume achievement bullets classified as strong vs weak. */
  achievementStrength: { strong: number; weak: number };
  /** JD-required languages the resume meets or exceeds in proficiency. */
  matchedLanguages: ParsedLanguage[];
  /** JD-required languages absent from the resume, or below the required proficiency. */
  missingLanguages: ParsedLanguage[];
  suggestions: string[];
  warnings: string[];
  /** Years below the JD's minimum experience requirement; 0 when the requirement is met. */
  experienceGap: number;
  /** Resume sections the parser successfully detected (e.g. "summary", "skills"). */
  detectedSections: string[];
  /** Total years of experience parsed from the resume's date ranges. */
  parsedExperienceYears: number;
  /** Parsed experience entries from the resume, with titles and date ranges. */
  experienceEntries: ParsedExperienceEntry[];
  /**
   * JD skills the resume has but whose overall experience falls short of the JD's per-skill
   * year requirement (e.g. JD wants "5+ years Figma", resume has Figma but only 3 years total).
   * Informational only — does not feed `score`/`breakdown`, same as language proficiency.
   */
  skillExperienceGaps: { skill: string; requiredYears: number; resumeYears: number }[];
}
