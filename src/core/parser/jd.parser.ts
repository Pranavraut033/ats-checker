import { ResolvedATSConfig } from "../../types/config";
import { ParsedJobDescription } from "../../types/parser";
import { normalizeForComparison, normalizeWhitespace, splitLines, tokenize, unique } from "../../utils/text";
import { normalizeSkills } from "../../utils/skills";

const DEGREE_KEYWORDS = [
  "bachelor",
  "b.s",
  "bs",
  "bsc",
  "master",
  "m.s",
  "ms",
  "msc",
  "phd",
  "doctorate",
  "mba",
  "associate",
];

function extractRequiredSkills(lines: string[]): string[] {
  const required: string[] = [];
  for (const line of lines) {
    if (/must|require|required|need/i.test(line)) {
      required.push(...line.split(/[,.;•-]/));
    }
  }
  return required.map((value) => value.trim()).filter(Boolean);
}

function extractPreferredSkills(lines: string[]): string[] {
  const preferred: string[] = [];
  for (const line of lines) {
    if (/preferred|nice to have|plus/i.test(line)) {
      preferred.push(...line.split(/[,.;•-]/));
    }
  }
  return preferred.map((value) => value.trim()).filter(Boolean);
}

function extractRoleKeywords(text: string): string[] {
  const roleMatch = text.match(/(engineer|developer|manager|scientist|analyst|designer|architect)/i);
  const titleTokens = roleMatch ? roleMatch[0].split(/\s+/) : [];
  return unique(tokenize(titleTokens.join(" ") || text.split(/\n/)[0] || ""));
}

function extractMinExperience(text: string): number | undefined {
  const match = text.match(/(\d{1,2})\+?\s+(?:years|yrs)/i);
  if (match) {
    return Number.parseInt(match[1], 10);
  }
  return undefined;
}

function extractEducationRequirements(text: string): string[] {
  const normalized = normalizeForComparison(text);
  return DEGREE_KEYWORDS.filter((degree) => normalized.includes(degree));
}

export function parseJobDescription(
  jobDescription: string,
  config: ResolvedATSConfig
): ParsedJobDescription {
  const normalizedText = normalizeWhitespace(jobDescription);
  const lines = splitLines(jobDescription);

  const requiredSkillsRaw = extractRequiredSkills(lines);
  const preferredSkillsRaw = extractPreferredSkills(lines);

  const requiredSkills = normalizeSkills(requiredSkillsRaw, config.skillAliases);
  const preferredSkills = normalizeSkills(preferredSkillsRaw, config.skillAliases);
  const keywords = unique([...requiredSkills, ...preferredSkills, ...tokenize(normalizedText)]);

  return {
    raw: jobDescription,
    normalizedText,
    requiredSkills,
    preferredSkills,
    roleKeywords: extractRoleKeywords(jobDescription),
    keywords,
    minExperienceYears: extractMinExperience(jobDescription),
    educationRequirements: extractEducationRequirements(jobDescription),
  };
}
