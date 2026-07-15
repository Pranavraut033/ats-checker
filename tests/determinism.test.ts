/**
 * Determinism tests — same input must always produce the same output.
 * Golden values were captured after the determinism fixes and serve as regression pins.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

import { analyzeResume } from "../src";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const RESUME_WITH_PRESENT = `Summary
Full-stack engineer with 5 years building web apps.
Skills
JavaScript, TypeScript, React, Node.js, SQL
Experience
Senior Engineer at ExampleCorp (Jan 2020 - Present) - Built React apps and APIs.
Education
B.S. Computer Science`;

const JD_FRONTEND = `We need a frontend engineer. Requirements: React, TypeScript, accessibility best practices.
Preferred: GraphQL. Must have 3+ years experience. Bachelor's degree required.`;

const RESUME_NO_PRESENT = `Summary
Backend engineer.
Skills
Python, SQL, Docker
Experience
Software Engineer (Jan 2019 - Dec 2022)
Education
B.S. Computer Science`;

const JD_BACKEND = `Backend engineer role. Must have Python and SQL experience. Docker preferred. 3+ years required.`;

const REFERENCE_DATE = "2026-01-01";

// ---------------------------------------------------------------------------
// 1. Same-input-twice idempotency
// ---------------------------------------------------------------------------

describe("determinism — same input yields identical output", () => {
  it("produces the same result when called twice with a fixed referenceDate", () => {
    const input = {
      resumeText: RESUME_WITH_PRESENT,
      jobDescription: JD_FRONTEND,
      config: { referenceDate: REFERENCE_DATE },
    };
    const a = analyzeResume(input);
    const b = analyzeResume(input);
    expect(a).toEqual(b);
  });

  it("produces the same result for a resume without open-ended dates", () => {
    const input = { resumeText: RESUME_NO_PRESENT, jobDescription: JD_BACKEND };
    const a = analyzeResume(input);
    const b = analyzeResume(input);
    expect(a).toEqual(b);
  });

  it("output keyword arrays are sorted (not insertion-order-dependent)", () => {
    const result = analyzeResume({
      resumeText: RESUME_NO_PRESENT,
      jobDescription: JD_BACKEND,
    });
    const sortedMatched = [...result.matchedKeywords].sort();
    const sortedMissing = [...result.missingKeywords].sort();
    expect(result.matchedKeywords).toEqual(sortedMatched);
    expect(result.missingKeywords).toEqual(sortedMissing);
  });
});

// ---------------------------------------------------------------------------
// 2. Clock independence — "Present" must not drift when date advances
// ---------------------------------------------------------------------------

describe("determinism — clock-independent experience scoring", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("scores identically with a fixed referenceDate regardless of system clock", () => {
    const input = {
      resumeText: RESUME_WITH_PRESENT,
      jobDescription: JD_FRONTEND,
      config: { referenceDate: REFERENCE_DATE },
    };

    // First run with real time
    const resultA = analyzeResume(input);

    // Advance system clock by 2 years
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2028-06-01"));
    const resultB = analyzeResume(input);
    vi.useRealTimers();

    expect(resultA.score).toEqual(resultB.score);
    expect(resultA.breakdown).toEqual(resultB.breakdown);
    expect(resultA.matchedKeywords).toEqual(resultB.matchedKeywords);
    expect(resultA.missingKeywords).toEqual(resultB.missingKeywords);
  });

  it("experience score changes when referenceDate changes (sanity check)", () => {
    const baseInput = {
      resumeText: RESUME_WITH_PRESENT,
      jobDescription: JD_FRONTEND,
    };

    const early = analyzeResume({
      ...baseInput,
      config: { referenceDate: "2021-01-01" },
    });
    const later = analyzeResume({
      ...baseInput,
      config: { referenceDate: "2026-01-01" },
    });

    // 5 more years of experience must strictly raise the experience score
    expect(later.breakdown.experience).toBeGreaterThan(
      early.breakdown.experience
    );
    // v2 experience sub-weights (years 0.65, title-coverage 0.20, seniority 0.15) replace v1's
    // years 0.75 / role 0.25 split, shifting the "early" (short-of-required-years) value.
    expect(early.breakdown.experience).toBeCloseTo(58.4, 5);
    expect(later.breakdown.experience).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// 3. Tokenizer — tech tokens preserved correctly
// ---------------------------------------------------------------------------

describe("tokenizer — tech tokens", () => {
  const techJD = `Must have: C#, Node.js, CI/CD experience. Full-stack preferred.`;
  const techResume = `Summary\nPolyglot engineer.\nSkills\nC#, Node.js\nExperience\nEngineer (2020 - 2023)\nEducation\nB.S.`;

  it("c# is recognized as a keyword (not dropped as single-char 'c')", () => {
    const result = analyzeResume({
      resumeText: techResume,
      jobDescription: techJD,
    });
    // c# should appear in matched (via alias -> csharp canonical or direct token)
    const allKeywords = [...result.matchedKeywords, ...result.missingKeywords];
    // c# or its canonical 'csharp' should be tracked, not silently absent
    expect(
      allKeywords.some((k) => k.includes("c#") || k.includes("csharp"))
    ).toBe(true);
  });

  it("alias normalization: 'js' in resume body matches 'javascript' JD keyword", () => {
    const jsResume = `Summary\nDeveloper.\nSkills\nJS, React\nExperience\nEngineer (2020 - 2023)\nEducation\nB.S.`;
    const jsJD = `Require JavaScript developer with React experience.`;
    const result = analyzeResume({
      resumeText: jsResume,
      jobDescription: jsJD,
    });
    // "javascript" should be matched, not missing
    expect(result.missingKeywords).not.toContain("javascript");
  });

  it("node and javascript are separate skills (no alias collapse)", () => {
    const bothResume = `Summary\nFull-stack.\nSkills\nJavaScript, Node.js\nExperience\nEngineer (2020 - 2023)\nEducation\nB.S.`;
    const bothJD = `Must have JavaScript and Node.js. Prefer TypeScript.`;
    const result = analyzeResume({
      resumeText: bothResume,
      jobDescription: bothJD,
    });
    // Both javascript and node should match, not collapse into one
    const matched = result.matchedKeywords;
    expect(matched).toContain("javascript");
    expect(matched).toContain("node");
  });
});

// ---------------------------------------------------------------------------
// 4. Golden snapshot — locked score for a well-defined fixture + referenceDate
// ---------------------------------------------------------------------------

describe("golden snapshot — fixed score with pinned referenceDate", () => {
  it("frontend JD vs full-stack resume: score is stable", () => {
    const result = analyzeResume({
      resumeText: RESUME_WITH_PRESENT,
      jobDescription: JD_FRONTEND,
      config: { referenceDate: REFERENCE_DATE },
    });

    // Snapshot pins the exact value; a diff here means algorithm changed
    expect(result).toMatchSnapshot();
  });

  it("backend JD vs backend resume: score is stable", () => {
    const result = analyzeResume({
      resumeText: RESUME_NO_PRESENT,
      jobDescription: JD_BACKEND,
    });
    expect(result).toMatchSnapshot();
  });
});
