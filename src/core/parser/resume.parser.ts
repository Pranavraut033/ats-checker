import { ResolvedATSConfig } from "../../types/config";
import {
  ParsedAchievement,
  ParsedExperienceEntry,
  ParsedResume,
  ResumeSection,
} from "../../types/parser";
import { parseDateRange, sumExperienceYears } from "../../utils/dates";
import { parseLanguageMentions } from "../../utils/languages";
import { normalizeSkills } from "../../utils/skills";
import {
  escapeRegExp,
  normalizeForComparison,
  normalizeWhitespace,
  ROLE_NOUNS,
  splitLines,
  tokenize,
  unique,
} from "../../utils/text";

// ponytail: German/French aliases added inline alongside English — same flat list, no locale plumbing.
const SECTION_ALIASES: Record<ResumeSection, string[]> = {
  summary: [
    "summary",
    "profile",
    "about",
    "zusammenfassung",
    "profil",
    "résumé",
    "à propos",
  ],
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment",
    "erfahrung",
    "berufserfahrung",
    "expérience",
    "expérience professionnelle",
  ],
  skills: [
    "skills",
    "technical skills",
    "technologies",
    "fähigkeiten",
    "kenntnisse",
    "compétences",
  ],
  education: [
    "education",
    "academics",
    "academic background",
    "ausbildung",
    "formation",
    "études",
  ],
  projects: ["projects", "portfolio", "projekte", "projets"],
  certifications: [
    "certifications",
    "licenses",
    "zertifizierungen",
    "certifications professionnelles",
  ],
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

const WEAK_VERBS = [
  "worked",
  "helped",
  "performed",
  "responsible",
  "assisted",
  "participated",
  "involved",
];

// Seniority words that precede a role noun ("Senior Engineer", "VP Engineering") but aren't role
// nouns themselves. Legacy modifier words kept alongside so "Software Engineer"/"Full Stack
// Developer"/"Frontend Developer"/"Backend Engineer" (the original narrower whitelist) still match.
const TITLE_SENIORITY_PREFIXES = [
  "senior",
  "lead",
  "principal",
  "staff",
  "vp",
  "director",
];
const TITLE_MODIFIER_WORDS = [
  "software",
  "full\\s*stack",
  "frontend",
  "backend",
];
// Shared with jd.parser.ts's extractRoleKeywords — root cause fix for #1 (JD roleKeywords vs
// resume title phrases previously drawing from two different, disagreeing whitelists).
const TITLE_PREFIX_WORDS = unique([
  ...TITLE_SENIORITY_PREFIXES,
  ...TITLE_MODIFIER_WORDS,
  ...ROLE_NOUNS,
]);
// Stop at comma / hyphen / open-paren so an inline date range ("(Jan 2020 - Present)") on a
// combined title+dates line doesn't leak into the captured title.
const TITLE_RE = new RegExp(`^(${TITLE_PREFIX_WORDS.join("|")})[^,(-]*`, "i");

// ponytail: verb+metric heuristic — no sentence parsing until it misclassifies in practice.
const METRIC_RE = /\d|%|\$|\bk\+|\bm\+/i;

function classifyAchievement(line: string): ParsedAchievement {
  const lower = line.toLowerCase();
  const hasMetric = METRIC_RE.test(line);
  const hasStrongVerb = STRONG_VERBS.some((verb) =>
    new RegExp(`\\b${verb}\\b`).test(lower)
  );
  const hasWeakVerb = WEAK_VERBS.some((verb) =>
    new RegExp(`\\b${verb}\\b`).test(lower)
  );

  if (hasStrongVerb && hasMetric) {
    return {
      text: line,
      strength: "strong",
      reason: "strong verb + quantified impact",
    };
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

function parseSkills(
  sectionContent: string | undefined,
  aliases: ResolvedATSConfig["skillAliases"]
): string[] {
  if (!sectionContent) return [];
  // ponytail: bullet-separated skill lists wrap across lines in PDF text extraction,
  // so treat common bullet glyphs as the delimiter and fold newlines into spaces when present.
  const hasBullets = /[•·‣▪○●◦]/.test(sectionContent);
  const normalized = hasBullets
    ? sectionContent.replace(/\n/g, " ")
    : sectionContent;
  const raw = normalized
    .split(/[,;\n]|[•·‣▪○●◦]/)
    .map((skill) =>
      skill
        .trim()
        .replace(/^[-•·‣▪○●◦\s]+|[-•·‣▪○●◦\s]+$/g, "")
        .trim()
    )
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

function parseExperience(
  sectionContent: string | undefined,
  referenceDate?: Date
): {
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
    const titleMatch = line.match(TITLE_RE);
    const title = titleMatch ? titleMatch[0].trim() : undefined;

    if (range) {
      if (title) {
        // Title and dates on the same line — the common "Senior Engineer, Company (2020–Present)"
        // layout. Without this, the date branch consumed the whole line and the title (and thus
        // the experience role-match component) was silently dropped. We capture the title only —
        // not an achievement, matching the pre-existing behavior that dated lines aren't bullets.
        jobTitles.push(title.toLowerCase());
        entries.push({ title, dates: range, description: line });
      } else {
        const previous = entries[entries.length - 1];
        if (previous && !previous.dates) {
          previous.dates = range;
        } else {
          entries.push({ dates: range });
        }
      }
      if (range.durationInMonths) {
        rangesInMonths.push(range.durationInMonths);
      }
      continue;
    }

    if (title) {
      jobTitles.push(title.toLowerCase());
      const entry: ParsedExperienceEntry = { title, description: line };
      entries.push(entry);
      achievements.push(classifyAchievement(line));
      continue;
    }

    if (entries.length > 0) {
      const current = entries[entries.length - 1];
      current.description = [current.description, line]
        .filter(Boolean)
        .join(" ")
        .trim();
    }
    achievements.push(classifyAchievement(line));
  }

  return {
    entries,
    rangesInMonths,
    jobTitles: unique(jobTitles),
    achievements,
  };
}

function parseEducation(sectionContent: string | undefined): string[] {
  if (!sectionContent) return [];
  return splitLines(sectionContent).map((line) => normalizeForComparison(line));
}

function collectKeywords(text: string): string[] {
  return unique(tokenize(text));
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// ponytail: lenient international-ish pattern — optional leading +country code, then 2-4
// groups of 2-4 digits separated by space/dot/dash. Good enough to flag presence, not validate.
const PHONE_RE = /\+?\(?\d{1,4}\)?(?:[\s.-]?\d{2,4}){2,4}/;

function extractContact(text: string): ParsedResume["contact"] {
  const email = text.match(EMAIL_RE)?.[0];
  const phone = text.match(PHONE_RE)?.[0]?.trim();
  if (!email && !phone) return undefined;
  return { email, phone };
}

export function parseResume(
  resumeText: string,
  config: ResolvedATSConfig
): ParsedResume {
  const normalizedText = normalizeWhitespace(resumeText);
  const { sections, detected } = extractSections(resumeText);
  const skills = parseSkills(sections.skills, config.skillAliases);
  const actionVerbs = parseActionVerbs(normalizedText);
  const experienceData = parseExperience(
    sections.experience,
    config.referenceDate
  );
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
      const parsed = Number.parseInt(yearsMatch[1], 10);
      // ponytail: cap at 60 — realistic max career length; ignore garbage matches like "97 years".
      totalExperienceYears = parsed <= 60 ? parsed : 0;
    }
  }

  const requiredSections: ResumeSection[] = [
    "summary",
    "experience",
    "skills",
    "education",
  ];
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

  const contact = extractContact(resumeText);
  if (!contact?.email) {
    warnings.push(
      "No email address detected — most ATS require a parseable contact email"
    );
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
    contact,
    warnings,
  };
}
