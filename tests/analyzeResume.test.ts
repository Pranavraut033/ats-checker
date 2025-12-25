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
    const result = analyzeResume({ resumeText, jobDescription });

    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
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
    });

    expect(result.overusedKeywords).toContain("react");
    expect(result.score).toBeLessThan(90);
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
    expect(result.score).toBeLessThan(100);
  });
});
