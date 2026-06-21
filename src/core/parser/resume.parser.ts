import { ResolvedATSConfig } from "../../types/config";
import { ParsedAchievement, ParsedExperienceEntry, ParsedResume, ResumeSection } from "../../types/parser";
import { parseDateRange, sumExperienceYears } from "../../utils/dates";
import {
  escapeRegExp,
  normalizeForComparison,
  normalizeWhitespace,
  splitLines,
  tokenize,
  unique,
} from "../../utils/text";
import { normalizeSkills } from "../../utils/skills";
import { parseLanguageMentions } from "../../utils/languages";

const SECTION_ALIASES: Record<ResumeSection, string[]> = {
  summary: ["summary", "profile", "about"],
  experience: ["experience", "work experience", "professional experience", "employment"],
  skills: ["skills", "technical skills", "technologies"],
  education: ["education", "academics", "academic background"],
  projects: ["projects", "portfolio"],
  certifications: ["certifications", "licenses"]
};

const STRONG_VERBS = [
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

const WEAK_VERBS = ["worked", "helped", "performed", "responsible", "assisted", "participated", "involved"];

// ponytail: verb+metric heuristic — no sentence parsing until it misclassifies in practice.
const METRIC_RE = /\d|%|\$|\bk\+|\bm\+/i;

function classifyAchievement(line: string): ParsedAchievement {
  const lower = line.toLowerCase();
  const hasMetric = METRIC_RE.test(line);
  const hasStrongVerb = STRONG_VERBS.some((verb) => new RegExp(`\\b${verb}\\b`).test(lower));
  const hasWeakVerb = WEAK_VERBS.some((verb) => new RegExp(`\\b${verb}\\b`).test(lower));

  if (hasStrongVerb && hasMetric) {
    return { text: line, strength: "strong", reason: "strong verb + quantified impact" };
  }
  if (hasWeakVerb) {
    return { text: line, strength: "weak", reason: "weak verb" };
  }
  return { text: line, strength: "weak", reason: "no quantified impact" };
}


function detectSection(line: string): ResumeSection | null {
  // Normalize and trim line before matching
  const normalized = line.trim().toLowerCase();
  for (const [section, aliases] of Object.entries(SECTION_ALIASES)) {
    for (const alias of aliases) {
      const safeAlias = escapeRegExp(alias);
      const headerPattern = new RegExp(`^${safeAlias}(\\s*:)?$`, "i");
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

function parseActionVerbs(text: string): { strong: string[]; weak: string[] } {
  const words = tokenize(text);
  return {
    strong: STRONG_VERBS.filter((verb) => words.includes(verb)),
    weak: WEAK_VERBS.filter((verb) => words.includes(verb)),
  };
}

function parseExperience(sectionContent: string | undefined, referenceDate?: Date): {
  entries: ParsedExperienceEntry[];
  rangesInMonths: number[];
  jobTitles: string[];
  achievements: ParsedAchievement[];
} {
  if (!sectionContent) {
    return { entries: [], rangesInMonths: [], jobTitles: [], achievements: [] };
  }
  const lines = splitLines(sectionContent);
  const entries: ParsedExperienceEntry[] = [];
  const rangesInMonths: number[] = [];
  const jobTitles: string[] = [];
  const achievements: ParsedAchievement[] = [];

  for (const line of lines) {
    const range = parseDateRange(line, referenceDate);
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
      achievements.push(classifyAchievement(line));
      continue;
    }

    if (entries.length > 0) {
      const current = entries[entries.length - 1];
      current.description = [current.description, line].filter(Boolean).join(" ").trim();
    }
    achievements.push(classifyAchievement(line));
  }

  return { entries, rangesInMonths, jobTitles: unique(jobTitles), achievements };
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
  const experienceData = parseExperience(sections.experience, config.referenceDate);
  const educationEntries = parseEducation(sections.education);
  let totalExperienceYears = sumExperienceYears(
    experienceData.entries
      .map((entry) => entry.dates)
      .filter((range): range is NonNullable<typeof range> => Boolean(range))
  );
  // ponytail: fallback heuristic — scan summary/full text for "N+ years" when no dated ranges parsed
  if (totalExperienceYears === 0) {
    const textToScan = sections.summary ?? normalizedText;
    const yearsMatch = textToScan.match(/(\d{1,2})\+?\s*years?/i);
    if (yearsMatch) {
      totalExperienceYears = Number.parseInt(yearsMatch[1], 10);
    }
  }

  const requiredSections: ResumeSection[] = ["summary", "experience", "skills", "education"];
  const warnings: string[] = [];

  // ponytail: flag flattened/empty extraction (common with multi-column or scanned PDFs)
  // so the user fixes the source rather than trusting a garbage parse
  const lineCount = splitLines(resumeText).length;
  if (resumeText.trim().length < 100) {
    warnings.push(
      "Almost no text was extracted — the resume may be a scanned/image PDF. Upload a text-based PDF or paste the text directly."
    );
  } else if (lineCount <= 2) {
    warnings.push(
      "Resume text has no line breaks — the PDF layout likely didn't export cleanly (common with multi-column designs). Export as a single-column PDF or paste plain text for accurate parsing."
    );
  }

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
    actionVerbs: actionVerbs.strong,
    weakVerbs: actionVerbs.weak,
    achievements: experienceData.achievements,
    educationEntries,
    experience: experienceData.entries,
    totalExperienceYears,
    keywords: collectKeywords(normalizedText),
    languages: parseLanguageMentions(resumeText),
    warnings,
  };
}
