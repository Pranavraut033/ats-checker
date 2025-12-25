import { ATSConfig } from "./config";
import type { LLMConfig } from "./llm";

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
  matchedKeywords: string[];
  missingKeywords: string[];
  overusedKeywords: string[];
  suggestions: string[];
  warnings: string[];
}
