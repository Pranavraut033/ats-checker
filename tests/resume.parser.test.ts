import { describe, it, expect } from "vitest";
import { parseResume } from "../src/core/parser/resume.parser";

describe("resume parser section detection", () => {
  const minimalConfig = {
    skillAliases: {},
    profile: { name: "test", mandatorySkills: [], optionalSkills: [], minExperience: 0 },
    rules: [],
    weights: { skills: 0.25, experience: 0.25, keywords: 0.25, education: 0.25, normalizedTotal: 1 },
    keywordDensity: { min: 0.0025, max: 0.04, overusePenalty: 5 },
    sectionPenalties: { missingSummary: 4, missingExperience: 10, missingSkills: 8, missingEducation: 6 },
    allowPartialMatches: true,
  } as any;

  it("detects headers with colon and different casing", () => {
    const resume = `SUMMARY:\nSoftware engineer.\nSkills:\nJavaScript, React\nWork Experience:\nEngineer (2020 - Present)\nEducation:\nB.S.`;
    const parsed = parseResume(resume, minimalConfig);
    expect(parsed.detectedSections).toContain("summary");
    expect(parsed.detectedSections).toContain("skills");
    expect(parsed.detectedSections).toContain("experience");
    expect(parsed.detectedSections).toContain("education");
  });

  it("warns when text is a single flattened blob (no line breaks)", () => {
    // Simulates a multi-column PDF that exports as one long line
    const blob = "A".repeat(500);
    const parsed = parseResume(blob, minimalConfig);
    expect(parsed.warnings.some(w => w.includes("no line breaks"))).toBe(true);
  });

  it("warns when almost no text was extracted (likely scanned PDF)", () => {
    const parsed = parseResume("short", minimalConfig);
    expect(parsed.warnings.some(w => w.includes("scanned/image PDF"))).toBe(true);
  });

  it("matches common aliases like 'work experience' to experience", () => {
    const resume = `Work Experience\nSenior Dev (2019 - Present)`;
    const parsed = parseResume(resume, minimalConfig);
    expect(parsed.detectedSections).toContain("experience");
  });

  it("detects German section headers", () => {
    const resume = `Zusammenfassung:\nSoftwareentwickler.\nFähigkeiten:\nJavaScript, React\nBerufserfahrung:\nEntwickler (2020 - heute)\nAusbildung:\nB.Sc.`;
    const parsed = parseResume(resume, minimalConfig);
    expect(parsed.detectedSections).toContain("summary");
    expect(parsed.detectedSections).toContain("skills");
    expect(parsed.detectedSections).toContain("experience");
    expect(parsed.detectedSections).toContain("education");
  });

  it("detects French section headers", () => {
    const resume = `Résumé:\nDéveloppeur logiciel.\nCompétences:\nJavaScript, React\nExpérience professionnelle:\nDéveloppeur (2020 - present)\nFormation:\nLicence`;
    const parsed = parseResume(resume, minimalConfig);
    expect(parsed.detectedSections).toContain("summary");
    expect(parsed.detectedSections).toContain("skills");
    expect(parsed.detectedSections).toContain("experience");
    expect(parsed.detectedSections).toContain("education");
  });

  it("parses skill lists using non-• bullet glyphs (▪, ·)", () => {
    const resume = `Skills:\n▪ JavaScript\n▪ React\n· TypeScript`;
    const parsed = parseResume(resume, minimalConfig);
    expect(parsed.skills).toEqual(expect.arrayContaining(["javascript", "react", "typescript"]));
  });

  it("ignores implausible 'N years' fallback values", () => {
    const resume = `Summary:\n97 years of experience.\nSkills:\nJavaScript\nExperience:\nEngineer\nEducation:\nB.S.`;
    const parsed = parseResume(resume, minimalConfig);
    expect(parsed.totalExperienceYears).toBe(0);
  });

  it("extracts a contact email and phone number when present", () => {
    const resume = `Summary\nJane Doe, jane.doe@example.com, +1 415-555-0134\nSkills\nJavaScript\nExperience\nEngineer (2020 - Present)\nEducation\nB.S.`;
    const parsed = parseResume(resume, minimalConfig);
    expect(parsed.contact?.email).toBe("jane.doe@example.com");
    expect(parsed.contact?.phone).toBeTruthy();
  });

  it("warns when no email address is detected", () => {
    const resume = `Summary\nEngineer.\nSkills\nJavaScript\nExperience\nEngineer (2020 - Present)\nEducation\nB.S.`;
    const parsed = parseResume(resume, minimalConfig);
    expect(parsed.contact?.email).toBeUndefined();
    expect(parsed.warnings).toContain(
      "No email address detected — most ATS require a parseable contact email"
    );
  });

  it("does not warn about a missing email when one is present", () => {
    const resume = `Summary\nContact: jane@example.com\nSkills\nJavaScript\nExperience\nEngineer (2020 - Present)\nEducation\nB.S.`;
    const parsed = parseResume(resume, minimalConfig);
    expect(parsed.warnings.some((w) => w.includes("No email address detected"))).toBe(false);
  });

  it("broadened title detection matches non-engineering roles (Designer, Recruiter, Accountant)", () => {
    const resume = `Experience\nDesigner\nSome Studio, 2020 - 2022`;
    const parsed = parseResume(resume, minimalConfig);
    expect(parsed.jobTitles).toContain("designer");
  });
});
