export const STOP_WORDS = new Set([
  // articles / prepositions / conjunctions
  "the", "and", "or", "a", "an", "of", "for", "to", "with", "in", "on", "at",
  "by", "from", "as", "into", "onto", "upon", "via", "per", "plus",
  // verbs / modals
  "is", "are", "be", "was", "were", "will", "can", "should", "must", "have",
  "has", "had", "do", "does", "did", "get", "give", "go", "use", "see",
  "help", "work", "build", "show", "need", "want", "make", "let",
  // pronouns / determiners
  "it", "its", "this", "that", "these", "those", "we", "our", "you", "your",
  "they", "their", "us", "who", "what", "which", "how",
  // common English fillers that leak into JDs
  "no", "not", "all", "any", "also", "more", "well", "very", "highly",
  "across", "over", "under", "within", "about", "out", "up", "down",
  "new", "if", "so", "such", "both", "each", "one", "many", "only",
  // JD/HR boilerplate — never skills
  "years", "year", "experience", "required", "requirement", "requirements",
  "preferred", "role", "degree", "practices", "best", "skills", "team",
  "field", "related", "relevant", "desired", "strong", "solid", "good",
  "first", "based", "day", "week", "month", "time", "fast", "open", "dynamic",
]);

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

export function tokenize(text: string): string[] {
  const normalized = normalizeForComparison(text);
  // Require at least one letter: drops bare numbers (100, 3+, 50%) and keeps c#, 3d, node.js
  return (normalized.match(TECH_TOKEN_RE) ?? []).filter(
    (t) => /[a-z]/.test(t) && !STOP_WORDS.has(t)
  );
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
