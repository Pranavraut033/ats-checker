import { describe, it, expect } from "vitest";

import { parseResume } from "../src/core/parser/resume.parser";
import { resolveConfig } from "../src/core/scoring/weights";

import type { ResolvedATSConfig } from "../src/types/config";

describe("resume parser section detection", () => {
  const minimalConfig = {
    skillAliases: {},
    profile: {
      name: "test",
      mandatorySkills: [],
      optionalSkills: [],
      minExperience: 0,
    },
    rules: [],
    weights: {
      skills: 0.25,
      experience: 0.25,
      keywords: 0.25,
      education: 0.25,
      normalizedTotal: 1,
    },
    keywordDensity: { min: 0.0025, max: 0.04, overusePenalty: 5 },
    sectionPenalties: {
      missingSummary: 4,
      missingExperience: 10,
      missingSkills: 8,
      missingEducation: 6,
    },
    allowPartialMatches: true,
  } as unknown as ResolvedATSConfig;

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
    expect(parsed.warnings.some((w) => w.includes("no line breaks"))).toBe(
      true
    );
  });

  it("warns when almost no text was extracted (likely scanned PDF)", () => {
    const parsed = parseResume("short", minimalConfig);
    expect(parsed.warnings.some((w) => w.includes("scanned/image PDF"))).toBe(
      true
    );
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
    expect(parsed.skills).toEqual(
      expect.arrayContaining(["javascript", "react", "typescript"])
    );
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
    expect(
      parsed.warnings.some((w) => w.includes("No email address detected"))
    ).toBe(false);
  });

  it("broadened title detection matches non-engineering roles (Designer, Recruiter, Accountant)", () => {
    const resume = `Experience\nDesigner\nSome Studio, 2020 - 2022`;
    const parsed = parseResume(resume, minimalConfig);
    expect(parsed.jobTitles).toContain("designer");
  });
});

describe("resume parser — robust section headers", () => {
  const minimalConfig = resolveConfig({});

  it("matches a header with a trailing date range (WORK HISTORY 2015-2024)", () => {
    const resume = `Summary\nEngineer.\nSkills\nJavaScript\nWORK HISTORY 2015-2024\nEngineer (2015 - 2024)\nEducation\nB.S.`;
    const parsed = parseResume(resume, minimalConfig);
    expect(parsed.detectedSections).toContain("experience");
  });

  it("matches a header with a trailing em-dash (Professional Experience —)", () => {
    const resume = `Summary\nEngineer.\nSkills\nJavaScript\nProfessional Experience —\nEngineer (2020 - Present)\nEducation\nB.S.`;
    const parsed = parseResume(resume, minimalConfig);
    expect(parsed.detectedSections).toContain("experience");
  });

  it("matches an all-caps header with trailing colon punctuation", () => {
    const resume = `Summary\nEngineer.\nSkills\nJavaScript\nEXPERIENCE:\nEngineer (2020 - Present)\nEducation\nB.S.`;
    const parsed = parseResume(resume, minimalConfig);
    expect(parsed.detectedSections).toContain("experience");
  });

  it("does not match a sentence that merely starts with a header word as a section header", () => {
    const resume = `Summary\nSkills to bring to the table include collaboration and curiosity.\nExperience\nEngineer (2020 - Present)\nEducation\nB.S.`;
    const parsed = parseResume(resume, minimalConfig);
    // The "Skills to bring..." sentence should stay folded into the summary body, not be
    // (mis)detected as a "skills" section header.
    expect(parsed.detectedSections).not.toContain("skills");
  });
});

describe("resume parser — whole-document skill extraction", () => {
  const config = resolveConfig({});

  it("detects skills mentioned only in experience bullets, not just a dedicated Skills section", () => {
    const resume = `Summary\nBackend engineer.\nExperience\nSenior Engineer (2020 - Present)\nBuilt services in Python and deployed with Docker.\nEducation\nB.S.`;
    const parsed = parseResume(resume, config);
    expect(parsed.skills).toEqual(expect.arrayContaining(["python", "docker"]));
  });

  it("detects skills mentioned in the summary section", () => {
    const resume = `Summary\nExperienced with React and PostgreSQL.\nExperience\nEngineer (2020 - Present)\nEducation\nB.S.`;
    const parsed = parseResume(resume, config);
    expect(parsed.skills).toEqual(
      expect.arrayContaining(["react", "postgresql"])
    );
  });

  it("populates per-role skills on each experience entry", () => {
    const resume = `Summary\nEngineer.\nExperience\nSenior Engineer (2020 - Present)\nBuilt services in Python and deployed with Docker.\nEducation\nB.S.`;
    const parsed = parseResume(resume, config);
    const entry = parsed.experience.find((e) => e.title === "Senior Engineer");
    expect(entry?.skills).toEqual(expect.arrayContaining(["python", "docker"]));
  });
});

describe("resume parser — contact extraction", () => {
  const config = resolveConfig({});

  it("extracts email, phone, LinkedIn, and a best-effort location", () => {
    const resume = `Jane Doe\nSan Francisco, CA\njane.doe@example.com | +1 415-555-0134\nlinkedin.com/in/janedoe\n\nSummary\nEngineer.\nSkills\nJavaScript\nExperience\nEngineer (2020 - Present)\nEducation\nB.S.`;
    const parsed = parseResume(resume, config);
    expect(parsed.contact?.email).toBe("jane.doe@example.com");
    expect(parsed.contact?.phone).toBeTruthy();
    expect(parsed.contact?.linkedin).toContain("linkedin.com/in/janedoe");
    expect(parsed.contact?.location).toBe("San Francisco, CA");
  });
});

describe("resume parser — seniority and employment gaps", () => {
  const config = resolveConfig({});

  it("infers overall seniority from job titles", () => {
    const resume = `Summary\nEngineer.\nSkills\nJavaScript\nExperience\nSenior Engineer (2020 - Present)\nEducation\nB.S.`;
    const parsed = parseResume(resume, config);
    expect(parsed.seniority).toBe("senior");
  });

  it("detects an employment gap of more than 3 months between two dated roles", () => {
    const resume = `Summary\nEngineer.\nSkills\nJavaScript\nExperience\nEngineer (Jan 2018 - Dec 2019)\nSenior Engineer (Sep 2020 - Dec 2021)\nEducation\nB.S.`;
    const parsed = parseResume(resume, {
      ...config,
      referenceDate: new Date("2024-06-01"),
    });
    expect(parsed.employmentGaps.length).toBeGreaterThan(0);
    expect(parsed.employmentGaps[0].months).toBeGreaterThanOrEqual(3);
  });
});

describe("resume parser — formatting signals", () => {
  const config = resolveConfig({});

  it("populates resume.formatting from detectFormatting", () => {
    const resume = `Summary\nEngineer.\nSkills | JavaScript | React\nExperience\nEngineer (2020 - Present) | Team | Impact\nEducation\nB.S.`;
    const parsed = parseResume(resume, config);
    expect(parsed.formatting.hasTables).toBe(true);
    expect(typeof parsed.formatting.contactParseable).toBe("boolean");
  });
});
