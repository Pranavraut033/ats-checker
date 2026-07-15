import { describe, it, expect } from "vitest";
import { detectFormatting, tokenize } from "../src/utils/text";

describe("detectFormatting", () => {
  it("detects pipe/tab table structures via hasTables", () => {
    const raw = "Skill | Level | Years\nJavaScript | Expert | 5\nPython | Advanced | 3";
    expect(detectFormatting(raw).hasTables).toBe(true);
  });

  it("does not flag a normal prose resume as having tables", () => {
    const raw = "Summary\nExperienced software engineer with a passion for building products.\nSkills\nJavaScript, Python, SQL";
    expect(detectFormatting(raw).hasTables).toBe(false);
  });

  it("flags wide, irregular whitespace gaps as multi-column", () => {
    const raw = [
      "Experience Section          Skills Section",
      "Software Engineer          JavaScript, Python",
      "2018 - 2021                 SQL, Docker",
    ].join("\n");
    expect(detectFormatting(raw).hasMultiColumn).toBe(true);
  });

  it("does not flag normal single-column text as multi-column", () => {
    const raw = "Software Engineer\nBuilt scalable backend services using Node.js and PostgreSQL.";
    expect(detectFormatting(raw).hasMultiColumn).toBe(false);
  });

  it("detects a plausible email as contactParseable", () => {
    expect(detectFormatting("Contact: jane.doe@example.com").contactParseable).toBe(true);
    expect(detectFormatting("No contact info here").contactParseable).toBe(false);
  });

  it("flags non-standard bullet glyphs", () => {
    const raw = "➤ Led a team of five engineers\n➤ Shipped three major releases\n➤ Owned the roadmap";
    expect(detectFormatting(raw).nonStandardBullets).toBe(true);
  });

  it("does not flag standard bullets as non-standard", () => {
    const raw = "- Led a team of five engineers\n- Shipped three major releases\n* Owned the roadmap";
    expect(detectFormatting(raw).nonStandardBullets).toBe(false);
  });

  it("flags sparse/garbled text as likely scanned", () => {
    const raw = "   \n\n \t  \n ##  ";
    expect(detectFormatting(raw).likelyScanned).toBe(true);
  });

  it("does not flag a normal resume as likely scanned", () => {
    const raw = "Experienced software engineer with over five years building web applications using React and Node.js.";
    expect(detectFormatting(raw).likelyScanned).toBe(false);
  });

  it("does not flag ordinary hyphenated tech tokens as special characters", () => {
    const raw = "Full-stack engineer skilled in CI/CD and full-text search.";
    expect(detectFormatting(raw).hasSpecialChars).toBe(false);
  });

  it("flags private-use-area / replacement characters as special", () => {
    const raw = `Led the team � to deliver on time`;
    expect(detectFormatting(raw).hasSpecialChars).toBe(true);
  });
});

describe("tokenize stem option", () => {
  it("keeps existing behavior by default (no stemming)", () => {
    expect(tokenize("developing developed developer")).toEqual(["developing", "developed", "developer"]);
  });

  it("stems tokens when opted in", () => {
    const stemmed = tokenize("developing developed develops", { stem: true });
    expect(new Set(stemmed).size).toBe(1);
  });
});
