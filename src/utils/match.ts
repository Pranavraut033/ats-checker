// ponytail: hand-rolled stemmer + bounded Levenshtein — both stay well under the
// "reach for a dep" threshold (~20 lines each) per the plan's zero-dependency note.

// Longest-suffix-first so e.g. "-ation" is stripped before "-tion" mis-fires, and
// "-ies"/"-ied" before the generic "-s"/"-ed" catch-alls.
const SUFFIXES: {
  suffix: string;
  replacement: string;
  minStemLength: number;
}[] = [
  { suffix: "ational", replacement: "ate", minStemLength: 3 },
  { suffix: "ization", replacement: "ize", minStemLength: 3 },
  { suffix: "ations", replacement: "ate", minStemLength: 3 },
  { suffix: "ation", replacement: "ate", minStemLength: 3 },
  { suffix: "ements", replacement: "e", minStemLength: 3 },
  { suffix: "ement", replacement: "e", minStemLength: 3 },
  { suffix: "ments", replacement: "ment", minStemLength: 3 },
  { suffix: "ment", replacement: "", minStemLength: 3 },
  { suffix: "ies", replacement: "y", minStemLength: 2 },
  { suffix: "ied", replacement: "y", minStemLength: 2 },
  { suffix: "ying", replacement: "y", minStemLength: 2 },
  { suffix: "tion", replacement: "t", minStemLength: 3 },
  { suffix: "sion", replacement: "s", minStemLength: 3 },
  { suffix: "ness", replacement: "", minStemLength: 3 },
  { suffix: "fully", replacement: "ful", minStemLength: 3 },
  { suffix: "ally", replacement: "al", minStemLength: 3 },
  { suffix: "ing", replacement: "", minStemLength: 3 },
  { suffix: "edly", replacement: "", minStemLength: 3 },
  { suffix: "ed", replacement: "", minStemLength: 3 },
  { suffix: "ly", replacement: "", minStemLength: 3 },
  { suffix: "er", replacement: "", minStemLength: 3 },
  { suffix: "es", replacement: "", minStemLength: 3 },
  { suffix: "s", replacement: "", minStemLength: 3 },
];

/**
 * Hand-rolled suffix normalizer: strips common English inflectional/derivational
 * suffixes so word-form variants (developing/developed/develops -> develop) collapse
 * to the same stem. Not a full Porter stemmer — deliberately simple, deterministic,
 * and tuned for resume/JD vocabulary rather than general English.
 */
function stripOneSuffix(lower: string): string {
  for (const { suffix, replacement, minStemLength } of SUFFIXES) {
    if (
      lower.endsWith(suffix) &&
      lower.length - suffix.length >= minStemLength
    ) {
      // Collapse a doubled trailing consonant left behind by stripping "-ing"/"-ed"
      // (e.g. "running" -> "runn" -> "run", "planned" -> "plann" -> "plan").
      let stemmed = lower.slice(0, lower.length - suffix.length) + replacement;
      if (
        replacement === "" &&
        stemmed.length >= 3 &&
        stemmed[stemmed.length - 1] === stemmed[stemmed.length - 2] &&
        !/[aeiou]/.test(stemmed[stemmed.length - 1])
      ) {
        stemmed = stemmed.slice(0, -1);
      }
      return stemmed;
    }
  }
  return lower;
}

/**
 * Runs suffix-stripping up to twice so a stacked plural+derivational ending (e.g.
 * "managers" -> "manager" -> "manag") converges to the same stem as its singular
 * form, without letting an unbounded loop over-strip short base words (each pass is
 * gated by minStemLength, and stripping stops as soon as a pass makes no change).
 */
export function stem(token: string): string {
  let word = token.trim().toLowerCase();
  for (let pass = 0; pass < 2 && word.length > 3; pass++) {
    const next = stripOneSuffix(word);
    if (next === word) {
      break;
    }
    word = next;
  }
  return word;
}

/**
 * Bounded Levenshtein edit distance. Stops early (returns Infinity-ish maxDistance+1)
 * once it's clear the distance exceeds maxDistance, keeping the cost close to O(n*m)
 * but cheap in practice for the short strings this library compares.
 */
export function levenshteinDistance(
  a: string,
  b: string,
  maxDistance: number
): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  if (s === t) return 0;
  const lenDiff = Math.abs(s.length - t.length);
  if (lenDiff > maxDistance) return maxDistance + 1;

  let prevRow = new Array(t.length + 1);
  for (let j = 0; j <= t.length; j++) prevRow[j] = j;

  for (let i = 1; i <= s.length; i++) {
    const currRow = new Array(t.length + 1);
    currRow[0] = i;
    let rowMin = currRow[0];
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1, // deletion
        currRow[j - 1] + 1, // insertion
        prevRow[j - 1] + cost // substitution
      );
      if (currRow[j] < rowMin) rowMin = currRow[j];
    }
    if (rowMin > maxDistance) {
      // Every entry in this row already exceeds the budget; distance can only grow.
      return maxDistance + 1;
    }
    prevRow = currRow;
  }
  return prevRow[t.length];
}

/**
 * Fuzzy string equality via bounded Levenshtein distance, used to catch typos/near
 * variants (e.g. "ReactJS" vs "react" after stemming, or a plain typo). Default
 * threshold scales with length: maxDistance 1 for strings <=6 chars, 2 for longer,
 * matching the plan's "short vs long" bound.
 */
export function fuzzyEqual(
  a: string,
  b: string,
  opts?: { maxDistance?: number }
): boolean {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (x === y) return true;
  if (!x || !y) return false;
  const longer = Math.max(x.length, y.length);
  const defaultMax = longer <= 6 ? 1 : 2;
  const maxDistance = opts?.maxDistance ?? defaultMax;
  return levenshteinDistance(x, y, maxDistance) <= maxDistance;
}
