# ATS Checker

Zero-dependency TypeScript library that scores a resume against a job description and explains why — skills coverage, keyword overlap, experience match, and education — with no randomness, no LLM, and no external calls.

## Quick Start

```bash
npm install @pranavraut033/ats-checker
```

```typescript
import { analyzeResume } from "@pranavraut033/ats-checker";

const result = analyzeResume({
  resumeText: `
    Software Engineer with 5 years of experience.
    Skills: JavaScript, TypeScript, React, Node.js, SQL
    Experience: Senior Engineer at ExampleCorp (Jan 2020 - Present)
    Education: B.S. Computer Science
  `,
  jobDescription: `
    Frontend engineer role. Must have React, TypeScript, accessibility best practices.
    Preferred: GraphQL. 3+ years required. Bachelor's degree required.
  `,
  config: { referenceDate: "2026-01-01" }, // freeze clock for reproducible scores
});

console.log(result.score); // e.g. 72.45
console.log(result.matchedSkills); // ["javascript", "node", "react", "typescript"]
console.log(result.missingSkills); // ["accessibility best practices", "graphql"]
console.log(result.experienceGap); // 0 (requirement met)
console.log(result.suggestions); // ["Add GraphQL to your skills section", ...]
```

## Features

- **Deterministic** — same input always produces the same score; pin it with `referenceDate` to freeze "Present" date math
- **Explainable** — breakdown by category plus matched and missing skill/keyword lists
- **Categorized keywords** — every keyword/alias belongs to a category (technical, tool, concept, soft, marketing, domain)
- **Weighted keyword scoring** — JD keywords weighted by location (required > preferred > body) and frequency
- **Alias-aware & achievement suggestions** — reword suggestions matching the JD's wording, plus strong/weak achievement-bullet feedback
- **Multi-language keyword packs** — `/en` and `/de` subpaths; bring your own via `config.keywordRegistry`
- **Language proficiency matching** — JD spoken-language requirements (CEFR `A1`–`C2` or words like "fluent"/"native") matched against resume mentions
- **Configurable** — adjust weights, add skill aliases or a keyword registry, define custom penalty rules
- **Deterministic-only core** — `analyzeResumeAsync` (LLM path) is deprecated; `analyzeResume` is the primary API
- **Zero dependencies** — no runtime deps; ships ESM + CJS
- **PDF input** — optional `/pdf` subpath for extracting text from PDF resumes

## Live Demo

**[Launch Demo →](https://pranavraut033.github.io/ats-checker/)**

## Output Reference

`analyzeResume()` returns an `ATSAnalysisResult`:

| Field                   | Type                                          | Description                                                              |
| ----------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| `score`                 | `number`                                      | Overall ATS score 0–100 after rule penalties                             |
| `breakdown`             | `ATSBreakdown`                                | Sub-scores: `skills`, `experience`, `keywords`, `education`              |
| `matchedSkills`         | `string[]`                                    | Required skills found in the resume                                      |
| `missingSkills`         | `string[]`                                    | Required skills absent from the resume                                   |
| `matchedKeywords`       | `string[]`                                    | JD keywords present in the resume (sorted)                               |
| `missingKeywords`       | `string[]`                                    | JD keywords absent from the resume (sorted)                              |
| `overusedKeywords`      | `string[]`                                    | Keywords exceeding density threshold (sorted)                            |
| `keywordsByCategory`    | `Record<KeywordCategory, {matched, missing}>` | Matched/missing keywords grouped by category                             |
| `keywordWeights`        | `KeywordWeight[]`                             | Per-keyword JD importance (`jdWeight`) and resume usage (`resumeWeight`) |
| `achievementStrength`   | `{ strong: number; weak: number }`            | Count of resume bullets classified strong vs weak                        |
| `matchedLanguages`      | `ParsedLanguage[]`                            | JD-required languages the resume meets or exceeds in proficiency         |
| `missingLanguages`      | `ParsedLanguage[]`                            | JD-required languages absent or below the required proficiency           |
| `suggestions`           | `string[]`                                    | Deterministic improvement recommendations                                |
| `warnings`              | `string[]`                                    | Parse warnings and section alerts                                        |
| `experienceGap`         | `number`                                      | Years below JD minimum; `0` when met                                     |
| `detectedSections`      | `string[]`                                    | Resume sections the parser found                                         |
| `parsedExperienceYears` | `number`                                      | Total years from resume date ranges                                      |

**Scoring formula:**  
`score = skills×0.30 + experience×0.30 + keywords×0.25 + education×0.15` → clamped to 0–100 → rule penalties subtracted. The `keywords` sub-score is a weighted coverage ratio — see [Configuration](configuration.md#keyword-registry--categories) for how weights are derived.

## Documentation

- **[Architecture](architecture.md)** — pipeline internals and module map
- **[Configuration](configuration.md)** — all config options with defaults
- **[Rules Engine](rules.md)** — built-in rules and custom rule API
- **[LLM Integration (deprecated)](llm-integration.md)** — `analyzeResumeAsync` reference

## API Reference

### `analyzeResume(input): ATSAnalysisResult`

**Input:**

| Field            | Type        | Required | Description             |
| ---------------- | ----------- | -------- | ----------------------- |
| `resumeText`     | `string`    | ✅       | Full text of the resume |
| `jobDescription` | `string`    | ✅       | Job description text    |
| `config`         | `ATSConfig` | —        | Optional configuration  |

### `extractTextFromPDF(data): Promise<string>`

Extracts plain text from a PDF buffer. Import from the `/pdf` subpath; requires `pdfjs-dist` installed separately.

```typescript
import { extractTextFromPDF } from "@pranavraut033/ats-checker/pdf";

const resumeText = await extractTextFromPDF(uint8ArrayOrArrayBuffer);
```

| Parameter | Type                        | Description   |
| --------- | --------------------------- | ------------- |
| `data`    | `Uint8Array \| ArrayBuffer` | Raw PDF bytes |

Returns a normalized string ready to pass as `resumeText`. Text-layer PDFs only.

**Multi-column layouts are handled automatically** using glyph x/y positions to detect and separate columns before joining lines. Single-column and two-column resumes both parse cleanly.

For PDFs that can't be recovered (scanned/image resumes with no text layer, or near-empty extractions), `analyzeResume` emits an actionable message in `result.warnings`:

```typescript
const result = analyzeResume({ resumeText, jobDescription: "..." });
if (result.warnings.length) {
  console.warn(result.warnings);
  // e.g. "Almost no text was extracted — the resume may be a scanned/image PDF."
}
```

If section detection still fails after extraction (fewer than 2 sections found in a long document), a suggestion is also added to `result.suggestions` advising the user to export as single-column PDF.

### Built-in Profiles

```typescript
import {
  softwareEngineerProfile,
  dataScientistProfile,
  productManagerProfile,
  defaultSkillAliases,
  defaultKeywordRegistry,
} from "@pranavraut033/ats-checker";
```

### Multi-language Keyword Packs

```typescript
import en from "@pranavraut033/ats-checker/en"; // default registry
import de from "@pranavraut033/ats-checker/de"; // seed set, German aliases

const result = analyzeResume({
  resumeText,
  jobDescription,
  config: { keywordRegistry: de },
});
```

See [Configuration → Keyword Registry & Categories](configuration.md#keyword-registry--categories).

### Language Requirements

Spoken-language requirements (not programming languages) are parsed from the JD — CEFR codes (`A1`–`C2`) or words like `fluent`/`native`/`professional` — and matched against language mentions in the resume.

```typescript
const result = analyzeResume({
  resumeText: "Languages: German (C1)",
  jobDescription: "German (B2) required.",
});
result.matchedLanguages; // [{ name: "german", level: "b2", levelRank: 4 }]
result.missingLanguages; // []
```

See [Configuration → Language Requirements](configuration.md#language-requirements).

## Development

```bash
npm install
npm run build       # tsup → ESM + CJS in dist/
npm test            # vitest (single pass)
npm run type-check  # tsc --noEmit
npm run dev         # static demo UI at http://localhost:3005
```

---

Made with ❤️ by [Pranav Raut](https://github.com/Pranavraut033)
