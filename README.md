# ats-checker

Deterministic, configurable ATS (Applicant Tracking System) compatibility checker with no external dependencies. Provides a single entry point `analyzeResume()` and extensible configuration for weights, skills, rules, and profiles.

## Installation

```bash
npm install ats-checker
```

## Quick start

```ts
import { analyzeResume } from "ats-checker";

const { score, breakdown, suggestions } = analyzeResume({
  resumeText: "...",
  jobDescription: "..."
});
```

## Configuration

- **weights**: adjust scoring weight for skills, experience, keywords, and education.
- **skillAliases**: normalize synonyms to canonical skills.
- **profile**: specify mandatory/optional skills and minimum years of experience.
- **rules**: add custom penalties via functions that inspect parsed resume/job data.

See `src/types` for full type definitions.

## Development

```bash
npm install
npm run build
npm test
```

## Features

- Zero runtime dependencies
- Deterministic, explainable scoring (0-100)
- Customizable weights, rules, and industry profiles
- Parses resumes and job descriptions
- Detects ATS-unfriendly patterns (tables, keyword stuffing)
- Generates actionable suggestions

