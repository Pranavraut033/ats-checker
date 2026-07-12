import { analyzeResume } from "../src";
import { ATSConfig } from "../src/types";

describe("ats-checker analyzeResume", () => {
  const resumeText = `Summary
Full-stack engineer with 5 years building web apps.
Skills
JavaScript, TypeScript, React, Node.js, SQL
Experience
Senior Engineer at ExampleCorp (Jan 2020 - Present) - Built React apps and APIs.
Education
B.S. Computer Science`;

  const jobDescription = `We need a frontend engineer. Requirements: React, TypeScript, accessibility best practices.
Preferred: GraphQL. Must have 3+ years experience. Bachelor's degree required.`;

  it("produces a balanced score and identifies missing keywords", () => {
    const result = analyzeResume({
      resumeText,
      jobDescription,
      config: { referenceDate: "2026-01-01" },
    });

    expect(result.score).toBe(55.94);
    expect(result.breakdown.skills).toBeCloseTo(50, 5);
    expect(result.breakdown.experience).toBe(100);
    expect(result.breakdown.keywords).toBe(43.75);
    expect(result.breakdown.education).toBe(100);
    expect(result.matchedKeywords).toContain("react");
    expect(result.missingKeywords).toContain("accessibility");
    expect(result.suggestions.some((suggestion) => suggestion.includes("keywords"))).toBe(true);
  });

  it("flags keyword stuffing when density is high", () => {
    const stuffedResume = `Summary
React React React React React React React React React React React React React React React React React React React React
Skills
React, JavaScript, HTML, CSS
Experience
Frontend Developer (2021 - Present)
Education
B.S. Computer Science`;

    const result = analyzeResume({
      resumeText: stuffedResume,
      jobDescription: "Looking for React developer with JavaScript experience.",
      config: { referenceDate: "2026-01-01" },
    });

    expect(result.overusedKeywords).toEqual(["react"]);
    expect(result.score).toBe(75.5);
    expect(result.warnings).toContain("Keyword stuffing detected for: react (penalty 5)");
    expect(result.suggestions.some((suggestion) => suggestion.includes("stuffing"))).toBe(true);
  });

  it("applies custom rules provided via config", () => {
    const config: ATSConfig = {
      rules: [
        {
          id: "min-experience",
          penalty: 12,
          warning: "Clarify experience duration",
          condition: (ctx) => ctx.resume.totalExperienceYears < 1,
        },
      ],
    };

    const juniorResume = `Summary
Entry-level developer.
Skills
JavaScript
Experience
Intern, 2024
Education
B.S. Computer Science`;

    const result = analyzeResume({
      resumeText: juniorResume,
      jobDescription: "Junior developer role, JavaScript",
      config,
    });

    expect(result.warnings).toContain("Clarify experience duration");
    expect(result.score).toBe(23.25);
  });

  it("broadened role vocabulary + per-skill experience gaps + missing-email warning (UX Designer)", () => {
    const uxResumeText = `Summary
UX Designer with a focus on user research and interaction design.
Skills
Figma, Sketch, User Research
Experience
Designer
PixelCraft Studio, 2023 - Present
Redesigned onboarding flow and improved signup completion by 18%.
Education
B.S. Design`;

    const uxJobDescription = `We are hiring a UX Designer. Must have 5+ years of Figma experience.`;

    const result = analyzeResume({
      resumeText: uxResumeText,
      jobDescription: uxJobDescription,
      config: {
        referenceDate: "2026-01-01",
        // Empty profile so the default software-engineer profile's mandatory/optional
        // skills don't confound this fixture (mirrors the pattern used elsewhere).
        profile: { name: "none", mandatorySkills: [], optionalSkills: [], minExperience: 0 },
      },
    });

    // (a) #1/#2 fix: "designer" is now a shared role noun on both the JD and resume sides
    // (resume title line "Designer" is on its own line, so it's captured — unlike the
    // title+date-combined-on-one-line fixtures elsewhere in this suite), so the 25%-weighted
    // role component now contributes instead of silently scoring 0.
    // years component alone would be 46.2 (0.616 coverage * 75); +25 role component = 71.2.
    expect(result.breakdown.experience).toBe(71.2);

    // (b) #3: JD asks for "5+ years of Figma"; resume has figma but only ~3.08 years of
    // total experience, so it surfaces as an informational gap (does not affect score/breakdown).
    expect(result.skillExperienceGaps).toEqual([
      { skill: "figma", requiredYears: 5, resumeYears: 3.08 },
    ]);
    expect(
      result.suggestions.some((s) => s.includes("5+ years of figma"))
    ).toBe(true);

    // (c) #4: no email anywhere in the resume text -> parseability warning + suggestion.
    expect(result.warnings).toContain(
      "No email address detected — most ATS require a parseable contact email"
    );
    expect(
      result.suggestions.some((s) => s.includes("email address"))
    ).toBe(true);
  });
});
