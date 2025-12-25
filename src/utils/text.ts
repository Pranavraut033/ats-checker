export const STOP_WORDS = new Set([
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
  "is",
  "are",
  "be",
  "this",
  "that",
  "it",
  "was",
  "were",
  "will",
  "can",
  "should",
  "must",
  "have",
  "has",
  "had",
]);

export function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(/\s+/g, " ").trim();
}

export function normalizeForComparison(text: string): string {
  return normalizeWhitespace(text).toLowerCase();
}

export function splitLines(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function tokenize(text: string): string[] {
  return normalizeForComparison(text)
    .split(/[^a-z0-9+]+/i)
    .map((word) => word.trim())
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
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
