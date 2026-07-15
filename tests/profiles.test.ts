import { describe, it, expect } from "vitest";
import { defaultKeywordRegistry, defaultProfiles } from "../src/profiles";
import { deriveSkillAliases, buildCategoryIndex } from "../src/utils/skills";
import type { KeywordCategory } from "../src/types/config";
import deRegistry from "../src/lang/de";
import enRegistry from "../src/lang/en";

const VALID_CATEGORIES: KeywordCategory[] = ["technical", "tool", "concept", "soft", "marketing", "domain"];

describe("defaultKeywordRegistry", () => {
  it("has at least 400 canonical entries", () => {
    expect(defaultKeywordRegistry.length).toBeGreaterThanOrEqual(400);
  });

  it("has no duplicate canonical terms (case-insensitive)", () => {
    const seen = new Map<string, number>();
    for (const entry of defaultKeywordRegistry) {
      const key = entry.canonical.toLowerCase();
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    const dups = [...seen.entries()].filter(([, count]) => count > 1);
    expect(dups).toEqual([]);
  });

  it("does not contain the 'auditin g' typo", () => {
    const canonicals = defaultKeywordRegistry.map((e) => e.canonical.toLowerCase());
    expect(canonicals).not.toContain("auditin g");
    expect(canonicals).toContain("auditing");
  });

  it("every entry has a valid category", () => {
    for (const entry of defaultKeywordRegistry) {
      expect(VALID_CATEGORIES).toContain(entry.category);
    }
  });

  it("covers all six categories with a meaningful number of entries", () => {
    const counts: Record<string, number> = {};
    for (const entry of defaultKeywordRegistry) {
      counts[entry.category] = (counts[entry.category] ?? 0) + 1;
    }
    for (const category of VALID_CATEGORIES) {
      expect(counts[category] ?? 0).toBeGreaterThan(10);
    }
  });

  it("derives skill aliases and a category index without throwing", () => {
    const aliases = deriveSkillAliases(defaultKeywordRegistry);
    const categoryIndex = buildCategoryIndex(defaultKeywordRegistry);
    expect(Object.keys(aliases).length).toBe(defaultKeywordRegistry.length);
    expect(categoryIndex.size).toBe(defaultKeywordRegistry.length);
  });

  it("the en language pack re-exports the default registry", () => {
    expect(enRegistry).toBe(defaultKeywordRegistry);
  });
});

describe("de language pack", () => {
  it("does not contain the 'auditin g' typo and has a meaningful set of entries", () => {
    const canonicals = deRegistry.map((e) => e.canonical.toLowerCase());
    expect(canonicals).not.toContain("auditin g");
    expect(canonicals).toContain("auditing");
    expect(deRegistry.length).toBeGreaterThanOrEqual(60);
  });

  it("has no duplicate canonical terms", () => {
    const seen = new Map<string, number>();
    for (const entry of deRegistry) {
      const key = entry.canonical.toLowerCase();
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    const dups = [...seen.entries()].filter(([, count]) => count > 1);
    expect(dups).toEqual([]);
  });

  it("every entry has a valid category and canonical terms stay English (no de-only canonicals)", () => {
    const enCanonicals = new Set(defaultKeywordRegistry.map((e) => e.canonical.toLowerCase()));
    for (const entry of deRegistry) {
      expect(VALID_CATEGORIES).toContain(entry.category);
      expect(enCanonicals.has(entry.canonical.toLowerCase())).toBe(true);
    }
  });

  it("builds a category index without throwing", () => {
    expect(() => buildCategoryIndex(deRegistry)).not.toThrow();
    expect(() => deriveSkillAliases(deRegistry)).not.toThrow();
  });
});

describe("defaultProfiles", () => {
  it("every mandatory/optional skill resolves to a valid registry canonical", () => {
    const canonicals = new Set(defaultKeywordRegistry.map((e) => e.canonical.toLowerCase()));
    for (const profile of defaultProfiles) {
      for (const skill of [...profile.mandatorySkills, ...profile.optionalSkills]) {
        expect(canonicals.has(skill.toLowerCase())).toBe(true);
      }
    }
  });
});
