import { ResolvedATSConfig, SkillAliases } from "../../types/config";
import {
  ParsedAchievement,
  ParsedExperienceEntry,
  ParsedResume,
  ResumeSection,
} from "../../types/parser";
import {
  detectEmploymentGaps,
  parseDateRange,
  sumExperienceYears,
} from "../../utils/dates";
import { parseLanguageMentions } from "../../utils/languages";
import { fuzzyEqual, stem } from "../../utils/match";
import { normalizeSkill, normalizeSkills } from "../../utils/skills";
import {
  detectFormatting,
  escapeRegExp,
  normalizeForComparison,
  normalizeWhitespace,
  ROLE_NOUNS,
  splitLines,
  tokenize,
  unique,
} from "../../utils/text";
import { inferSeniority } from "../../utils/titles";

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
    "work history",
    "employment history",
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

// A "tail" following the alias phrase that still counts as a header line rather than body
// prose: punctuation (colon/dash/period), whitespace, and/or a trailing date/date-range
// (e.g. "WORK HISTORY 2015-2024", "Professional Experience —", "EXPERIENCE:"). Anything
// else after the alias (real words) means it's a sentence, not a header.
const HEADER_TAIL_RE =
  /^[\s:.\-–—,]*(?:\d{4}\s*(?:[-–—]|to)\s*(?:\d{4}|present|current|now)|\d{4})?[\s:.\-–—,]*$/i;

// Header lines are short by convention — guards both the exact and fuzzy passes below
// against matching inside a long line of body prose that merely starts with an alias word.
const MAX_HEADER_LINE_LENGTH = 60;

function detectSection(line: string): ResumeSection | null {
  // Normalize and trim line before matching
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > MAX_HEADER_LINE_LENGTH) return null;
  const normalized = trimmed.toLowerCase();

  for (const [section, aliases] of Object.entries(SECTION_ALIASES)) {
    for (const alias of aliases) {
      const safeAlias = escapeRegExp(alias);
      const headerPattern = new RegExp(`^${safeAlias}(.*)$`, "i");
      const match = normalized.match(headerPattern);
      if (match && HEADER_TAIL_RE.test(match[1])) {
        return section as ResumeSection;
      }
    }
  }

  // Fuzzy fallback: catch near-miss synonyms/typos (e.g. "Employements" for "employment")
  // via stemmed Levenshtein comparison. Requires the same word count as the alias so a
  // stray single-word match in the middle of a longer phrase can't fire, and still enforces
  // the header-tail rule on whatever follows the matched words.
  const coreLine = normalized.replace(/[\s:.\-–—,]+$/, "");
  const lineWords = coreLine.split(/\s+/).filter(Boolean);
  for (const [section, aliases] of Object.entries(SECTION_ALIASES)) {
    for (const alias of aliases) {
      const aliasWords = alias.split(/\s+/);
      if (lineWords.length < aliasWords.length) continue;
      const candidateWords = lineWords.slice(0, aliasWords.length);
      const allFuzzy = aliasWords.every(
        (aliasWord, i) =>
          aliasWord !== candidateWords[i] &&
          fuzzyEqual(stem(aliasWord), stem(candidateWords[i]))
      );
      if (!allFuzzy) continue;
      const prefixPattern = new RegExp(
        `^\\s*${candidateWords.map((w) => escapeRegExp(w)).join("\\s+")}(.*)$`,
        "i"
      );
      const prefixMatch = normalized.match(prefixPattern);
      if (prefixMatch && HEADER_TAIL_RE.test(prefixMatch[1])) {
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

function parseExplicitSkillList(sectionContent: string | undefined): string[] {
  if (!sectionContent) return [];
  // ponytail: bullet-separated skill lists wrap across lines in PDF text extraction,
  // so treat common bullet glyphs as the delimiter and fold newlines into spaces when present.
  const hasBullets = /[•·‣▪○●◦]/.test(sectionContent);
  const normalized = hasBullets
    ? sectionContent.replace(/\n/g, " ")
    : sectionContent;
  return normalized
    .split(/[,;\n]|[•·‣▪○●◦]/)
    .map((skill) =>
      skill
        .trim()
        .replace(/^[-•·‣▪○●◦\s]+|[-•·‣▪○●◦\s]+$/g, "")
        .trim()
    )
    .filter(Boolean);
}

/**
 * Scan free-form text (experience bullets, summary) for tokens that resolve to a known
 * registry canonical/alias, so skills demonstrated outside a dedicated "Skills" section
 * still get credit. Only tokens that actually resolve to a known canonical are kept —
 * unlike parseExplicitSkillList, we don't want to just tokenize everything and treat it
 * as a skill (that would be noise: "led", "team", "quarterly" aren't skills).
 */
function extractKnownSkillsFromText(
  text: string | undefined,
  aliases: SkillAliases
): string[] {
  if (!text) return [];
  const canonicalSet = new Set(
    Object.keys(aliases).map((c) => c.toLowerCase())
  );
  const found: string[] = [];
  for (const token of tokenize(text)) {
    const canonical = normalizeSkill(token, aliases);
    if (canonicalSet.has(canonical)) {
      found.push(canonical);
    }
  }
  return unique(found);
}

function parseSkills(
  sections: Partial<Record<ResumeSection, string>>,
  aliases: ResolvedATSConfig["skillAliases"]
): string[] {
  const explicit = normalizeSkills(
    parseExplicitSkillList(sections.skills),
    aliases
  );
  const fromExperience = extractKnownSkillsFromText(
    sections.experience,
    aliases
  );
  const fromSummary = extractKnownSkillsFromText(sections.summary, aliases);
  return normalizeSkills(
    unique([...explicit, ...fromExperience, ...fromSummary]),
    aliases
  );
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
  referenceDate: Date | undefined,
  aliases: SkillAliases
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
        entries.push({ title, dates: range, description: line, skills: [] });
      } else {
        const previous = entries[entries.length - 1];
        if (previous && !previous.dates) {
          previous.dates = range;
        } else {
          entries.push({ dates: range, skills: [] });
        }
      }
      if (range.durationInMonths) {
        rangesInMonths.push(range.durationInMonths);
      }
      continue;
    }

    if (title) {
      jobTitles.push(title.toLowerCase());
      const entry: ParsedExperienceEntry = {
        title,
        description: line,
        skills: [],
      };
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

  // Per-role skill dating: resolved once the full description (title line + trailing
  // bullets folded in above) is assembled, using the same alias/fuzzy resolution as the
  // whole-document extraction so a skill mentioned only in a role's bullets still counts.
  for (const entry of entries) {
    entry.skills = extractKnownSkillsFromText(entry.description, aliases);
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
// LinkedIn profile URL (with or without protocol/www) or bare "linkedin.com/in/<handle>" mention.
const LINKEDIN_RE =
  /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/(?:in|pub)\/[a-z0-9\-_%]+\/?/i;
// Best-effort "City, ST"/"City, Country" line — deliberately strict (whole-line match, title-case
// segments, no digits) so it doesn't false-positive on "Doe, Jane" or bullet text.
const LOCATION_RE =
  /^[A-Z][A-Za-z.'-]+(?:\s[A-Z][A-Za-z.'-]+)*,\s*[A-Z][A-Za-z]{1,20}$/;

function extractLocation(text: string): string | undefined {
  // Location is almost always near the top of the document, alongside the rest of the
  // contact block — scanning the whole resume risks matching an unrelated "City, ST" inside
  // an address in the experience section.
  const candidateLines = splitLines(text).slice(0, 8);
  for (const line of candidateLines) {
    if (EMAIL_RE.test(line) || /\d/.test(line)) continue;
    if (LOCATION_RE.test(line)) {
      return line;
    }
  }
  return undefined;
}

function extractContact(text: string): ParsedResume["contact"] {
  const email = text.match(EMAIL_RE)?.[0];
  const phone = text.match(PHONE_RE)?.[0]?.trim();
  const linkedin = text.match(LINKEDIN_RE)?.[0];
  const location = extractLocation(text);
  if (!email && !phone && !linkedin && !location) return undefined;
  return { email, phone, linkedin, location };
}

export function parseResume(
  resumeText: string,
  config: ResolvedATSConfig
): ParsedResume {
  const normalizedText = normalizeWhitespace(resumeText);
  const { sections, detected } = extractSections(resumeText);
  const skills = parseSkills(sections, config.skillAliases);
  const actionVerbs = parseActionVerbs(normalizedText);
  const experienceData = parseExperience(
    sections.experience,
    config.referenceDate,
    config.skillAliases
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
    seniority: inferSeniority(experienceData.jobTitles),
    employmentGaps: detectEmploymentGaps(experienceData.entries),
    formatting: detectFormatting(resumeText),
    warnings,
  };
}
