import { describe, it, expect } from "vitest";

import { parseJobDescription } from "../src/core/parser/jd.parser";
import { parseResume } from "../src/core/parser/resume.parser";
import { RuleEngine } from "../src/core/rules/rule.engine";
import { resolveConfig } from "../src/core/scoring/weights";

const config = resolveConfig({});

function buildInput(resumeText: string, jobDescription = "Need an engineer") {
  return {
    resume: parseResume(resumeText, config),
    job: parseJobDescription(jobDescription, config),
  };
}

describe("RuleEngine", () => {
  it("penalizes each missing required section with its configured weight", () => {
    const engine = new RuleEngine(config);
    // Only "experience" is present; summary/skills/education are missing.
    const { resume, job } = buildInput(`Experience\nEngineer (2022 - Present)`);

    const result = engine.evaluate({ resume, job });

    expect(result.warnings).toContain(
      `summary section missing (penalty ${config.sectionPenalties.missingSummary})`
    );
    expect(result.warnings).toContain(
      `skills section missing (penalty ${config.sectionPenalties.missingSkills})`
    );
    expect(result.warnings).toContain(
      `education section missing (penalty ${config.sectionPenalties.missingEducation})`
    );
    // Sections present (experience) cost nothing; only the three missing ones do.
    expect(result.totalPenalty).toBe(
      config.sectionPenalties.missingSummary +
        config.sectionPenalties.missingSkills +
        config.sectionPenalties.missingEducation +
        5 // "few recognizable sections" penalty (only 1 of 4 detected)
    );
  });

  it("applies no section penalty when all four required sections are present", () => {
    const engine = new RuleEngine(config);
    const { resume, job } = buildInput(
      `Summary\nEngineer.\nSkills\nJavaScript\nExperience\nEngineer (2022 - Present)\nEducation\nB.S.`
    );

    const result = engine.evaluate({ resume, job });

    expect(result.warnings.some((w) => w.includes("section missing"))).toBe(
      false
    );
    expect(result.totalPenalty).toBe(0);
  });

  it("penalizes table-like formatting and keyword stuffing independently", () => {
    const engine = new RuleEngine(config);
    const { resume, job } = buildInput(
      `Summary\nSkills\nJavaScript | React | Node\nExperience\nEngineer (2022 - Present) | Team | Impact\nEducation\nB.S.`
    );

    const result = engine.evaluate({
      resume,
      job,
      overusedKeywords: ["react", "javascript"],
    });

    expect(result.warnings).toContain(
      "Detected table-like or columnar formatting (penalty 8)"
    );
    const expectedStuffingPenalty = 2 * config.keywordDensity.overusePenalty;
    expect(result.warnings).toContain(
      `Keyword stuffing detected for: react, javascript (penalty ${expectedStuffingPenalty})`
    );
    expect(result.totalPenalty).toBe(8 + expectedStuffingPenalty);
  });

  it("custom rule only penalizes when its condition is true", () => {
    const { resume, job } = buildInput(
      `Summary\nEngineer.\nSkills\nJavaScript\nExperience\nIntern, 2024\nEducation\nB.S.`
    );

    const passingEngine = new RuleEngine(
      resolveConfig({
        rules: [
          {
            id: "junior",
            penalty: 12,
            warning: "Too junior",
            condition: (ctx) => ctx.resume.totalExperienceYears < 1,
          },
        ],
      })
    );
    const failingEngine = new RuleEngine(
      resolveConfig({
        rules: [
          {
            id: "senior",
            penalty: 12,
            warning: "Not senior enough",
            condition: (ctx) => ctx.resume.totalExperienceYears > 10,
          },
        ],
      })
    );

    const passingResult = passingEngine.evaluate({ resume, job });
    const failingResult = failingEngine.evaluate({ resume, job });

    expect(passingResult.warnings).toContain("Too junior");
    expect(failingResult.warnings).not.toContain("Not senior enough");
    expect(passingResult.totalPenalty - failingResult.totalPenalty).toBe(12);
  });
});
