/**
 * Integration test against a real two-column PDF resume.
 * Exercises the full extractTextFromPDF → parseResume pipeline
 * without mocking pdfjs-dist.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeAll } from "vitest";
import { extractTextFromPDF } from "../src/pdf/index";
import { parseResume } from "../src/core/parser/resume.parser";
import type { ParsedResume } from "../src/types/parser";

const FIXTURES = join(__dirname, "fixtures");

const minimalConfig = {
  skillAliases: {},
  profile: { name: "test", mandatorySkills: [], optionalSkills: [], minExperience: 0 },
  rules: [],
  weights: { skills: 0.25, experience: 0.25, keywords: 0.25, education: 0.25, normalizedTotal: 1 },
  keywordDensity: { min: 0.0025, max: 0.04, overusePenalty: 5 },
  sectionPenalties: { missingSummary: 4, missingExperience: 10, missingSkills: 8, missingEducation: 6 },
  allowPartialMatches: true,
} as any;

const expected = JSON.parse(
  readFileSync(join(FIXTURES, "PranavRaut2026.expected.json"), "utf8")
);

describe("real PDF — PranavRaut2026 (two-column layout)", () => {
  let resumeText: string;
  let parsed: ParsedResume;

  beforeAll(async () => {
    // readFileSync returns Buffer; pdfjs-dist requires Uint8Array
    const buf = readFileSync(join(FIXTURES, "PranavRaut2026.pdf"));
    resumeText = await extractTextFromPDF(new Uint8Array(buf));
    parsed = parseResume(resumeText, minimalConfig);
  });

  it("extracts non-empty text with line breaks", () => {
    expect(resumeText.length).toBeGreaterThan(500);
    expect(resumeText).toContain("\n");
  });

  it("contains expected text snippets", () => {
    for (const snippet of expected.textSnippets) {
      expect(resumeText).toContain(snippet);
    }
  });

  it("detects all major resume sections", () => {
    for (const section of expected.detectedSections) {
      expect(parsed.detectedSections).toContain(section);
    }
    // A well-extracted PDF must not trigger the "no line breaks" warning
    expect(parsed.warnings.some((w: string) => w.includes("no line breaks"))).toBe(false);
  });

  it("extracts expected skills", () => {
    const normalizedSkills = parsed.skills.map((s: string) => s.toLowerCase());
    for (const skill of expected.skills) {
      expect(normalizedSkills).toContain(skill);
    }
  });

  it("parses at least the expected years of experience", () => {
    expect(parsed.totalExperienceYears).toBeGreaterThanOrEqual(
      expected.totalExperienceYearsMin
    );
  });
});
