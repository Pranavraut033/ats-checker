import { stem } from "./match";

export const STOP_WORDS = new Set([
  // articles / prepositions / conjunctions
  "the",
  "and",
  "or",
  "a",
  "an",
  "of",
  "for",
  "to",
  "with",
  "in",
  "on",
  "at",
  "by",
  "from",
  "as",
  "into",
  "onto",
  "upon",
  "via",
  "per",
  "plus",
  // verbs / modals
  "is",
  "are",
  "be",
  "was",
  "were",
  "will",
  "can",
  "should",
  "must",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "get",
  "give",
  "go",
  "use",
  "see",
  "help",
  "work",
  "build",
  "show",
  "need",
  "want",
  "make",
  "let",
  // pronouns / determiners
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "we",
  "our",
  "you",
  "your",
  "they",
  "their",
  "us",
  "who",
  "what",
  "which",
  "how",
  // common English fillers that leak into JDs
  "no",
  "not",
  "all",
  "any",
  "also",
  "more",
  "well",
  "very",
  "highly",
  "across",
  "over",
  "under",
  "within",
  "about",
  "out",
  "up",
  "down",
  "new",
  "if",
  "so",
  "such",
  "both",
  "each",
  "one",
  "many",
  "only",
  // JD/HR boilerplate — never skills
  "years",
  "year",
  "experience",
  "required",
  "requirement",
  "requirements",
  "preferred",
  "role",
  "degree",
  "practices",
  "best",
  "skills",
  "team",
  "field",
  "related",
  "relevant",
  "desired",
  "strong",
  "solid",
  "good",
  "first",
  "based",
  "day",
  "week",
  "month",
  "time",
  "fast",
  "open",
  "dynamic",
]);

// Shared role-noun vocabulary so the JD side (extractRoleKeywords) and the resume side
// (title detection) agree on what counts as a "role" — this is what makes the two sides
// comparable via token overlap instead of silently diverging whitelists. Broadened well
// past engineering so non-eng resumes/JDs (design, sales, HR, finance, ...) get titles too.
export const ROLE_NOUNS = [
  "engineer",
  "developer",
  "manager",
  "scientist",
  "analyst",
  "designer",
  "architect",
  "director",
  "consultant",
  "lead",
  "vp",
  "specialist",
  "coordinator",
  "administrator",
  "accountant",
  "recruiter",
  "nurse",
  "teacher",
  "associate",
  "representative",
  "executive",
  "officer",
  "technician",
  "strategist",
  "marketer",
  "writer",
  "editor",
  "product",
  "principal",
  "staff",
  "head",
];

export function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(/\s+/g, " ").trim();
}

export function normalizeForComparison(text: string): string {
  // NFKC folds fullwidth/accented chars before lowercasing (locale-independent)
  return normalizeWhitespace(text).normalize("NFKC").toLowerCase();
}

export function splitLines(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

// Tech-aware token pattern: alnum start, optional internal . # + - / chars, alnum-or-symbol end.
// Preserves c#, c++, node.js, ci/cd, full-stack, a/b as single tokens; drops lone single chars.
// ponytail: custom regex beats any NLP lib here — domain-specific, no dep, fully deterministic
const TECH_TOKEN_RE = /[a-z0-9][a-z0-9.#+\-/]*[a-z0-9#+]/g;

export function tokenize(text: string, options?: { stem?: boolean }): string[] {
  const normalized = normalizeForComparison(text);
  // Require at least one letter: drops bare numbers (100, 3+, 50%) and keeps c#, 3d, node.js
  const tokens = (normalized.match(TECH_TOKEN_RE) ?? []).filter(
    (t) => /[a-z]/.test(t) && !STOP_WORDS.has(t)
  );
  if (!options?.stem) {
    return tokens;
  }
  return tokens.map((t) => stem(t));
}

export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const lower = value.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      output.push(value);
    }
  }
  return output;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function countFrequencies(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

export function containsTableLikeStructure(text: string): boolean {
  const lines = splitLines(text);
  let tableLines = 0;
  for (const line of lines) {
    const hasPipeColumns = line.includes("|") && line.split("|").length >= 3;
    const hasTabColumns = /\t.+\t/.test(line);
    const hasAlignedSpaces = /( {3,})(\S+)( {3,}\S+)/.test(line);
    if (hasPipeColumns || hasTabColumns || hasAlignedSpaces) {
      tableLines += 1;
    }
  }
  return tableLines >= 2;
}

/** ATS-relevant parseability signals extracted from a resume's raw text. */
export interface FormattingSignals {
  /** Pipe/tab/aligned-space table structure (reuses containsTableLikeStructure). */
  hasTables: boolean;
  /** Very wide, inconsistent whitespace gaps suggesting a PDF-extracted multi-column layout. */
  hasMultiColumn: boolean;
  /** Control chars / private-use-area glyphs (icon fonts) / replacement chars from a bad extraction. */
  hasSpecialChars: boolean;
  /** Bullets other than the common -, *, •, o, numbered/lettered list markers. */
  nonStandardBullets: boolean;
  /** Text density/shape consistent with a scanned image (no embedded text layer) rather than real text. */
  likelyScanned: boolean;
  /** A plausible email address is present in the raw text (contact info is extractable). */
  contactParseable: boolean;
}

const STANDARD_BULLET_RE = /^\s*(?:[-*•o‣▪]|\(?[a-z0-9]+[.)])\s+/i;
// Common non-standard bullet glyphs PDF/Word exports emit (arrows, checks, diamonds, dingbats).
const NON_STANDARD_BULLET_RE = /^\s*[➤➢✓✔✗➔❖◆♦❯›»★☆♥❤]/;
// Private-use-area codepoints (icon fonts mis-decoded as text) + the Unicode replacement char.
const SPECIAL_CHAR_RE = /[-�]|[\x00-\x08\x0B\x0C\x0E-\x1F]/;

/**
 * Heuristic parseability/formatting detector for raw resume text. Reuses
 * containsTableLikeStructure for hasTables; the rest are lightweight regex/line
 * scans in the same style. Informational only — callers decide how to score it.
 */
export function detectFormatting(raw: string): FormattingSignals {
  const lines = splitLines(raw);

  const hasTables = containsTableLikeStructure(raw);

  // Multi-column PDFs often extract as lines with very large, irregular whitespace
  // gaps between short fragments (columns interleaved) rather than the more regular
  // 3+ space alignment the table heuristic looks for.
  let wideGapLines = 0;
  for (const line of lines) {
    if (/\S( {6,})\S/.test(line)) {
      wideGapLines += 1;
    }
  }
  const hasMultiColumn = wideGapLines >= 2;

  const hasSpecialChars = SPECIAL_CHAR_RE.test(raw);

  let bulletLines = 0;
  let nonStandardBulletLines = 0;
  for (const line of lines) {
    if (NON_STANDARD_BULLET_RE.test(line)) {
      bulletLines += 1;
      nonStandardBulletLines += 1;
    } else if (STANDARD_BULLET_RE.test(line)) {
      bulletLines += 1;
    }
  }
  const nonStandardBullets =
    nonStandardBulletLines > 0 && nonStandardBulletLines >= bulletLines / 2;

  // Very little recognizable alphabetic content relative to overall length suggests a
  // scanned image whose "text layer" is empty/garbled rather than genuine extracted text.
  const trimmed = raw.trim();
  const letterCount = (trimmed.match(/[a-zA-Z]/g) ?? []).length;
  const likelyScanned =
    trimmed.length > 0 &&
    (letterCount < 20 || letterCount / trimmed.length < 0.2);

  const contactParseable =
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(raw);

  return {
    hasTables,
    hasMultiColumn,
    hasSpecialChars,
    nonStandardBullets,
    likelyScanned,
    contactParseable,
  };
}
