import { describe, it, expect } from "vitest";
import { SuggestionEngine } from "../src/core/suggestions/suggestion.engine";
import { calculateScore } from "../src/core/scoring/scorer";
import { parseResume } from "../src/core/parser/resume.parser";
import { parseJobDescription } from "../src/core/parser/jd.parser";
import { resolveConfig } from "../src/core/scoring/weights";

// Empty profile so the default profile's own skills don't confound these fixtures.
const config = resolveConfig({
  profile: { name: "none", mandatorySkills: [], optionalSkills: [], minExperience: 0 },
});
const engine = new SuggestionEngine();

function generate(resume: ReturnType<typeof parseResume>, job: ReturnType<typeof parseJobDescription>) {
  const score = calculateScore(resume, job, config);
  return engine.generate({ resume, job, score, ruleWarnings: [], config }).suggestions;
}

describe("SuggestionEngine", () => {
  it("suggests highlighting missing required skills and incorporating missing keywords", () => {
    const resume = parseResume(`Summary\nEngineer.\nSkills\nJavaScript\nExperience\nEngineer (2022 - Present)\nEducation\nB.S.`, config);
    const job = parseJobDescription("Requirements: react.", config);

    expect(generate(resume, job)).toEqual([
      "Highlight these required skills: react",
      "Incorporate job-specific keywords: react",
      "Strengthen bullet points with impact verbs (led, built, improved, delivered).",
      "Add a clearly formatted email address near the top of your resume so ATS and recruiters can contact you.",
    ]);
  });

  it("suggests education credentials only when educationScore is exactly 0", () => {
    const resume = parseResume(`Summary\nEngineer.\nSkills\nJavaScript\nExperience\nEngineer (2022 - Present)\nEducation\nB.S.`, config);

    const jobNoEdu = parseJobDescription("Need an engineer.", config);
    expect(generate(resume, jobNoEdu).some((s) => s.includes("education credentials"))).toBe(false);

    const jobPhd = parseJobDescription("Must have PhD degree.", config);
    expect(generate(resume, jobPhd)).toContain("State your education credentials matching: phd");
  });

  it("flags weak verbs and weak achievement bullets together", () => {
    const resume = parseResume(`Experience\nEngineer (2022 - Present)\nPerformed code reviews.`, config);
    const job = parseJobDescription("Requirements: react.", config);

    const suggestions = generate(resume, job);
    expect(suggestions).toContain('Replace weak verbs (performed) with stronger ones (e.g. led, built, optimized).');
    expect(suggestions).toContain(
      'Strengthen "Performed code reviews." — add scope/metrics, e.g. "Built and maintained scalable services handling 500k+ requests/day."'
    );
  });

  it("flags a likely multi-column layout when sections fail to parse from long raw text", () => {
    const resume = parseResume("x".repeat(310), config); // no recognizable section headers
    const job = parseJobDescription("Need an engineer.", config);

    expect(resume.detectedSections.length).toBeLessThan(2);
    expect(generate(resume, job)).toContain(
      "Your resume may use a multi-column layout. Export as a single-column PDF or paste plain text — most ATS systems and this parser work best with a linear layout."
    );
  });

  it("does not flag multi-column layout when raw text is short, even with no sections", () => {
    const resume = parseResume("short text", config);
    const job = parseJobDescription("Need an engineer.", config);

    expect(resume.raw.trim().length).toBeLessThan(300);
    expect(generate(resume, job).some((s) => s.includes("multi-column"))).toBe(false);
  });
});
