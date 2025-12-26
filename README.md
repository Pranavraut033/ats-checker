# ats-checker

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

## Configuration

Adjust scoring priorities, define skill synonyms, and add custom rules:

```typescript
const result = analyzeResume({
  resumeText: "...",
  jobDescription: "...",
  config: {
    weights: { skills: 0.4, experience: 0.3, keywords: 0.2, education: 0.1 },
    skillAliases: { "javascript": ["js", "ecmascript"] },
    rules: [{
      id: "no-tables",
      penalty: 10,
      condition: (context) => context.resume.hasTables
    }]
  }
});
```

See [Configuration](docs/configuration.md) for complete options.

## Features

- Deterministic scoring based on skills, experience, keywords, and education
- Detects common ATS issues like missing sections or keyword overuse
- Customizable scoring weights and validation rules
- Optional LLM integration for enhanced suggestions
- Includes a web interface for testing (`npm run dev`)
- [Live Demo](https://pranavraut033.github.io/ats-checker/)

## API

### `analyzeResume(input: AnalyzeResumeInput): AnalyzeResumeResult`

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
npm run dev      # Start web UI at http://localhost:3000
```

## Documentation

- [Configuration Guide](docs/configuration.md)
- [LLM Integration](docs/llm-integration.md)
- [Web Interface](docs/ui.md)
- [Architecture](docs/architecture.md)

## License

MIT

