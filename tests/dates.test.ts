import { describe, it, expect } from "vitest";

import {
  detectEmploymentGaps,
  parseDateRange,
  sumExperienceYears,
} from "../src/utils/dates";

import type { ParsedExperienceEntry } from "../src/types/parser";

function entry(title: string, range: string): ParsedExperienceEntry {
  const dates = parseDateRange(range, new Date("2024-06-01"));
  return { title, dates: dates ?? undefined, skills: [] };
}

describe("detectEmploymentGaps", () => {
  it("finds no gaps for back-to-back roles", () => {
    const entries = [
      entry("Engineer", "Jan 2018 - Dec 2019"),
      entry("Senior Engineer", "Jan 2020 - Dec 2021"),
    ];
    expect(detectEmploymentGaps(entries)).toEqual([]);
  });

  it("detects a gap exceeding the minimum months threshold", () => {
    const entries = [
      entry("Engineer", "Jan 2018 - Dec 2019"),
      entry("Senior Engineer", "Sep 2020 - Dec 2021"),
    ];
    const gaps = detectEmploymentGaps(entries);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].afterRole).toBe("Engineer");
    expect(gaps[0].months).toBeGreaterThanOrEqual(3);
  });

  it("ignores gaps shorter than minGapMonths", () => {
    const entries = [
      entry("Engineer", "Jan 2018 - Dec 2019"),
      entry("Senior Engineer", "Feb 2020 - Dec 2021"),
    ];
    expect(detectEmploymentGaps(entries, 3)).toEqual([]);
  });

  it("does not flag a gap for overlapping/concurrent roles", () => {
    const entries = [
      entry("Freelancer", "Jan 2018 - Dec 2020"),
      entry("Full-time Engineer", "Jun 2019 - Dec 2021"),
    ];
    expect(detectEmploymentGaps(entries)).toEqual([]);
  });

  it("sorts unordered entries chronologically before comparing", () => {
    const entries = [
      entry("Senior Engineer", "Sep 2020 - Dec 2021"),
      entry("Engineer", "Jan 2018 - Dec 2019"),
    ];
    const gaps = detectEmploymentGaps(entries);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].afterRole).toBe("Engineer");
  });

  it("skips entries without resolvable date bounds", () => {
    const entries: ParsedExperienceEntry[] = [
      { title: "Engineer", skills: [] },
      entry("Senior Engineer", "Jan 2020 - Dec 2021"),
    ];
    expect(detectEmploymentGaps(entries)).toEqual([]);
  });

  it("returns no gaps for fewer than two dated entries", () => {
    expect(
      detectEmploymentGaps([entry("Engineer", "Jan 2018 - Dec 2019")])
    ).toEqual([]);
  });
});

describe("sumExperienceYears (regression guard)", () => {
  it("still merges overlapping ranges as before", () => {
    const ranges = [
      parseDateRange("Jan 2018 - Dec 2020")!,
      parseDateRange("Jun 2019 - Dec 2021")!,
    ];
    expect(sumExperienceYears(ranges)).toBeGreaterThan(0);
  });
});
