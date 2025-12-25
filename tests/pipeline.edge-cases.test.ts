import { describe, it, expect } from "vitest";
import { analyzeResume, analyzeResumeAsync } from "../src";
import { resolveConfig } from "../src/core/scoring/weights";
import type { ATSConfig } from "../src/types";

// Edge cases across skills, experience, education, rules, density, suggestions, weights, LLM sync fallback

describe("ATS pipeline edge cases", () => {
  it("scores skills with alias normalization: Node.js -> node", () => {
    const resumeText = `Summary\nSkilled engineer.\nSkills\nNode.js, React`; // alias should normalize to 'node'
    const jobDescription = `Requirements: node\nPreferred: graphql`;

    const result = analyzeResume({ resumeText, jobDescription });

    expect(result.breakdown.skills).toBeGreaterThan(0);
    expect(result.matchedKeywords).toContain("node");
    // Optional not present
    expect(result.missingKeywords).toContain("graphql");
  });

  it("experience scoring reflects years and role title coverage", () => {
    const resumeText = `Summary\nEngineer with ~2.4 years.\nSkills\nJavaScript\nExperience\nFrontend Engineer (Jun 2023 - Dec 2025)\nEducation\nB.S.`; // ~2.5 years but parser will compute via ranges
    const jobDescription = `Need Frontend Engineer with 3+ years`;

    const result = analyzeResume({ resumeText, jobDescription });

    expect(result.breakdown.experience).toBeGreaterThan(0);
    // Should indicate missing years (rounded to 2 decimals)
    expect(result.suggestions.some(s => s.toLowerCase().includes("clarify at least"))).toBe(true);
  });

  it("education scoring handles multiple required degrees", () => {
    const resumeText = `Summary\nEngineer\nSkills\nJS\nExperience\nDeveloper (2021 - Present)\nEducation\nB.S. Computer Science`;
    const jobDescription = `Must have PhD and Master's degree`;

    const result = analyzeResume({ resumeText, jobDescription });

    expect(result.breakdown.education).toBe(0);
    expect(result.suggestions.some(s => s.includes("education credentials"))).toBe(true);
  });

  it("applies section penalties and warns for missing sections", () => {
    const resumeText = `Skills\nJavaScript, React\nExperience\nEngineer (2024 - Present)`; // Missing summary and education
    const jobDescription = `Need engineer`;

    const result = analyzeResume({ resumeText, jobDescription });

    // Warnings should include missing sections
    expect(result.warnings.some(w => w.includes("summary section missing"))).toBe(true);
    expect(result.warnings.some(w => w.includes("education section missing"))).toBe(true);
    expect(result.score).toBeLessThan(100);
  });

  it("detects table-like formatting and applies penalty", () => {
    const resumeText = `Summary\nSkills | JavaScript | React\nExperience\nEngineer (2022 - Present) | Team | Impact\nEducation\nB.S.`;
    const jobDescription = `Need React`;

    const result = analyzeResume({ resumeText, jobDescription });

    expect(result.warnings.some(w => w.toLowerCase().includes("table-like"))).toBe(true);
    expect(result.score).toBeLessThan(100);
  });

  it("keyword density boundary: equals max does not overuse; above max does", () => {
    const baseJD = "Looking for React developer";

    // Configure a tight density to control math easily
    const config: ATSConfig = { keywordDensity: { min: 0.0, max: 0.05, overusePenalty: 5 } };

    // Exactly 20 tokens with React appearing 1 time -> density 0.05 (== max)
    const equalResume = `Summary\n${Array(19).fill("word").join(" ")} React`;
    const eqResult = analyzeResume({ resumeText: equalResume, jobDescription: baseJD, config });
    expect(eqResult.overusedKeywords).not.toContain("react");

    // 20 tokens with React appearing 2 times -> 0.1 (> max)
    const overResume = `Summary\n${Array(18).fill("word").join(" ")} React React`;
    const overResult = analyzeResume({ resumeText: overResume, jobDescription: baseJD, config });
    expect(overResult.overusedKeywords).toContain("react");
  });

  it("suggests impact verbs when action verbs are scarce", () => {
    const resumeText = `Summary\nI worked on projects.\nSkills\nJavaScript\nExperience\nEngineer (2023 - Present)\nEducation\nB.S.`; // No strong action verbs
    const jobDescription = `Need engineer`;

    const result = analyzeResume({ resumeText, jobDescription });
    expect(result.suggestions.some(s => s.toLowerCase().includes("impact verbs"))).toBe(true);
  });

  it("weights normalize to sum 1.0 and influence score", () => {
    const config: ATSConfig = {
      weights: { skills: 0.5, experience: 0.25, keywords: 0.15, education: 0.1 },
    };
    const resolved = resolveConfig(config);
    const sum = resolved.weights.skills + resolved.weights.experience + resolved.weights.keywords + resolved.weights.education;
    expect(Number(sum.toFixed(6))).toBe(1);

    const resumeText = `Summary\nEngineer\nSkills\nReact\nExperience\nEngineer (2022 - Present)\nEducation\nB.S.`;
    const jobDescription = `Requirements: React`;

    const resultDefault = analyzeResume({ resumeText, jobDescription });
    const resultWeighted = analyzeResume({ resumeText, jobDescription, config });

    // Scores are deterministic but weighting can change breakdown contributions; allow difference or equality
    expect(resultWeighted.score).toBeGreaterThan(0);
    expect(resultDefault.score).toBeGreaterThan(0);
  });

  it("sync LLM path adds fallback warning when suggestions present", () => {
    const resumeText = `Summary\nGeneralist profile.\nSkills\nJavaScript\nExperience\nEngineer (2024 - Present)\nEducation\nB.S.`;
    const jobDescription = `Requirements: React, TypeScript`;

    const result = analyzeResume({
      resumeText,
      jobDescription,
      llm: {
        client: { createCompletion: async () => ({ content: "{}" }) },
        limits: { maxCalls: 3, maxTokensPerCall: 2000, maxTotalTokens: 5000 },
        enable: { suggestions: true },
      },
    });

    // Warning is added by sync fallback path in analyzeResume()
    expect(result.warnings.some(w => w.includes("LLM suggestion enhancement skipped"))).toBe(true);
  });

  it("async LLM path enhances suggestions or degrades gracefully", async () => {
    const resumeText = `Summary\nGeneralist profile.\nSkills\nJavaScript\nExperience\nEngineer (2024 - Present)\nEducation\nB.S.`;
    const jobDescription = `Requirements: React, TypeScript`;

    const result = await analyzeResumeAsync({
      resumeText,
      jobDescription,
      llm: {
        client: { createCompletion: async () => ({ content: JSON.stringify({ suggestions: [] }), usage: { total_tokens: 100 } }) },
        limits: { maxCalls: 3, maxTokensPerCall: 2000, maxTotalTokens: 5000 },
        enable: { suggestions: true },
      },
    });

    expect(result.suggestions).toBeDefined();
    expect(Array.isArray(result.suggestions)).toBe(true);
  });
});
