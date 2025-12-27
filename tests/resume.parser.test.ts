import { describe, it, expect } from "vitest";
import { parseResume } from "../src/core/parser/resume.parser";

describe("resume parser section detection", () => {
  it("detects headers with colon and different casing", () => {
    const resume = `SUMMARY:\nSoftware engineer.\nSkills:\nJavaScript, React\nWork Experience:\nEngineer (2020 - Present)\nEducation:\nB.S.`;
    const parsed = parseResume(resume, {
      // minimal resolved config shape for parser
      skillAliases: {},
      profile: { name: "test", mandatorySkills: [], optionalSkills: [], minExperience: 0 },
      rules: [],
      weights: { skills: 0.25, experience: 0.25, keywords: 0.25, education: 0.25, normalizedTotal: 1 },
      keywordDensity: { min: 0.0025, max: 0.04, overusePenalty: 5 },
      sectionPenalties: { missingSummary: 4, missingExperience: 10, missingSkills: 8, missingEducation: 6 },
      allowPartialMatches: true,
    } as any);

    expect(parsed.detectedSections).toContain("summary");
    expect(parsed.detectedSections).toContain("skills");
    expect(parsed.detectedSections).toContain("experience");
    expect(parsed.detectedSections).toContain("education");
  });

  it("matches common aliases like 'work experience' to experience", () => {
    const resume = `Work Experience\nSenior Dev (2019 - Present)`;
    const parsed = parseResume(resume, {
      skillAliases: {},
      profile: { name: "test", mandatorySkills: [], optionalSkills: [], minExperience: 0 },
      rules: [],
      weights: { skills: 0.25, experience: 0.25, keywords: 0.25, education: 0.25, normalizedTotal: 1 },
      keywordDensity: { min: 0.0025, max: 0.04, overusePenalty: 5 },
      sectionPenalties: { missingSummary: 4, missingExperience: 10, missingSkills: 8, missingEducation: 6 },
      allowPartialMatches: true,
    } as any);

    expect(parsed.detectedSections).toContain("experience");
  });
});
