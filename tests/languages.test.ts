import { describe, expect, it } from "vitest";

import { analyzeResume } from "../src/index";
import { parseLanguageMentions } from "../src/utils/languages";

describe("language proficiency parsing", () => {
  it("parses CEFR levels and descriptive proficiency words", () => {
    const found = parseLanguageMentions(
      "Languages: German (C1), fluent Spanish, native English speaker"
    );
    expect(found).toEqual([
      { name: "english", level: "native", levelRank: 6 },
      { name: "german", level: "c1", levelRank: 5 },
      { name: "spanish", level: "fluent", levelRank: 5 },
    ]);
  });

  it("flags a required language missing from the resume", () => {
    const result = analyzeResume({
      resumeText:
        "Summary: Software engineer.\nSkills: javascript\nExperience:\nEngineer at Foo (2020 - 2022)\nEducation: BS CS",
      jobDescription:
        "Must have JavaScript. German (B2) required for this role.",
    });
    expect(result.missingLanguages).toEqual([
      { name: "german", level: "b2", levelRank: 4 },
    ]);
    expect(result.suggestions.some((s) => s.includes("german"))).toBe(true);
  });

  it("matches when resume proficiency meets or exceeds the requirement", () => {
    const result = analyzeResume({
      resumeText:
        "Summary: Engineer.\nSkills: javascript\nLanguages: German (C1)\nExperience:\nEngineer at Foo (2020 - 2022)\nEducation: BS CS",
      jobDescription: "German (B2) required.",
    });
    expect(result.missingLanguages).toEqual([]);
    expect(result.matchedLanguages).toEqual([
      { name: "german", level: "b2", levelRank: 4 },
    ]);
  });

  it("ranks German descriptive proficiency words against English ones", () => {
    const found = parseLanguageMentions(
      "German: fließend, English (elementary)"
    );
    expect(found).toEqual([
      { name: "english", level: "elementary", levelRank: 1 },
      { name: "german", level: "fließend", levelRank: 5 },
    ]);
  });

  it("ranks French descriptive proficiency words against English ones", () => {
    const found = parseLanguageMentions(
      "French: courant, native English speaker"
    );
    expect(found).toEqual([
      { name: "english", level: "native", levelRank: 6 },
      { name: "french", level: "courant", levelRank: 5 },
    ]);
  });
});
