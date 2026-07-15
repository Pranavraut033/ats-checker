import { ATSConfig, KeywordCategory } from "./config";

import type { LLMConfig } from "./llm";
import type { ParsedExperienceEntry, ParsedLanguage } from "./parser";
import type { EmploymentGap } from "../utils/dates";
import type { FormattingSignals } from "../utils/text";
import type { Seniority } from "../utils/titles";

export interface ATSBreakdown {
  skills: number;
  experience: number;
  keywords: number;
  /** Real-ATS parseability score (0-100) — formatting, contact extractability, section coverage. */
  parseability: number;
  education: number;
}

/** One point deduction applied while computing the parseability score. */
export interface ParseabilityDeduction {
  reason: string;
  points: number;
}

/** Detail behind `breakdown.parseability` — the formatting signals plus what was deducted and why. */
export interface ParseabilityReport extends FormattingSignals {
  /** Number of standard resume sections the parser detected. */
  detectedSectionCount: number;
  /** Ordered list of deductions applied to get from 100 down to `breakdown.parseability`. */
  deductions: ParseabilityDeduction[];
}

/** Comparison between the resume's inferred seniority and the JD's required seniority. */
export interface SeniorityMatch {
  resume?: Seniority;
  required?: Seniority;
  /**
   * True when the resume's seniority rank is >= the JD's required rank, or when either side
   * is unknown (we never penalize on missing signal — only on a confirmed mismatch).
   */
  met: boolean;
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
  keywordsByCategory: Record<
    KeywordCategory,
    { matched: string[]; missing: string[] }
  >;
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
  skillExperienceGaps: {
    skill: string;
    requiredYears: number;
    resumeYears: number;
  }[];
  /** Detail behind `breakdown.parseability` — which formatting signals were detected and penalized. */
  parseabilityReport: ParseabilityReport;
  /** Gaps of 3+ months between consecutive (chronologically merged) roles. Informational only. */
  employmentGaps: EmploymentGap[];
  /** Resume vs JD-required seniority comparison. Informational only outside its modest, capped
   *  contribution to `breakdown.experience` (see scorer.ts). */
  seniorityMatch: SeniorityMatch;
  /**
   * Per-skill years of experience derived from per-role dating (sum of durations of roles whose
   * bullets mention that skill), replacing the old "assume the skill spans the whole resume
   * tenure" approximation. Informational only — does not feed `score`/`breakdown`.
   */
  perSkillExperience: { skill: string; years: number }[];
}
