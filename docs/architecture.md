# Architecture

ats-checker processes resumes and job descriptions through a structured pipeline to produce deterministic ATS compatibility scores.

## Core Flow

1. **Text Parsing** - Extract structured data from raw resume and job description text
2. **Scoring Calculation** - Compute weighted scores for skills, experience, keywords, and education
3. **Rule Evaluation** - Apply penalties for ATS violations like missing sections or keyword stuffing
4. **Suggestion Generation** - Create actionable improvement recommendations
5. **Optional LLM Enhancement** - Use AI to refine suggestions while preserving the core score

## Key Components

### Parser (`src/core/parser/`)

- **Resume Parser** - Detects sections (experience, skills, education) and extracts contact info, skills, and experience
- **Job Description Parser** - Identifies required skills, experience requirements, and keywords

Parsers use section aliases (e.g., "work history" → "experience") and handle various formats.

### Scoring (`src/core/scoring/`)

Calculates component scores:
- **Skills** - Matches resume skills against job requirements using normalized aliases
- **Experience** - Compares years of experience and role relevance
- **Keywords** - Counts exact and partial keyword matches
- **Education** - Checks for required degrees or certifications

Weights are configurable and normalized to sum to 1.0.

### Rules Engine (`src/core/rules/`)

Evaluates custom rules against parsed data. Built-in rules detect:
- Missing resume sections
- Keyword density issues
- Formatting problems (tables, images)

Rules can add penalties and warnings to the final score.

### Suggestions (`src/core/suggestions/`)

Generates improvement advice based on scoring gaps:
- Missing skills or keywords
- Insufficient experience
- Formatting recommendations

### LLM Integration (`src/llm/`)

Optional enhancement that:
- Refines suggestions using AI
- Maintains budget limits (calls, tokens)
- Falls back gracefully if unavailable
- Never affects the deterministic score

## Configuration System

All components use `resolveConfig()` to merge user settings with defaults. Configuration includes weights, aliases, profiles, and rules.

## Profiles (`src/profiles/`)

Predefined skill sets and aliases for common industries (tech, finance, etc.).

## Utils (`src/utils/`)

Pure functions for:
- Date parsing and experience calculation
- Skill normalization
- Text processing

## Build and Distribution

- **Build**: `tsup` generates ESM and CommonJS bundles
- **Zero Dependencies**: No runtime external libraries
- **TypeScript**: Full type safety with generated .d.ts files