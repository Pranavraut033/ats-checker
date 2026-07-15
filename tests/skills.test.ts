import { describe, it, expect } from "vitest";

import {
  normalizeSkill,
  normalizeSkills,
  skillMatched,
  deriveSkillAliases,
  buildCategoryIndex,
  mergeKeywordRegistries,
} from "../src/utils/skills";

import type { KeywordRegistry, SkillAliases } from "../src/types/config";

describe("normalizeSkill", () => {
  const aliases: SkillAliases = {
    javascript: ["js", "ecmascript"],
    node: ["node.js", "nodejs"],
  };

  it("resolves an alias to its canonical term", () => {
    expect(normalizeSkill("JS", aliases)).toBe("javascript");
    expect(normalizeSkill("Node.js", aliases)).toBe("node");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(normalizeSkill("  ECMAScript  ", aliases)).toBe("javascript");
  });

  it("passes through an unknown term unchanged (lowercased)", () => {
    expect(normalizeSkill("Python", aliases)).toBe("python");
  });

  it("does not collapse two distinct canonical terms into each other", () => {
    expect(normalizeSkill("javascript", aliases)).toBe("javascript");
    expect(normalizeSkill("node", aliases)).toBe("node");
  });

  it("caches the alias index per object so a fresh object recomputes correctly", () => {
    const aliasesA: SkillAliases = { react: ["reactjs"] };
    const aliasesB: SkillAliases = { vue: ["vuejs"] };
    expect(normalizeSkill("reactjs", aliasesA)).toBe("react");
    expect(normalizeSkill("vuejs", aliasesB)).toBe("vue");
    // aliasesA's index must not leak into aliasesB's lookup
    expect(normalizeSkill("reactjs", aliasesB)).toBe("reactjs");
  });
});

describe("normalizeSkill fuzzy fallback (opt-in)", () => {
  const aliases: SkillAliases = { react: ["reactjs"], python: [] };

  it("is off by default: an unknown near-variant passes through unchanged", () => {
    expect(normalizeSkill("developing", aliases)).toBe("developing");
  });

  it("matches a stemmed word-form variant when fuzzy is enabled", () => {
    // "developing" has no alias entry at all; stem/fuzzy only helps when the
    // stemmed/near form actually resolves to a known alias key.
    const devAliases: SkillAliases = { develop: ["developing", "developed"] };
    expect(normalizeSkill("develops", devAliases, { fuzzy: true })).toBe(
      "develop"
    );
  });

  it("matches a typo'd variant via bounded fuzzy distance when enabled", () => {
    expect(normalizeSkill("reactjss", aliases, { fuzzy: true })).toBe("react");
  });

  it("still resolves exact/alias matches first without touching fuzzy logic", () => {
    expect(normalizeSkill("ReactJS", aliases, { fuzzy: true })).toBe("react");
  });

  it("falls through to the lowercased input when nothing fuzzy-matches either", () => {
    expect(normalizeSkill("kubernetes", aliases, { fuzzy: true })).toBe(
      "kubernetes"
    );
  });
});

describe("normalizeSkills", () => {
  const aliases: SkillAliases = { javascript: ["js"] };

  it("normalizes and de-duplicates a list", () => {
    expect(
      normalizeSkills(["JS", "javascript", "JavaScript"], aliases)
    ).toEqual(["javascript"]);
  });
});

describe("skillMatched", () => {
  const aliases: SkillAliases = { javascript: ["js"] };

  it("matches a candidate against a target set via its canonical form", () => {
    const targets = new Set(["javascript", "python"]);
    expect(skillMatched("JS", targets, aliases)).toBe(true);
    expect(skillMatched("ruby", targets, aliases)).toBe(false);
  });
});

describe("deriveSkillAliases / buildCategoryIndex", () => {
  const registry: KeywordRegistry = [
    { canonical: "javascript", aliases: ["js"], category: "technical" },
    { canonical: "docker", aliases: ["containerization"], category: "tool" },
  ];

  it("derives a flat canonical->aliases map", () => {
    expect(deriveSkillAliases(registry)).toEqual({
      javascript: ["js"],
      docker: ["containerization"],
    });
  });

  it("builds a lowercase canonical->category lookup", () => {
    const index = buildCategoryIndex(registry);
    expect(index.get("javascript")).toBe("technical");
    expect(index.get("docker")).toBe("tool");
    expect(index.get("missing")).toBeUndefined();
  });
});

describe("mergeKeywordRegistries", () => {
  it("lets override entries replace base entries with the same canonical term", () => {
    const base: KeywordRegistry = [
      { canonical: "javascript", aliases: ["js"], category: "technical" },
    ];
    const overrides: KeywordRegistry = [
      {
        canonical: "javascript",
        aliases: ["ecmascript"],
        category: "technical",
      },
    ];

    const merged = mergeKeywordRegistries(base, overrides);
    expect(merged).toEqual([
      {
        canonical: "javascript",
        aliases: ["ecmascript"],
        category: "technical",
      },
    ]);
  });

  it("keeps base entries that have no override", () => {
    const base: KeywordRegistry = [
      { canonical: "docker", aliases: [], category: "tool" },
    ];
    const overrides: KeywordRegistry = [
      { canonical: "javascript", aliases: ["js"], category: "technical" },
    ];

    const merged = mergeKeywordRegistries(base, overrides);
    expect(merged).toHaveLength(2);
    expect(merged.map((e) => e.canonical).sort()).toEqual([
      "docker",
      "javascript",
    ]);
  });
});
