import { describe, it, expect } from "vitest";

import { stem, fuzzyEqual, levenshteinDistance } from "../src/utils/match";

describe("stem", () => {
  it("collapses common verb inflections to the same stem", () => {
    expect(stem("developing")).toBe(stem("develop"));
    expect(stem("developed")).toBe(stem("develop"));
    expect(stem("develops")).toBe(stem("develop"));
  });

  it("collapses plural nouns to their singular stem", () => {
    expect(stem("managers")).toBe(stem("manager"));
    expect(stem("companies")).toBe(stem("company"));
  });

  it("strips -tion/-ation derivational suffixes", () => {
    expect(stem("organization")).toBe(stem("organize"));
    expect(stem("automation")).toBe(stem("automate"));
  });

  it("is idempotent-ish for already-short/base words", () => {
    expect(stem("lead")).toBe("lead");
    expect(stem("the")).toBe("the");
  });

  it("is case-insensitive", () => {
    expect(stem("Developing")).toBe(stem("developing"));
  });
});

describe("levenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("react", "react", 2)).toBe(0);
  });

  it("computes edit distance within budget", () => {
    expect(levenshteinDistance("kitten", "sitting", 5)).toBe(3);
  });

  it("short-circuits above maxDistance", () => {
    expect(levenshteinDistance("abcdef", "zyxwvu", 1)).toBeGreaterThan(1);
  });
});

describe("fuzzyEqual", () => {
  it("matches exact equal strings", () => {
    expect(fuzzyEqual("react", "react")).toBe(true);
  });

  it("matches near-variants like ReactJS vs react within default threshold", () => {
    expect(fuzzyEqual("reactjs", "react", { maxDistance: 2 })).toBe(true);
  });

  it("matches a common typo within a short word's default threshold (<=6 chars => maxDistance 1)", () => {
    expect(fuzzyEqual("pyton", "python")).toBe(true); // distance 1 (missing "h"), default threshold 1
    expect(fuzzyEqual("reakt", "react")).toBe(true); // distance 1, short word default threshold 1
  });

  it("rejects unrelated strings", () => {
    expect(fuzzyEqual("python", "javascript")).toBe(false);
  });

  it("returns false for empty strings against non-empty", () => {
    expect(fuzzyEqual("", "react")).toBe(false);
  });

  it("respects an explicit maxDistance override", () => {
    expect(fuzzyEqual("kubernetes", "kubernete", { maxDistance: 1 })).toBe(
      true
    );
    expect(fuzzyEqual("kubernetes", "kuber", { maxDistance: 1 })).toBe(false);
  });
});
