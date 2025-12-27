# ats-checker

[![npm version](https://img.shields.io/npm/v/@pranavraut033/ats-checker.svg)](https://www.npmjs.com/package/@pranavraut033/ats-checker)
[![npm downloads](https://img.shields.io/npm/dm/@pranavraut033/ats-checker.svg)](https://www.npmjs.com/package/@pranavraut033/ats-checker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/Pranavraut033/ats-checker/actions/workflows/deploy.yml/badge.svg)](https://github.com/Pranavraut033/ats-checker/actions/workflows/deploy.yml)
[![Tests](https://github.com/Pranavraut033/ats-checker/actions/workflows/ci.yml/badge.svg)](https://github.com/Pranavraut033/ats-checker/actions/workflows/ci.yml)

A zero-dependency TypeScript library for evaluating resume compatibility with Applicant Tracking Systems (ATS). It parses resumes and job descriptions, calculates a deterministic score from 0 to 100, and provides actionable feedback to improve match rates.

## Installation

```bash
npm install @pranavraut033/ats-checker
```

## Usage

```typescript
import { analyzeResume } from "@pranavraut033/ats-checker";

const result = analyzeResume({
  resumeText: `John Doe
Software Engineer with 5 years of experience in JavaScript and React.`,
  jobDescription: `We are looking for a software engineer with JavaScript experience.`
});

console.log(result.score); // 78
console.log(result.breakdown.skills); // 85
console.log(result.suggestions); // ["Add more specific JavaScript frameworks", ...]
```

### LLM (Async) Usage

Note: `expandAliases()` is deprecated — prefer `normalizeSkills()` or `skillMatched()` for normalizing and matching skill names.



For AI-enhanced suggestions while keeping scores deterministic, use the async API:

```typescript
import { analyzeResumeAsync } from "@pranavraut033/ats-checker";

const myLLMClient = /* implement LLMClient (OpenAI/Anthropic/local) */;

const result = await analyzeResumeAsync({
  resumeText: "...",
  jobDescription: "...",
  llm: {
    client: myLLMClient,
    models: { default: "gpt-4o-mini" },
    limits: { maxCalls: 3, maxTokensPerCall: 1000, maxTotalTokens: 5000 },
    enable: { suggestions: true }
  }
});

console.log(result.score);        // unchanged by LLM
console.log(result.suggestions);  // enhanced wording/context
```

Note: Passing `llm` to `analyzeResume` (sync) will add a warning and skip enhancement. Prefer `analyzeResumeAsync` for LLM features.

## Configuration

Adjust scoring priorities, define skill synonyms, and add custom rules:

```typescript
const result = analyzeResume({
  resumeText: "...",
  jobDescription: "...",
  config: {
    weights: { skills: 0.4, experience: 0.3, keywords: 0.2, education: 0.1 },
    skillAliases: { "javascript": ["js", "ecmascript"] },
    rules: [
      {
        id: "min-years",
        penalty: 5,
        warning: "Less than 3 years experience",
        condition: (ctx) => (ctx.resume.experienceYears ?? 0) < 3
      },
      {
        id: "require-contact",
        penalty: 2,
        warning: "Add phone/email to contact info",
        condition: (ctx) => !ctx.resume.contactInfo?.phone || !ctx.resume.contactInfo?.email
      }
    ]
  }
});
```

See [Configuration](docs/configuration.md) for complete options.

### Configuration Defaults

- Weights: skills 0.3, experience 0.3, keywords 0.25, education 0.15 (normalized)
- Keyword density: min 0.0025, max 0.04, overusePenalty 5
- Section penalties: summary 4, experience 10, skills 8, education 6
- Partial matches: `allowPartialMatches: true`

All user config is merged via `resolveConfig()` and weights are normalized to sum to 1.0.

### Custom Rules

Add penalties/warnings via rule conditions:

```typescript
const result = analyzeResume({
  resumeText: "...",
  jobDescription: "...",
  config: {
    rules: [
      {
        id: "min-years",
        penalty: 5,
        warning: "Less than 3 years experience",
        condition: (ctx) => (ctx.resume.experienceYears ?? 0) < 3
      },
      {
        id: "require-contact",
        penalty: 2,
        warning: "Add phone/email to contact info",
        condition: (ctx) => !ctx.resume.contactInfo?.phone || !ctx.resume.contactInfo?.email
      }
    ]
  }
});
```
See [Rules Engine](docs/rules.md) for default rules and context fields.

## Features

- Deterministic scoring based on skills, experience, keywords, and education
- Detects common ATS issues like missing sections or keyword overuse
- Customizable scoring weights and validation rules
- Optional LLM integration for enhanced suggestions
- Includes a web interface for testing (`npm run dev`)
- [Live Demo](https://pranavraut033.github.io/ats-checker/)

## API

### `analyzeResume(input: AnalyzeResumeInput): ATSAnalysisResult`

Analyzes a resume against a job description.

**Input:**
- `resumeText: string` - The full text of the resume
- `jobDescription: string` - The job description text
- `config?: ATSConfig` - Optional configuration overrides

**Output:**
- `score: number` - Overall ATS score (0-100)
- `breakdown: ATSBreakdown` - Component scores
- `matchedKeywords: string[]` - Keywords found in both
- `missingKeywords: string[]` - Important keywords not in resume
- `suggestions: string[]` - Improvement recommendations
- `warnings: string[]` - Issues detected

## Development

```bash
npm install
npm run build    # Build to dist/
npm test         # Run tests
npm run dev      # Start web UI at http://localhost:3005
```

## Documentation

**Live Docs** (hosted on GitHub Pages):
- https://Pranavraut033.github.io/ats-checker/docs/

**Local Docs** (in repository):
- [Configuration Guide](docs/configuration.md)
- [LLM Integration](docs/llm-integration.md)
- [Web Interface](docs/ui.md)
- [Architecture](docs/architecture.md)

## Contributing

Contributions are welcome! Please see the [Contributing Guide](https://github.com/Pranavraut033/ats-checker/blob/main/CONTRIBUTING.md) for details.

## License

MIT

