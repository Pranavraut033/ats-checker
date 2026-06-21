import { describe, it, expect } from "vitest";
import { analyzeResume } from "../src";
import { parseResume } from "../src/core/parser/resume.parser";
import { resolveConfig } from "../src/core/scoring/weights";

describe("keyword weighting", () => {
  it("a missing required keyword drops the score more than a missing body-only keyword", () => {
    const resumeWithBoth = `Summary\nEngineer.\nSkills\nJavaScript\nExperience\nEngineer (2022 - Present)\nEducation\nB.S.`;

    const missingRequired = analyzeResume({
      resumeText: resumeWithBoth,
      jobDescription: `Requirements: javascript, react. The team values a positive workplace.`,
    });
    const missingBodyOnly = analyzeResume({
      resumeText: resumeWithBoth,
      jobDescription: `Requirements: javascript. The team values a positive workplace and great culture.`,
    });

    expect(missingRequired.missingKeywords).toContain("react");
    expect(missingRequired.breakdown.keywords).toBeLessThan(missingBodyOnly.breakdown.keywords);
  });
});

describe("keyword categorization", () => {
  it("buckets matched/missing keywords into predefined categories", () => {
    const resumeText = `Summary\nEngineer.\nSkills\nJavaScript, Docker\nExperience\nEngineer (2022 - Present)\nEducation\nB.S.`;
    const jobDescription = `Requirements: javascript, docker, accessibility, communication`;

    const result = analyzeResume({ resumeText, jobDescription });

    expect(result.keywordsByCategory.technical.matched).toContain("javascript");
    expect(result.keywordsByCategory.tool.matched).toContain("docker");
    expect(result.keywordsByCategory.concept.missing).toContain("accessibility");
    expect(result.keywordsByCategory.soft.missing).toContain("communication");
  });
});

describe("alias-aware suggestions", () => {
  it("suggests replacing 'js' with the job description's 'JavaScript' wording", () => {
    const resumeText = `Summary\nDeveloper.\nSkills\nJS\nExperience\nEngineer (2022 - Present)\nEducation\nB.S.`;
    const jobDescription = `We need a JavaScript developer.`;

    const result = analyzeResume({ resumeText, jobDescription });

    expect(result.suggestions.some((s) => s.includes('Replace "js" with "JavaScript"'))).toBe(true);
  });
});

describe("weak verb suggestions", () => {
  it("flags weak verbs and suggests stronger alternatives", () => {
    const resumeText = `Summary\nWorked on stuff.\nSkills\nJavaScript\nExperience\nEngineer (2022 - Present) - Worked with Node.js and helped the team.\nEducation\nB.S.`;
    const jobDescription = `Need a JavaScript engineer.`;

    const result = analyzeResume({ resumeText, jobDescription });

    expect(result.suggestions.some((s) => s.includes("weak verbs"))).toBe(true);
  });
});

describe("achievement statement strength", () => {
  const config = resolveConfig({});

  it("classifies a metric-free, weak-verb bullet as weak", () => {
    const resume = `Experience\nEngineer (2022 - Present)\nWorked with Node.js and TypeScript.`;
    const parsed = parseResume(resume, config);
    const bullet = parsed.achievements.find((a) => a.text.includes("Worked with Node.js"));
    expect(bullet?.strength).toBe("weak");
  });

  it("classifies a strong-verb + quantified-impact bullet as strong", () => {
    const resume = `Experience\nEngineer (2022 - Present)\nBuilt and maintained scalable Node.js microservices handling 500k+ API requests per day.`;
    const parsed = parseResume(resume, config);
    const bullet = parsed.achievements.find((a) => a.text.includes("500k+"));
    expect(bullet?.strength).toBe("strong");
  });

  it("a weak achievement bullet triggers a rewrite suggestion", () => {
    const resumeText = `Summary\nEngineer.\nSkills\nJavaScript\nExperience\nEngineer (2022 - Present)\nPerformed code reviews.\nEducation\nB.S.`;
    const jobDescription = `Need a JavaScript engineer.`;

    const result = analyzeResume({ resumeText, jobDescription });

    expect(result.suggestions.some((s) => s.includes("Strengthen") && s.includes("add scope/metrics"))).toBe(true);
  });
});
