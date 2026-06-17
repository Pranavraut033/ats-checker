# @pranavraut033/ats-checker

[![npm version](https://img.shields.io/npm/v/@pranavraut033/ats-checker.svg)](https://www.npmjs.com/package/@pranavraut033/ats-checker)
[![npm downloads](https://img.shields.io/npm/dm/@pranavraut033/ats-checker.svg)](https://www.npmjs.com/package/@pranavraut033/ats-checker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://github.com/Pranavraut033/ats-checker/actions/workflows/ci.yml/badge.svg)](https://github.com/Pranavraut033/ats-checker/actions/workflows/ci.yml)
[![Build Status](https://github.com/Pranavraut033/ats-checker/actions/workflows/deploy.yml/badge.svg)](https://github.com/Pranavraut033/ats-checker/actions/workflows/deploy.yml)

Zero-dependency TypeScript library that scores a resume against a job description and explains why — skills coverage, keyword overlap, experience match, and education — with no randomness, no LLM, and no external calls.

**[Live Demo →](https://pranavraut033.github.io/ats-checker/)**  
**[Docs →](https://pranavraut033.github.io/ats-checker/docs/)**

---

## Features

- **Deterministic** — same input always produces the same score; pin it with `referenceDate` to freeze "Present" date math
- **Explainable** — breakdown by category (skills / experience / keywords / education) plus matched and missing skill/keyword lists
- **Configurable** — adjust weights, add skill aliases, define custom penalty rules
- **Zero dependencies** — core library has no runtime deps; ships ESM + CJS
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

console.log(result.score);            // e.g. 72.45
console.log(result.matchedSkills);    // ["javascript", "node", "react", "typescript"]
console.log(result.missingSkills);    // ["accessibility best practices", "graphql"]
console.log(result.experienceGap);    // 0 (requirement met)
console.log(result.suggestions);      // ["Add GraphQL to your skills section", ...]
```

---

## Output

`analyzeResume()` returns an `ATSAnalysisResult`:

| Field | Type | Description |
|---|---|---|
| `score` | `number` | Overall ATS score 0–100 after rule penalties |
| `breakdown` | `ATSBreakdown` | Sub-scores: `skills`, `experience`, `keywords`, `education` |
| `matchedSkills` | `string[]` | Required skills found in the resume |
| `missingSkills` | `string[]` | Required skills absent from the resume |
| `matchedKeywords` | `string[]` | JD keywords present in the resume (sorted) |
| `missingKeywords` | `string[]` | JD keywords absent from the resume (sorted) |
| `overusedKeywords` | `string[]` | Keywords exceeding density threshold (sorted) |
| `suggestions` | `string[]` | Deterministic improvement recommendations |
| `warnings` | `string[]` | Parse warnings and section alerts |
| `experienceGap` | `number` | Years below JD minimum; `0` when met |
| `detectedSections` | `string[]` | Resume sections the parser found |
| `parsedExperienceYears` | `number` | Total years from resume date ranges |

**Scoring formula:**  
`score = skills×0.30 + experience×0.30 + keywords×0.25 + education×0.15` → clamped to 0–100 → rule penalties subtracted.

---

## Configuration

All options are optional. Pass any subset; `resolveConfig()` fills in defaults.

```typescript
const result = analyzeResume({
  resumeText: "...",
  jobDescription: "...",
  config: {
    // Override scoring weights (auto-normalized to sum to 1)
    weights: { skills: 0.4, experience: 0.3, keywords: 0.2, education: 0.1 },

    // Additional skill synonyms merged over built-in defaults
    skillAliases: { javascript: ["js", "ecmascript"] },

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

| Setting | Default |
|---|---|
| `weights.skills` | `0.30` |
| `weights.experience` | `0.30` |
| `weights.keywords` | `0.25` |
| `weights.education` | `0.15` |
| `keywordDensity.min` | `0.0025` |
| `keywordDensity.max` | `0.04` |
| `keywordDensity.overusePenalty` | `5` |
| `allowPartialMatches` | `true` |
| `referenceDate` | Current date (use explicit ISO string for determinism) |

See [Configuration docs](https://pranavraut033.github.io/ats-checker/docs/configuration/) for all options.

---

## Built-in Skill Aliases

Common tech synonyms are pre-loaded so `js` matches `javascript`, `k8s` matches `kubernetes`, etc. Extend or override via `config.skillAliases`.

```typescript
import { defaultSkillAliases } from "@pranavraut033/ats-checker";
// { javascript: ["js"], node: ["node.js", "nodejs"], typescript: ["ts"], ... }
```

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
