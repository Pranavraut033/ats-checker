import { unique } from "./text";
import {
  KeywordCategory,
  KeywordRegistry,
  SkillAliases,
} from "../types/config";

// ponytail: Map lookup, not fuzzy match — add fuzzy only if real misses show up.
const aliasIndexCache = new WeakMap<SkillAliases, Map<string, string>>();

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

export function normalizeSkill(skill: string, aliases: SkillAliases): string {
  const normalized = skill.trim().toLowerCase();
  return getAliasIndex(aliases).get(normalized) ?? normalized;
}

export function normalizeSkills(
  skills: string[],
  aliases: SkillAliases
): string[] {
  return unique(skills.map((skill) => normalizeSkill(skill, aliases)));
}

export function skillMatched(
  candidate: string,
  targetSkills: Set<string>,
  aliases: SkillAliases
): boolean {
  const normalizedCandidate = normalizeSkill(candidate, aliases);
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
export function buildCategoryIndex(
  registry: KeywordRegistry
): Map<string, KeywordCategory> {
  const index = new Map<string, KeywordCategory>();
  for (const entry of registry) {
    index.set(entry.canonical.toLowerCase(), entry.category);
  }
  return index;
}

/** Merge two registries by canonical term; entries in `overrides` win. */
export function mergeKeywordRegistries(
  base: KeywordRegistry,
  overrides: KeywordRegistry
): KeywordRegistry {
  const byCanonical = new Map<string, KeywordRegistry[number]>();
  for (const entry of base)
    byCanonical.set(entry.canonical.toLowerCase(), entry);
  for (const entry of overrides)
    byCanonical.set(entry.canonical.toLowerCase(), entry);
  return [...byCanonical.values()];
}
