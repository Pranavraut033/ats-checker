import { ParsedLanguage } from "../types/parser";

// ponytail: seed list of common languages — extend as real-world JDs/resumes surface gaps.
const KNOWN_LANGUAGES = [
  "english", "spanish", "french", "german", "italian", "portuguese", "dutch",
  "russian", "mandarin", "chinese", "cantonese", "japanese", "korean", "arabic",
  "hindi", "polish", "turkish", "vietnamese", "swedish", "norwegian", "danish",
  "finnish", "greek", "hebrew", "thai", "indonesian", "ukrainian", "czech",
];

const LANGUAGE_ALIASES: Record<string, string> = {
  mandarin: "chinese",
  cantonese: "chinese",
};

// CEFR rank (1-6) plus common descriptive proficiency words mapped to the closest CEFR band.
// ponytail: German/French descriptive words added inline alongside English — same flat map.
const LEVEL_RANK: Record<string, number> = {
  a1: 1, a2: 2, b1: 3, b2: 4, c1: 5, c2: 6,
  basic: 1, elementary: 1,
  limited: 2,
  conversational: 3, intermediate: 3,
  professional: 4, "upper intermediate": 4, advanced: 4,
  fluent: 5,
  native: 6, "native speaker": 6, bilingual: 6,
  // German
  grundkenntnisse: 1,
  gering: 2,
  gut: 3,
  fortgeschritten: 4,
  fließend: 5,
  muttersprache: 6, muttersprachler: 6,
  // French
  "débutant": 1, "élémentaire": 1,
  "limité": 2,
  "intermédiaire": 3,
  "avancé": 4,
  courant: 5,
  natif: 6, "langue maternelle": 6, bilingue: 6,
};

const LANGUAGE_GROUP = KNOWN_LANGUAGES.join("|");
const LEVEL_GROUP = Object.keys(LEVEL_RANK)
  .sort((a, b) => b.length - a.length)
  .map((l) => l.replace(/\s+/g, "\\s+"))
  .join("|");

// Matches "German (C1)", "German - C1", "German: fluent", "fluent German", "native German speaker"
// Comma deliberately excluded from the separator class — it's used to delimit list items
// ("German, native; Spanish, fluent"), and treating it as a level separator would let one
// entry's level bleed onto the next ("Spanish, native English" misreading Spanish as native).
// ponytail: plain \b fails on words with a leading/trailing accented letter (e.g. "élémentaire",
// "avancé") because JS treats accented chars as non-word for \b purposes. Lookaround boundaries
// scoped to the actual a-zà-ÿ alphabet used here sidestep that without a full Unicode regex.
const BOUNDARY_START = "(?:^|(?<=[^a-zà-ÿ]))";
const BOUNDARY_END = "(?:$|(?=[^a-zà-ÿ]))";
const LANGUAGE_LEVEL_RE = new RegExp(
  `\\b(${LANGUAGE_GROUP})\\b(?:\\s*[\\(:\\-]?\\s*(${BOUNDARY_START}(?:${LEVEL_GROUP})${BOUNDARY_END}|[abc][12]))?`,
  "gi"
);
const LEVEL_BEFORE_LANGUAGE_RE = new RegExp(
  `${BOUNDARY_START}(${LEVEL_GROUP})${BOUNDARY_END}\\s+(?:in\\s+)?(${LANGUAGE_GROUP})\\b`,
  "gi"
);

function canonicalLanguage(name: string): string {
  const lower = name.toLowerCase();
  return LANGUAGE_ALIASES[lower] ?? lower;
}

function toParsedLanguage(name: string, level?: string): ParsedLanguage {
  const normalizedLevel = level?.toLowerCase().replace(/\s+/g, " ");
  return {
    name: canonicalLanguage(name),
    level: normalizedLevel,
    levelRank: normalizedLevel ? LEVEL_RANK[normalizedLevel] : undefined,
  };
}

/** Scan free text for "<Language> (<level>)" / "<level> <Language>" mentions. No section required. */
export function parseLanguageMentions(text: string): ParsedLanguage[] {
  const found = new Map<string, ParsedLanguage>();

  for (const match of text.matchAll(LANGUAGE_LEVEL_RE)) {
    const parsed = toParsedLanguage(match[1], match[2]);
    const existing = found.get(parsed.name);
    if (!existing || (parsed.levelRank ?? 0) > (existing.levelRank ?? 0)) {
      found.set(parsed.name, parsed);
    }
  }

  for (const match of text.matchAll(LEVEL_BEFORE_LANGUAGE_RE)) {
    const parsed = toParsedLanguage(match[2], match[1]);
    const existing = found.get(parsed.name);
    if (!existing || (parsed.levelRank ?? 0) > (existing.levelRank ?? 0)) {
      found.set(parsed.name, parsed);
    }
  }

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Required language missing, or present at a lower CEFR rank than required. */
export function diffLanguages(
  resumeLanguages: ParsedLanguage[],
  requiredLanguages: ParsedLanguage[]
): { matched: ParsedLanguage[]; missing: ParsedLanguage[] } {
  const byName = new Map(resumeLanguages.map((l) => [l.name, l]));
  const matched: ParsedLanguage[] = [];
  const missing: ParsedLanguage[] = [];

  for (const required of requiredLanguages) {
    const have = byName.get(required.name);
    const requiredRank = required.levelRank ?? 0;
    const haveRank = have?.levelRank ?? 0;
    if (have && haveRank >= requiredRank) {
      matched.push(required);
    } else {
      missing.push(required);
    }
  }

  return { matched, missing };
}
