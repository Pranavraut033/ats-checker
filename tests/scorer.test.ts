import { describe, it, expect } from "vitest";
import { calculateScore } from "../src/core/scoring/scorer";
import { parseResume } from "../src/core/parser/resume.parser";
import { parseJobDescription } from "../src/core/parser/jd.parser";
import { resolveConfig } from "../src/core/scoring/weights";

// Empty profile so the default profile's own mandatory/optional skills don't
// confound these hand-checkable fixtures.
const config = resolveConfig({
  referenceDate: "2026-01-01",
  profile: { name: "none", mandatorySkills: [], optionalSkills: [], minExperience: 0 },
});

describe("calculateScore — skills (REQUIRED_SKILL_WEIGHT=0.7, OPTIONAL_SKILL_WEIGHT=0.3)", () => {
  const job = parseJobDescription("Requirements: react.\nPreferred: graphql.", config);

  it("matched required + missing optional = 0.7 * 100", () => {
    const resume = parseResume(`Summary\nEngineer.\nSkills\nReact\nExperience\nEngineer (2022 - Present)\nEducation\nB.S.`, config);
    expect(calculateScore(resume, job, config).breakdown.skills).toBe(70);
  });

  it("matched required + matched optional = 100", () => {
    const resume = parseResume(`Summary\nEngineer.\nSkills\nReact, GraphQL\nExperience\nEngineer (2022 - Present)\nEducation\nB.S.`, config);
    expect(calculateScore(resume, job, config).breakdown.skills).toBe(100);
  });

  it("matched neither = 0", () => {
    const resume = parseResume(`Summary\nEngineer.\nSkills\nJavaScript\nExperience\nEngineer (2022 - Present)\nEducation\nB.S.`, config);
    expect(calculateScore(resume, job, config).breakdown.skills).toBe(0);
  });
});

describe("calculateScore — experience (years capped at 2x coverage, role title coverage)", () => {
  const resume = parseResume(`Summary\nEngineer.\nSkills\nReact\nExperience\nEngineer (2022 - Present)\nEducation\nB.S.`, config); // 4 actual years at referenceDate 2026-01-01

  it("meeting the required years fully satisfies the years component", () => {
    const job = parseJobDescription("Must have 3+ years experience.", config);
    expect(calculateScore(resume, job, config).breakdown.experience).toBe(100);
  });

  it("falling short of required years scores proportionally", () => {
    // 4 actual / 10 required = 0.4 coverage * 0.75 weight = 30; no role keywords -> +25 = 55.6 (rounded)
    const job = parseJobDescription("Must have 10+ years experience.", config);
    expect(calculateScore(resume, job, config).breakdown.experience).toBeCloseTo(55.6, 5);
  });

  it("no experience requirement in the JD scores 100 regardless of resume", () => {
    const job = parseJobDescription("Need an engineer.", config);
    expect(calculateScore(resume, job, config).breakdown.experience).toBe(100);
  });
});

describe("calculateScore — education", () => {
  const resume = parseResume(`Summary\nEngineer.\nSkills\nReact\nExperience\nEngineer (2022 - Present)\nEducation\nB.S.`, config);

  it("no education requirement scores 100", () => {
    const job = parseJobDescription("Need an engineer.", config);
    expect(calculateScore(resume, job, config).breakdown.education).toBe(100);
  });

  it("required degree not held by the candidate scores 0", () => {
    const job = parseJobDescription("Must have PhD degree.", config);
    expect(calculateScore(resume, job, config).breakdown.education).toBe(0);
  });
});
