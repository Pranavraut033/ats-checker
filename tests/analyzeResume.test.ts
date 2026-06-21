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

    expect(result.score).toBe(48.44);
    expect(result.breakdown.skills).toBeCloseTo(50, 5);
    expect(result.breakdown.experience).toBe(75);
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
    expect(result.score).toBe(68);
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
});
