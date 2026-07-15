# @pranavraut033/ats-checker

[![npm version](https://img.shields.io/npm/v/@pranavraut033/ats-checker.svg)](https://www.npmjs.com/package/@pranavraut033/ats-checker)
[![npm downloads](https://img.shields.io/npm/dm/@pranavraut033/ats-checker.svg)](https://www.npmjs.com/package/@pranavraut033/ats-checker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://github.com/Pranavraut033/ats-checker/actions/workflows/ci.yml/badge.svg)](https://github.com/Pranavraut033/ats-checker/actions/workflows/ci.yml)
[![Build Status](https://github.com/Pranavraut033/ats-checker/actions/workflows/deploy.yml/badge.svg)](https://github.com/Pranavraut033/ats-checker/actions/workflows/deploy.yml)

Zero-dependency TypeScript library that scores a resume against a job description and explains why — skills coverage, keyword overlap, experience match, parseability, and education — with no randomness, no LLM, and no external calls.

**[Live Demo →](https://pranavraut033.github.io/ats-checker/)**  
**[Docs →](https://pranavraut033.github.io/ats-checker/docs/)**

---

## Features

- **Deterministic** — same input always produces the same score; pin it with `referenceDate` to freeze "Present" date math
- **Explainable** — breakdown by category (skills / experience / keywords / parseability / education) plus matched and missing skill/keyword lists
- **Parseability scoring** — a real-ATS-realism dimension that deducts for table/columnar formatting, multi-column layout, special/control characters, non-standard bullets, likely-scanned text, and an unparseable contact email — with the specific deductions itemized in `result.parseabilityReport`
- **Fuzzy/stem matching by default** — typos and word-form variants ("ReactJS" vs "react", "developing" vs "develop") still match; opt out via `config.matching = { fuzzy: false }` for exact-match-only behavior
- **Whole-document skill extraction** — skills mentioned in experience bullets and the summary count, not just an explicit Skills section, and each experience entry is dated per-role
- **Seniority & employment-gap awareness** — infers resume/JD seniority (`junior`–`principal`) and surfaces a capped match signal (`result.seniorityMatch`), and flags employment gaps of 3+ months between roles (`result.employmentGaps`)
- **Categorized keywords** — every keyword/alias belongs to a category (technical, tool, concept, soft, marketing, domain); results are grouped by category; 407 canonical terms ship by default
- **Weighted keyword scoring** — JD keywords are weighted by where they appear (required > preferred > body, including header-scoped `Requirements:`/`Preferred:` blocks) and how often, so a missing "required" keyword costs more than a missing body-only one
- **Alias-aware suggestions** — flags resume terms that should be reworded to match the JD's own wording (e.g. "js" → "JavaScript")
- **Achievement strength** — classifies resume experience bullets as strong/weak (verb + quantified impact) and suggests rewrites
- **Multi-language keyword packs** — `/en` and `/de` subpaths ship categorized keyword registries; install more by passing your own `keywordRegistry`
- **Language proficiency matching** — detects spoken-language requirements in the JD (CEFR `A1`–`C2` or words like "fluent"/"native") and flags resume gaps below the required level
- **Skill-experience gaps** — parses "N+ years of X" requirements from the JD and flags resume skills whose per-role dated experience (`result.perSkillExperience`) falls short
- **Contact detection** — parses email/phone/LinkedIn/location and penalizes an unparseable contact email by default (near-knockout, like a real ATS)
- **Configurable** — adjust weights, add skill aliases or a custom keyword registry, define custom penalty rules
- **Zero dependencies** — core library has no runtime deps (fuzzy/stem matching is hand-rolled); ships ESM + CJS
- **PDF input** — optional `/pdf` subpath extracts resume text from a PDF buffer (requires `pdfjs-dist` peer dep)
- **Built-in profiles** — software engineer, data scientist, product manager out of the box

---

## Requirements

- Node.js ≥ 18

---

## Installation

```bash
npm install @pranavraut033/ats-checker
```

---

## Usage

```typescript
import { analyzeResume } from "@pranavraut033/ats-checker";

const result = analyzeResume({
  resumeText: `
    Software Engineer with 5 years of experience.
    Skills
    JavaScript, TypeScript, React, Node.js, SQL
    Experience
    Senior Engineer at ExampleCorp (Jan 2020 - Present)
    Education
    B.S. Computer Science
  `,
  jobDescription: `
    Frontend engineer role. Must have React, TypeScript, accessibility best practices.
    Preferred: GraphQL. 3+ years required. Bachelor's degree required.
  `,
  config: { referenceDate: "2026-01-01" }, // freeze clock for reproducible scores
});

console.log(result.score); // 39.44
console.log(result.matchedSkills); // ["javascript", "node", "react", "typescript"]
console.log(result.missingSkills); // ["accessibility", "frontend", "graphql"]
console.log(result.experienceGap); // 0 (requirement met)
console.log(result.suggestions); // ["Highlight these required skills: accessibility, frontend, graphql", ...]
```

---

## Output

`analyzeResume()` returns an `ATSAnalysisResult`:

| Field                   | Type                                          | Description                                                                                                                                          |
| ----------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `score`                 | `number`                                      | Overall ATS score 0–100 after rule penalties                                                                                                         |
| `breakdown`             | `ATSBreakdown`                                | Sub-scores: `skills`, `experience`, `keywords`, `parseability`, `education`                                                                          |
| `parseabilityReport`    | `ParseabilityReport`                          | Itemized `{ reason, points }` deductions behind `breakdown.parseability`, plus the underlying formatting signals                                     |
| `matchedSkills`         | `string[]`                                    | Required skills found in the resume                                                                                                                  |
| `missingSkills`         | `string[]`                                    | Required skills absent from the resume                                                                                                               |
| `matchedKeywords`       | `string[]`                                    | JD keywords present in the resume (sorted)                                                                                                           |
| `missingKeywords`       | `string[]`                                    | JD keywords absent from the resume (sorted)                                                                                                          |
| `overusedKeywords`      | `string[]`                                    | Keywords exceeding density threshold (sorted)                                                                                                        |
| `keywordsByCategory`    | `Record<KeywordCategory, {matched, missing}>` | Matched/missing keywords grouped by category                                                                                                         |
| `keywordWeights`        | `KeywordWeight[]`                             | Per-keyword JD importance (`jdWeight`) and resume usage (`resumeWeight`)                                                                             |
| `achievementStrength`   | `{ strong: number; weak: number }`            | Count of resume bullets classified as strong vs weak achievement statements                                                                          |
| `matchedLanguages`      | `ParsedLanguage[]`                            | JD-required languages the resume meets or exceeds in proficiency                                                                                     |
| `missingLanguages`      | `ParsedLanguage[]`                            | JD-required languages absent or below the required proficiency                                                                                       |
| `seniorityMatch`        | `{ resume?, required?, met }`                 | Resume vs JD inferred seniority (`junior`–`principal`); `met` is `true` whenever either side is unknown                                              |
| `employmentGaps`        | `{ afterRole, months }[]`                     | Gaps of 3+ months between consecutive dated roles — informational                                                                                    |
| `perSkillExperience`    | `{ skill, years }[]`                          | Per-skill years of experience derived from per-role dating (which roles actually mention the skill)                                                  |
| `skillExperienceGaps`   | `{ skill, requiredYears, resumeYears }[]`     | JD skills the resume has but whose per-role dated experience falls short of a JD "N+ years of X" requirement — informational, doesn't affect `score` |
| `suggestions`           | `string[]`                                    | Deterministic improvement recommendations                                                                                                            |
| `warnings`              | `string[]`                                    | Parse warnings and section alerts                                                                                                                    |
| `experienceGap`         | `number`                                      | Years below JD minimum; `0` when met                                                                                                                 |
| `detectedSections`      | `string[]`                                    | Resume sections the parser found                                                                                                                     |
| `parsedExperienceYears` | `number`                                      | Total years from resume date ranges (overlap-deduplicated)                                                                                           |
| `experienceEntries`     | `ParsedExperienceEntry[]`                     | Parsed job entries: `title`, `company`, `dates` (with `start`/`end`/`durationInMonths`), `skills` (per-role skill mentions)                          |

**Scoring formula:**  
`score = skills×0.25 + experience×0.20 + keywords×0.25 + parseability×0.20 + education×0.10` → clamped to 0–100 → rule penalties subtracted.

The `parseability` sub-score starts at 100 and deducts for formatting/structure signals that trip up real ATS parsers — tables/columns, multi-column layout, special/control characters, non-standard bullets, likely-scanned text, an unparseable contact email, and too few detected sections. This is the single biggest real-world ATS rejection cause the v1 model didn't score at all.

Skill and keyword matching use fuzzy/stemmed comparison by default (`config.matching = { fuzzy: true }`), so typos and word-form variants ("ReactJS" vs "react", "developing" vs "develop") still match. Pass `{ fuzzy: false }` to require exact matches only.

The `keywords` sub-score is a **weighted** coverage ratio, not a flat count: each JD keyword gets a weight from its location (required > preferred > body text) and frequency, so missing a required keyword drops the score more than missing one mentioned once in the body.

> **Caveat — malformed/copy-pasted JD text:** required/preferred detection combines two heuristics: header-scoped blocks (a line that's just "Requirements:"/"Preferred:"/"Must have:"/"Nice to have:" scopes the bulleted lines that follow it) and line-local trigger phrases (`required`, `must`, `nice to have`, `preferred`) as a fallback. Job postings copy-pasted from a wrapped/columned source can still split a header or trigger phrase across line breaks (e.g. `"Nice to\n\nhave..."`), which drops that block into the unweighted body-keyword bucket instead of required/preferred. Skill keywords themselves (e.g. `react`, `python/fastapi`) are still picked up via the whole-text token scan and unaffected. If a JD looks oddly broken, paste it through a plain-text cleanup pass first, or expect required/preferred weighting to under-count.

The `education` sub-score normalizes degree abbreviations on both sides to a canonical level (`bachelor`, `master`, `phd`, `mba`, `associate`) before comparing — so a resume listing "B.S. Computer Science" satisfies a JD requiring "Bachelor's degree".

---

## Configuration

All options are optional. Pass any subset; `resolveConfig()` fills in defaults.

```typescript
const result = analyzeResume({
  resumeText: "...",
  jobDescription: "...",
  config: {
    // Override scoring weights (auto-normalized to sum to 1)
    weights: {
      skills: 0.3,
      experience: 0.2,
      keywords: 0.2,
      parseability: 0.2,
      education: 0.1,
    },

    // Fuzzy/stem matching is on by default; disable for exact-match-only (v1 behavior)
    matching: { fuzzy: false },

    // Additional skill synonyms merged over built-in defaults
    skillAliases: { javascript: ["js", "ecmascript"] },

    // Categorized keyword/alias entries; merges over the default registry by canonical term
    keywordRegistry: [
      { canonical: "rust", aliases: ["rustlang"], category: "technical" },
    ],

    // Industry profile: sets mandatory/optional skills and minExperience
    profile: {
      mandatorySkills: ["javascript", "react"],
      optionalSkills: ["graphql", "docker"],
      minExperience: 3,
    },

    // Freeze "Present" end dates for reproducible experience scoring
    referenceDate: "2026-01-01",

    // Keyword density thresholds
    keywordDensity: { min: 0.0025, max: 0.04, overusePenalty: 5 },

    // Custom penalty rules
    rules: [
      {
        id: "no-tables",
        penalty: 10,
        warning: "Remove tables — ATS parsers often mangle them",
        condition: (ctx) => ctx.resume.detectedSections.length < 2,
      },
      {
        id: "experience-gap",
        penalty: 5,
        warning: "Resume has less than 3 years experience",
        condition: (ctx) => ctx.resume.totalExperienceYears < 3,
      },
    ],
  },
});
```

### Defaults

| Setting                           | Default                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `weights.skills`                  | `0.25`                                                                         |
| `weights.experience`              | `0.20`                                                                         |
| `weights.keywords`                | `0.25`                                                                         |
| `weights.parseability`            | `0.20`                                                                         |
| `weights.education`               | `0.10`                                                                         |
| `matching.fuzzy`                  | `true` (stemmed/fuzzy skill & keyword matching)                                |
| `keywordDensity.min`              | `0.0025`                                                                       |
| `keywordDensity.max`              | `0.04`                                                                         |
| `keywordDensity.overusePenalty`   | `5`                                                                            |
| `allowPartialMatches`             | `true`                                                                         |
| `referenceDate`                   | Current date (use explicit ISO string for determinism)                         |
| `sectionPenalties.missingContact` | `12` (no parseable email detected — a real ATS treats this as a near-knockout) |

See [Configuration docs](https://pranavraut033.github.io/ats-checker/docs/configuration/) for all options.

---

## Keyword Registry, Categories & Aliases

Every built-in keyword/skill belongs to a `KeywordRegistry` entry — a canonical term, its aliases, and a category (`technical` | `tool` | `concept` | `soft` | `marketing` | `domain`). The default registry ships **407 canonical terms** across cloud/infra, databases, frameworks, ML/AI, testing, security/compliance, soft skills, marketing, and PM/agile vocabulary, with common surface-form aliases pre-loaded so `js` matches `javascript`, `k8s` matches `kubernetes`, `reactjs`/`react.js` match `react`, etc. — and typos/word-form variants match too via fuzzy/stem matching (on by default, see [Configuration](#configuration)).

```typescript
import {
  defaultKeywordRegistry,
  defaultSkillAliases,
} from "@pranavraut033/ats-checker";
// defaultKeywordRegistry: [{ canonical: "javascript", aliases: ["js"], category: "technical" }, ...]
// defaultSkillAliases: { javascript: ["js"], node: ["node.js", "nodejs"], ... }  (derived, back-compat)
```

Extend or override the registry via `config.keywordRegistry` — entries merge over the defaults by canonical term:

```typescript
const result = analyzeResume({
  resumeText: "...",
  jobDescription: "...",
  config: {
    keywordRegistry: [
      { canonical: "rust", aliases: ["rustlang"], category: "technical" },
      {
        canonical: "javascript",
        aliases: ["js", "ecmascript"],
        category: "technical",
      }, // overrides default
    ],
  },
});

console.log(result.keywordsByCategory.technical); // { matched: [...], missing: [...] }
console.log(result.keywordWeights); // [{ term, category, jdWeight, resumeWeight, importance }, ...]
```

You can still pass `config.skillAliases` for a flat override — it merges on top of the registry-derived aliases.

## Multi-language Keyword Packs

Categorized keyword registries ship as installable subpaths, one per language. Canonical terms stay in English (so scoring/profiles keep working); the pack supplies localized aliases.

```typescript
import de from "@pranavraut033/ats-checker/de";
import { analyzeResume } from "@pranavraut033/ats-checker";

const result = analyzeResume({
  resumeText: "...", // e.g. a German-language resume
  jobDescription: "...",
  config: { keywordRegistry: de },
});
```

Available packs: `/en` (the default registry) and `/de` (seed set — grows on demand). Each default-exports a `KeywordRegistry`.

## Language Requirements

The JD parser scans for spoken-language mentions — CEFR codes (`A1`–`C2`) or descriptive words (`basic`, `conversational`, `professional`, `fluent`, `native`) — and the resume parser does the same. Any language found in the JD is treated as required; the resume must mention it at an equal or higher level to count as matched.

```typescript
const result = analyzeResume({
  resumeText: "Languages: German (C1), English (native)",
  jobDescription: "German (B2) required for this role.",
});

console.log(result.matchedLanguages); // [{ name: "german", level: "b2", levelRank: 4 }]
console.log(result.missingLanguages); // []
```

A missing or under-leveled language surfaces both in `result.missingLanguages` and as a suggestion (`"Mention your proficiency in: german (b2)"`). This is informational/suggestion-only — it does not change `score` or `breakdown`.

---

## Built-in Profiles

```typescript
import {
  softwareEngineerProfile,
  dataScientistProfile,
  productManagerProfile,
} from "@pranavraut033/ats-checker";

const result = analyzeResume({
  resumeText: "...",
  jobDescription: "...",
  config: { profile: softwareEngineerProfile },
});
```

---

## PDF Input

Extract text from a PDF resume before passing it to `analyzeResume`. This uses `pdfjs-dist` as an optional peer dependency — the core library stays zero-dep.

```bash
npm install pdfjs-dist
```

```typescript
import { extractTextFromPDF } from "@pranavraut033/ats-checker/pdf";
import { analyzeResume } from "@pranavraut033/ats-checker";
import { readFileSync } from "fs";

const bytes = readFileSync("resume.pdf");
const resumeText = await extractTextFromPDF(bytes);

const result = analyzeResume({ resumeText, jobDescription: "..." });
```

`extractTextFromPDF` accepts a `Uint8Array` or `ArrayBuffer` and returns a plain `string`. Works in Node.js and the browser (text-layer PDFs only).

**Multi-column layouts are handled automatically.** The extractor uses glyph x/y coordinates to detect column boundaries and process each column independently, so a two-column resume parses cleanly without interleaved text.

For PDFs that can't be recovered — scanned/image resumes or exports with no text layer — `analyzeResume` surfaces an actionable message in `result.warnings`. Always check it after PDF input:

```typescript
const result = analyzeResume({ resumeText, jobDescription: "..." });
if (result.warnings.length) {
  console.warn("Parsing issues:", result.warnings);
  // e.g. "Almost no text was extracted — the resume may be a scanned/image PDF."
}
```

### OCR fallback for scanned PDFs

`extractTextFromPDF` accepts an optional `ocrFallback` that's only invoked when the text layer comes back too short (default threshold: 100 chars). The OCR engine and its dependency are entirely your choice — the core library never bundles one:

```typescript
const resumeText = await extractTextFromPDF(bytes, {
  ocrFallback: async (data) => {
    // bring your own OCR engine, e.g. tesseract.js or a cloud OCR API
    const { recognize } = await import("tesseract.js");
    const {
      data: { text },
    } = await recognize(data, "eng");
    return text;
  },
});
```

If `ocrFallback` throws or returns text that isn't longer than the text-layer result, `extractTextFromPDF` silently keeps the original result — OCR failures never break the deterministic extraction path.

---

## LLM Integration (deprecated)

`analyzeResumeAsync` accepts an optional `llm` config that rewrites suggestion text via a caller-supplied LLM client. **This path is deprecated** — scores and breakdowns are never touched by LLM. Prefer calling `analyzeResume` and running your own LLM pass on `result.suggestions` if you want AI-enhanced wording.

---

## Development

```bash
npm install
npm run build       # tsup → ESM + CJS in dist/
npm test            # vitest (single pass)
npm run type-check  # tsc --noEmit
npm run dev         # static demo UI at http://localhost:3005
```

---

## Documentation

Full docs at **[pranavraut033.github.io/ats-checker/docs/](https://pranavraut033.github.io/ats-checker/docs/)**

- [Architecture](docs/architecture.md)
- [Configuration](docs/configuration.md)
- [Rules Engine](docs/rules.md)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs welcome.

---

## License

MIT © [Pranav Raut](https://github.com/Pranavraut033)
