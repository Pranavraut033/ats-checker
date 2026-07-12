import { describe, it, expect } from "vitest";
import { parseJobDescription } from "../src/core/parser/jd.parser";
import { resolveConfig } from "../src/core/scoring/weights";

describe("job description parser edge cases", () => {
  const config = resolveConfig({});

  it("does not flag a plainly-mentioned language as required", () => {
    const jd = `We collaborate closely with our Berlin and Tokyo offices on this project.`;
    const parsed = parseJobDescription(jd, config);
    expect(parsed.requiredLanguages).toHaveLength(0);
  });

  it("flags a language as required when given an explicit level requirement", () => {
    const jd = `Languages: German (B2) required.`;
    const parsed = parseJobDescription(jd, config);
    expect(parsed.requiredLanguages.some((l) => l.name === "german")).toBe(true);
  });

  it("parses minimum experience expressed as 'yrs.' or 'Jahre'", () => {
    expect(parseJobDescription("5 yrs. of experience required", config).minExperienceYears).toBe(5);
    expect(parseJobDescription("5 Jahre Erfahrung erforderlich", config).minExperienceYears).toBe(5);
  });

  it("ignores implausible minimum experience values", () => {
    expect(parseJobDescription("97 years of experience required", config).minExperienceYears).toBeUndefined();
  });

  it("picks up Director/Consultant role keywords beyond the original list", () => {
    const parsed = parseJobDescription("Looking for an Engineering Director or Senior Consultant", config);
    expect(parsed.roleKeywords).toEqual(expect.arrayContaining(["director", "consultant"]));
  });

  it("picks up broadened role keywords beyond engineering (Designer, Recruiter, Accountant)", () => {
    const parsed = parseJobDescription(
      "We're hiring a Product Designer, a Recruiter, and a Senior Accountant.",
      config
    );
    expect(parsed.roleKeywords).toEqual(
      expect.arrayContaining(["designer", "recruiter", "accountant", "product"])
    );
  });

  it("parses 'N+ years of <skill>' requirements gated through the skill vocabulary", () => {
    const parsed = parseJobDescription("Must have 5+ years of Figma experience.", config);
    expect(parsed.skillExperienceRequirements).toEqual([{ skill: "figma", years: 5 }]);
  });

  it("parses '<skill> (N+ years)' requirements", () => {
    const parsed = parseJobDescription("React (3+ years) required.", config);
    expect(parsed.skillExperienceRequirements).toEqual([{ skill: "react", years: 3 }]);
  });

  it("does not record a skill-experience requirement for non-vocabulary words", () => {
    const parsed = parseJobDescription("Must have 5+ years of coffee brewing experience.", config);
    expect(parsed.skillExperienceRequirements).toEqual([]);
  });

  it("keeps the max requested years when a skill is mentioned with multiple durations", () => {
    const parsed = parseJobDescription(
      "3+ years of Python required. 5+ years of Python preferred.",
      config
    );
    expect(parsed.skillExperienceRequirements).toEqual([{ skill: "python", years: 5 }]);
  });
});
