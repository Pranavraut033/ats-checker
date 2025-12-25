export type ResumeSection =
  | "summary"
  | "experience"
  | "skills"
  | "education"
  | "projects"
  | "certifications";

export interface ParsedDateRange {
  raw?: string;
  start?: string;
  end?: string;
  durationInMonths?: number;
}

export interface ParsedExperienceEntry {
  title?: string;
  company?: string;
  location?: string;
  dates?: ParsedDateRange;
  description?: string;
}

export interface ParsedResume {
  raw: string;
  normalizedText: string;
  detectedSections: ResumeSection[];
  sectionContent: Partial<Record<ResumeSection, string>>;
  skills: string[];
  jobTitles: string[];
  actionVerbs: string[];
  educationEntries: string[];
  experience: ParsedExperienceEntry[];
  totalExperienceYears: number;
  keywords: string[];
  warnings: string[];
}

export interface ParsedJobDescription {
  raw: string;
  normalizedText: string;
  requiredSkills: string[];
  preferredSkills: string[];
  roleKeywords: string[];
  keywords: string[];
  minExperienceYears?: number;
  educationRequirements: string[];
}
