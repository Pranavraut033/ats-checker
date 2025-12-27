# ATS Checker

A zero-dependency TypeScript library for evaluating resume compatibility with Applicant Tracking Systems (ATS). It parses resumes and job descriptions, calculates a deterministic score from 0 to 100, and provides actionable feedback to improve match rates.

## 🚀 Quick Start

### Installation

```bash
npm install @pranavraut033/ats-checker
```

### Basic Usage

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

### Configuration

Adjust scoring priorities, define skill synonyms, and add custom rules:

```typescript
const result = analyzeResume({
  resumeText: "...",
  jobDescription: "...",
  config: {
    weights: { skills: 0.4, experience: 0.3, keywords: 0.2, education: 0.1 },
    skillAliases: { "javascript": ["js", "ecmascript"] },
    rules: [{
      id: "min-years",
      penalty: 5,
      warning: "Less than 3 years experience",
      condition: (context) => (context.resume.experienceYears ?? 0) < 3
    }]
  }
});
```

## ✨ Features

- **Deterministic Scoring** - Based on skills, experience, keywords, and education
- **ATS Issue Detection** - Identifies missing sections or keyword overuse
- **Customizable** - Adjustable scoring weights and validation rules
- **LLM Integration** - Optional AI-enhanced suggestions
- **Web Interface** - Built-in testing UI (`npm run dev`)
- **Zero Dependencies** - Core library has no external dependencies

## 🎯 Live Demo

Try the library in action:  
**[Launch Demo →](https://pranavraut033.github.io/ats-checker/)**

## 📚 Documentation

- **[Architecture](architecture.md)** - System design and core components
- **[Configuration](configuration.md)** - Complete configuration options
- **[LLM Integration](llm-integration.md)** - AI-powered suggestions
- **[UI Guide](ui.md)** - Web interface documentation
 - **[Rules Engine](rules.md)** - Default rules and customization

## 🔧 API Reference

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

## 💻 Development

```bash
npm install          # Install dependencies
npm run build        # Build to dist/
npm test             # Run tests
npm run dev          # Start web UI at http://localhost:3005
```

## 📄 License

MIT

## 🔗 Links

- **[GitHub Repository](https://github.com/Pranavraut033/ats-checker)**
- **[NPM Package](https://www.npmjs.com/package/@pranavraut033/ats-checker)**
- **[Live Demo](https://pranavraut033.github.io/ats-checker/)**

---

Made with ❤️ by [Pranav Virendra Raut](https://www.linkedin.com/in/pranav-raut)
