import { stem } from "./match";
import { ROLE_NOUNS, STOP_WORDS } from "./text";

export type Seniority = "junior" | "mid" | "senior" | "lead" | "principal";

// Ordered by specificity so a title like "Senior Staff Engineer" resolves to the
// higher-ranked signal (principal-ish) rather than the first substring hit.
const SENIORITY_SIGNALS: { seniority: Seniority; pattern: RegExp }[] = [
  { seniority: "principal", pattern: /\bprincipal\b/i },
  { seniority: "lead", pattern: /\b(lead|staff|head of|director)\b/i },
  { seniority: "senior", pattern: /\b(senior|sr\.?)\b/i },
  {
    seniority: "junior",
    pattern: /\b(junior|jr\.?|entry[\s-]?level|intern(?:ship)?|associate)\b/i,
  },
];

// Rank used to pick the strongest signal when a title matches more than one tier
// (e.g. "Senior Staff Engineer" hits both senior and lead).
const SENIORITY_RANK: Record<Seniority, number> = {
  junior: 0,
  mid: 1,
  senior: 2,
  lead: 3,
  principal: 4,
};

/**
 * Infer overall seniority from a resume's job titles. Looks at every title (not just
 * the most recent) and returns the highest-ranked signal found; if titles exist but
 * none carry a seniority keyword, returns undefined (unknown) rather than guessing
 * "mid" — callers can default to 'mid' themselves if they want that fallback.
 */
export function inferSeniority(titles: string[]): Seniority | undefined {
  let best: Seniority | undefined;
  for (const title of titles) {
    for (const { seniority, pattern } of SENIORITY_SIGNALS) {
      if (pattern.test(title)) {
        if (!best || SENIORITY_RANK[seniority] > SENIORITY_RANK[best]) {
          best = seniority;
        }
        break; // first (most specific) match per title wins for that title
      }
    }
  }
  return best;
}

/** Lowercase + collapse whitespace/punctuation noise from a raw job title string. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=_`~()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleTokens(title: string): Set<string> {
  const tokens = normalizeTitle(title)
    .split(" ")
    .filter((t) => t && !STOP_WORDS.has(t))
    .map((t) => stem(t));
  return new Set(tokens);
}

/**
 * Coverage ratio (0-1) of JD role keywords found in the resume's titles, matched on
 * stemmed/normalized tokens rather than raw single-token overlap so "Developer" vs
 * "Developing"/"Devs" or "Sr Engineer" vs "Senior Engineer" still line up. Also treats
 * the shared ROLE_NOUNS vocabulary as a soft synonym set: any resume title token that
 * shares a stemmed role-noun with a JD keyword counts as a match.
 */
export function titleMatch(
  resumeTitles: string[],
  jdRoleKeywords: string[]
): number {
  const keywords = jdRoleKeywords
    .map((k) => stem(normalizeTitle(k)))
    .filter(Boolean);
  if (keywords.length === 0) {
    return 0;
  }

  const resumeTokenSets = resumeTitles.map(titleTokens);
  const roleNounStems = new Set(ROLE_NOUNS.map((n) => stem(n)));

  let matched = 0;
  for (const keyword of keywords) {
    const isRoleNoun = roleNounStems.has(keyword);
    const hit = resumeTokenSets.some((tokens) => {
      if (tokens.has(keyword)) {
        return true;
      }
      // Soft synonym: both sides reference a shared role noun (e.g. "engineer").
      return (
        isRoleNoun &&
        [...tokens].some((t) => roleNounStems.has(t) && t === keyword)
      );
    });
    if (hit) {
      matched += 1;
    }
  }
  return matched / keywords.length;
}
