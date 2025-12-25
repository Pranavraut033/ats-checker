import { ATSConfig } from "./config";

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
