import { ResolvedATSConfig } from "../../types/config";
import { ParsedExperienceEntry, ParsedResume, ResumeSection } from "../../types/parser";
import { parseDateRange, sumExperienceYears } from "../../utils/dates";
import {
  normalizeForComparison,
  normalizeWhitespace,
  splitLines,
  tokenize,
  unique,
} from "../../utils/text";
import { normalizeSkills } from "../../utils/skills";

const SECTION_ALIASES: Record<ResumeSection, string[]> = {
  summary: ["summary", "profile", "about"],
  experience: ["experience", "work experience", "professional experience", "employment"],
  skills: ["skills", "technical skills", "technologies"],
  education: ["education", "academics", "academic background"],
  projects: ["projects", "portfolio"],
  certifications: ["certifications", "licenses"]
};

const ACTION_VERBS = [
  "led",
  "managed",
  "built",
  "designed",
  "implemented",
  "developed",
  "created",
  "improved",
  "optimized",
  "launched",
  "architected",
  "delivered",
  "shipped",
  "collaborated",
  "automated",
  "mentored",
  "modernized",
  "reduced",
  "increased",
];

function detectSection(line: string): ResumeSection | null {
  const normalized = line.toLowerCase();
  for (const [section, aliases] of Object.entries(SECTION_ALIASES)) {
    for (const alias of aliases) {
      const headerPattern = new RegExp(`^${alias}(\s*:)?$`, "i");
      if (headerPattern.test(normalized)) {
        return section as ResumeSection;
      }
    }
  }
  return null;
}

function extractSections(text: string): {
  sections: Partial<Record<ResumeSection, string>>;
  detected: ResumeSection[];
} {
  const lines = splitLines(text);
  const sections: Partial<Record<ResumeSection, string>> = {};
  const detected: ResumeSection[] = [];
  let current: ResumeSection | null = null;
  const buffer: string[] = [];

  const flush = () => {
    if (current) {
      sections[current] = buffer.join("\n").trim();
      buffer.length = 0;
    }
  };

  for (const line of lines) {
    const maybeSection = detectSection(line);
    if (maybeSection) {
      flush();
      current = maybeSection;
      detected.push(maybeSection);
      continue;
    }
    buffer.push(line);
  }
  flush();
  return { sections, detected: unique(detected) as ResumeSection[] };
}

function parseSkills(sectionContent: string | undefined, aliases: ResolvedATSConfig["skillAliases"]): string[] {
  if (!sectionContent) return [];
  const raw = sectionContent
    .split(/[,;\n]/)
    .map((skill) => skill.trim())
    .filter(Boolean);
  return normalizeSkills(raw, aliases);
}

function parseActionVerbs(text: string): string[] {
  const words = tokenize(text);
  return ACTION_VERBS.filter((verb) => words.includes(verb));
}

function parseExperience(sectionContent: string | undefined): {
  entries: ParsedExperienceEntry[];
  rangesInMonths: number[];
  jobTitles: string[];
} {
  if (!sectionContent) {
    return { entries: [], rangesInMonths: [], jobTitles: [] };
  }
  const lines = splitLines(sectionContent);
  const entries: ParsedExperienceEntry[] = [];
  const rangesInMonths: number[] = [];
  const jobTitles: string[] = [];

  for (const line of lines) {
    const range = parseDateRange(line);
    if (range) {
      const previous = entries[entries.length - 1];
      if (previous && !previous.dates) {
        previous.dates = range;
      } else {
        entries.push({ dates: range });
      }
      if (range.durationInMonths) {
        rangesInMonths.push(range.durationInMonths);
      }
      continue;
    }

    const titleMatch = line.match(/^(Senior|Lead|Principal|Staff|Software|Full\s*Stack|Frontend|Backend|Engineer|Developer|Manager|Analyst)[^,-]*/i);
    if (titleMatch) {
      const title = titleMatch[0].trim();
      jobTitles.push(title.toLowerCase());
      const entry: ParsedExperienceEntry = { title, description: line };
      entries.push(entry);
      continue;
    }

    if (entries.length > 0) {
      const current = entries[entries.length - 1];
      current.description = [current.description, line].filter(Boolean).join(" ").trim();
    }
  }

  return { entries, rangesInMonths, jobTitles: unique(jobTitles) };
}

function parseEducation(sectionContent: string | undefined): string[] {
  if (!sectionContent) return [];
  return splitLines(sectionContent).map((line) => normalizeForComparison(line));
}

function collectKeywords(text: string): string[] {
  return unique(tokenize(text));
}

export function parseResume(resumeText: string, config: ResolvedATSConfig): ParsedResume {
  const normalizedText = normalizeWhitespace(resumeText);
  const { sections, detected } = extractSections(resumeText);
  const skills = parseSkills(sections.skills, config.skillAliases);
  const actionVerbs = parseActionVerbs(normalizedText);
  const experienceData = parseExperience(sections.experience);
  const educationEntries = parseEducation(sections.education);
  const totalExperienceYears = sumExperienceYears(
    experienceData.entries
      .map((entry) => entry.dates)
      .filter((range): range is NonNullable<typeof range> => Boolean(range))
  );

  const requiredSections: ResumeSection[] = ["summary", "experience", "skills", "education"];
  const warnings: string[] = [];
  for (const section of requiredSections) {
    if (!detected.includes(section)) {
      warnings.push(`${section} section not detected`);
    }
  }

  return {
    raw: resumeText,
    normalizedText,
    detectedSections: detected,
    sectionContent: sections,
    skills,
    jobTitles: experienceData.jobTitles,
    actionVerbs,
    educationEntries,
    experience: experienceData.entries,
    totalExperienceYears,
    keywords: collectKeywords(normalizedText),
    warnings,
  };
}
