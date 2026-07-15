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
    // v2 experience sub-weights: years 0.65, title-coverage 0.20, seniority 0.15.
    // ~4.02 actual / 10 required = ~0.402 coverage * 0.65 weight = ~26.15; no role keywords ->
    // full role credit (+20); both sides' seniority unknown -> met=true (+15) = ~61.52.
    const job = parseJobDescription("Must have 10+ years experience.", config);
    expect(calculateScore(resume, job, config).breakdown.experience).toBeCloseTo(61.52, 5);
  });

  it("no experience requirement in the JD scores 100 regardless of resume", () => {
    const job = parseJobDescription("Need an engineer.", config);
    expect(calculateScore(resume, job, config).breakdown.experience).toBe(100);
  });
});

describe("calculateScore — skillExperienceGaps (informational only, never feeds score/breakdown)", () => {
  it("flags a gap when the resume has the skill but falls short of the required years", () => {
    const job = parseJobDescription("Must have 5+ years of Figma experience.", config);
    // v2: per-skill years come from per-role dating (entry.skills + entry.dates), not overall
    // tenure — so the skill must actually appear in a dated role's bullet text, not just the
    // Skills section, to be attributed any years here.
    const resume = parseResume(
      `Summary\nDesigner.\nSkills\nFigma\nExperience\nDesigner (2024 - Present)\nDesigned interfaces using Figma.\nEducation\nB.S.`,
      config
    );
    const result = calculateScore(resume, job, config);
    expect(result.skillExperienceGaps).toEqual([
      { skill: "figma", requiredYears: 5, resumeYears: 2.08 },
    ]);
    // Informational only: the gap reflects a shortfall in years, but the resume *does* have
    // the required skill itself, so skills coverage (and thus the weighted score) is unaffected
    // by the gap — it comes from a separate breakdown component entirely.
    expect(result.breakdown.skills).toBe(100);
  });

  it("does not flag a gap when the skill is missing from the resume entirely", () => {
    const job = parseJobDescription("Must have 5+ years of Figma experience.", config);
    const resume = parseResume(
      `Summary\nDesigner.\nSkills\nSketch\nExperience\nDesigner (2024 - Present)\nEducation\nB.S.`,
      config
    );
    expect(calculateScore(resume, job, config).skillExperienceGaps).toEqual([]);
  });

  it("does not flag a gap when the resume already meets the required years", () => {
    const job = parseJobDescription("Must have 1+ years of Figma experience.", config);
    const resume = parseResume(
      `Summary\nDesigner.\nSkills\nFigma\nExperience\nDesigner (2020 - Present)\nDesigned interfaces using Figma.\nEducation\nB.S.`,
      config
    );
    expect(calculateScore(resume, job, config).skillExperienceGaps).toEqual([]);
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
