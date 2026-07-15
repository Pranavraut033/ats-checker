import { Seniority } from "../utils/titles";
import { EmploymentGap } from "../utils/dates";
import { FormattingSignals } from "../utils/text";

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
  /** Numeric year/month of the start and end, for overlap-aware summing. */
  startYear?: number;
  startMonth?: number;
  endYear?: number;
  endMonth?: number;
}

export interface ParsedExperienceEntry {
  title?: string;
  company?: string;
  location?: string;
  dates?: ParsedDateRange;
  description?: string;
  /** Skills mentioned within this role's bullets, resolved via the alias/fuzzy registry lookup. */
  skills: string[];
}

export interface ParsedAchievement {
  text: string;
  strength: "strong" | "weak";
  reason: string;
}

export interface ParsedLanguage {
  /** Canonical lowercase language name, e.g. "german". */
  name: string;
  /** Raw level as written/normalized, e.g. "c1", "fluent", "native". */
  level?: string;
  /** CEFR-aligned rank 1 (A1/basic) – 6 (C2/native), for comparing proficiency. */
  levelRank?: number;
}

export interface ParsedResume {
  raw: string;
  normalizedText: string;
  detectedSections: ResumeSection[];
  sectionContent: Partial<Record<ResumeSection, string>>;
  skills: string[];
  jobTitles: string[];
  actionVerbs: string[];
  /** Weak verbs (helped, worked, performed, ...) found in the resume text. */
  weakVerbs: string[];
  /** Experience bullets classified as strong/weak achievement statements. */
  achievements: ParsedAchievement[];
  educationEntries: string[];
  experience: ParsedExperienceEntry[];
  totalExperienceYears: number;
  keywords: string[];
  languages: ParsedLanguage[];
  /** Contact details extracted via regex; absent fields mean detection failed, not that the resume lacks them. */
  contact?: { email?: string; phone?: string; linkedin?: string; location?: string };
  /** Inferred overall seniority (highest-ranked signal across job titles), or undefined if unknown. */
  seniority?: Seniority;
  /** Gaps of minGapMonths+ between consecutive (chronologically merged) roles. */
  employmentGaps: EmploymentGap[];
  /** ATS-relevant parseability/formatting signals extracted from the raw text. */
  formatting: FormattingSignals;
  warnings: string[];
}

/** A JD's "N+ years of <skill>" requirement, e.g. { skill: "figma", years: 5 }. */
export interface SkillExperienceRequirement {
  skill: string;
  years: number;
}

export interface ParsedJobDescription {
  raw: string;
  normalizedText: string;
  requiredSkills: string[];
  preferredSkills: string[];
  roleKeywords: string[];
  keywords: string[];
  minExperienceYears?: number;
  /** Per-skill year requirements parsed from the JD, e.g. "5+ years of Figma". */
  skillExperienceRequirements: SkillExperienceRequirement[];
  educationRequirements: string[];
  /** canonical keyword -> the surface form (original casing/spelling) the JD used. */
  keywordSurfaceForms: Record<string, string>;
  requiredLanguages: ParsedLanguage[];
  /** Inferred seniority cue from the JD's role/title text, or undefined if unknown. */
  seniority?: Seniority;
}
