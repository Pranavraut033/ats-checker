import { ATSConfig } from "./config";
import type { LLMConfig } from "./llm";
import type { ParsedExperienceEntry } from "./parser";

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
}
