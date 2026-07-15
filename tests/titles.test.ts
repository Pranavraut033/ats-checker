import { describe, it, expect } from "vitest";
import { inferSeniority, normalizeTitle, titleMatch } from "../src/utils/titles";

describe("inferSeniority", () => {
  it("detects junior signals", () => {
    expect(inferSeniority(["Junior Software Engineer"])).toBe("junior");
    expect(inferSeniority(["Jr. Developer"])).toBe("junior");
  });

  it("detects senior signals", () => {
    expect(inferSeniority(["Senior Backend Engineer"])).toBe("senior");
    expect(inferSeniority(["Sr Product Manager"])).toBe("senior");
  });

  it("detects lead/staff signals", () => {
    expect(inferSeniority(["Staff Engineer"])).toBe("lead");
    expect(inferSeniority(["Engineering Lead"])).toBe("lead");
  });

  it("detects principal as the highest-ranked signal", () => {
    expect(inferSeniority(["Principal Engineer"])).toBe("principal");
  });

  it("picks the highest-ranked signal across multiple titles", () => {
    expect(inferSeniority(["Junior Developer", "Senior Developer", "Staff Engineer"])).toBe("lead");
  });

  it("returns undefined when no title carries a seniority keyword", () => {
    expect(inferSeniority(["Software Engineer"])).toBeUndefined();
  });

  it("returns undefined for an empty title list", () => {
    expect(inferSeniority([])).toBeUndefined();
  });
});

describe("normalizeTitle", () => {
  it("lowercases and strips punctuation noise", () => {
    expect(normalizeTitle("Sr. Software Engineer, Backend")).toBe("sr software engineer backend");
  });

  it("collapses repeated whitespace", () => {
    expect(normalizeTitle("Product   Manager")).toBe("product manager");
  });
});

describe("titleMatch", () => {
  it("returns 1 when all JD role keywords are covered by resume titles", () => {
    expect(titleMatch(["Senior Software Engineer"], ["engineer"])).toBe(1);
  });

  it("matches stemmed word-form variants (Developer vs Developing)", () => {
    expect(titleMatch(["Backend Developer"], ["developing"])).toBeGreaterThan(0);
  });

  it("returns a partial ratio when only some keywords match", () => {
    const ratio = titleMatch(["Product Designer"], ["designer", "manager"]);
    expect(ratio).toBeCloseTo(0.5, 5);
  });

  it("returns 0 when nothing matches", () => {
    expect(titleMatch(["Accountant"], ["engineer"])).toBe(0);
  });

  it("returns 0 for empty JD role keywords", () => {
    expect(titleMatch(["Software Engineer"], [])).toBe(0);
  });
});
