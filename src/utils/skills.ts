import { KeywordCategory, KeywordRegistry, SkillAliases } from "../types/config";
import { unique } from "./text";
import { fuzzyEqual, stem } from "./match";

// Map lookup by default; stem/fuzzy fallback is opt-in (see NormalizeSkillOptions) so
// existing exact-match callers/tests keep their current behavior until SCORING opts in.
const aliasIndexCache = new WeakMap<SkillAliases, Map<string, string>>();
// Cache of stemmed-alias-key -> canonical, built lazily alongside the exact index so the
// fuzzy fallback also stays a Map lookup (plus a bounded distance check) rather than a scan.
const stemIndexCache = new WeakMap<SkillAliases, Map<string, string>>();

function getAliasIndex(aliases: SkillAliases): Map<string, string> {
  let index = aliasIndexCache.get(aliases);
  if (!index) {
    index = new Map();
    for (const [canonical, aliasList] of Object.entries(aliases)) {
      const lower = canonical.toLowerCase();
      index.set(lower, lower);
      for (const alias of aliasList) {
        index.set(alias.toLowerCase(), lower);
      }
    }
    aliasIndexCache.set(aliases, index);
  }
  return index;
}

function getStemIndex(aliases: SkillAliases): Map<string, string> {
  let index = stemIndexCache.get(aliases);
  if (!index) {
    index = new Map();
    for (const [key, canonical] of getAliasIndex(aliases)) {
      const stemmed = stem(key);
      // First writer wins so aliasing collisions stay deterministic across runs.
      if (!index.has(stemmed)) {
        index.set(stemmed, canonical);
      }
    }
    stemIndexCache.set(aliases, index);
  }
  return index;
}

export interface NormalizeSkillOptions {
  /** Fall back to stemmed/fuzzy matching when the exact alias lookup misses. Default: false. */
  fuzzy?: boolean;
  /** Passed through to fuzzyEqual when fuzzy fallback is enabled. */
  maxDistance?: number;
}

export function normalizeSkill(
  skill: string,
  aliases: SkillAliases,
  options?: NormalizeSkillOptions
): string {
  const normalized = skill.trim().toLowerCase();
  const exact = getAliasIndex(aliases).get(normalized);
  if (exact) {
    return exact;
  }
  if (!options?.fuzzy) {
    return normalized;
  }

  const stemmed = stem(normalized);
  const stemIndex = getStemIndex(aliases);
  const stemHit = stemIndex.get(stemmed);
  if (stemHit) {
    return stemHit;
  }

  // Bounded fuzzy scan of alias keys, stem-first to skip obviously distant candidates
  // before paying for Levenshtein.
  for (const [key, canonical] of stemIndex) {
    if (fuzzyEqual(stemmed, key, { maxDistance: options.maxDistance })) {
      return canonical;
    }
  }
  return normalized;
}

export function normalizeSkills(
  skills: string[],
  aliases: SkillAliases,
  options?: NormalizeSkillOptions
): string[] {
  return unique(skills.map((skill) => normalizeSkill(skill, aliases, options)));
}

export function skillMatched(
  candidate: string,
  targetSkills: Set<string>,
  aliases: SkillAliases,
  options?: NormalizeSkillOptions
): boolean {
  const normalizedCandidate = normalizeSkill(candidate, aliases, options);
  return targetSkills.has(normalizedCandidate);
}

/** Derive a flat canonical->aliases map from a keyword registry (back-compat with SkillAliases). */
export function deriveSkillAliases(registry: KeywordRegistry): SkillAliases {
  const aliases: SkillAliases = {};
  for (const entry of registry) {
    aliases[entry.canonical] = entry.aliases;
  }
  return aliases;
}

/** Derive a canonical->category lookup from a keyword registry. */
export function buildCategoryIndex(registry: KeywordRegistry): Map<string, KeywordCategory> {
  const index = new Map<string, KeywordCategory>();
  for (const entry of registry) {
    index.set(entry.canonical.toLowerCase(), entry.category);
  }
  return index;
}

/** Merge two registries by canonical term; entries in `overrides` win. */
export function mergeKeywordRegistries(base: KeywordRegistry, overrides: KeywordRegistry): KeywordRegistry {
  const byCanonical = new Map<string, KeywordRegistry[number]>();
  for (const entry of base) byCanonical.set(entry.canonical.toLowerCase(), entry);
  for (const entry of overrides) byCanonical.set(entry.canonical.toLowerCase(), entry);
  return [...byCanonical.values()];
}
