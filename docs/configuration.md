# Configuration

The `analyzeResume` function accepts an optional `config` object to customize scoring behavior, skill matching, and validation rules.

## Weights

Control the relative importance of each scoring component. Values are normalized to sum to 1.0.

```typescript
config: {
  weights: {
    skills: 0.4,      // 40% weight for skill matches
    experience: 0.3,  // 30% for experience
    keywords: 0.2,    // 20% for keyword matches
    education: 0.1    // 10% for education
  }
}
```

Default weights: skills 0.3, experience 0.3, keywords 0.25, education 0.15

## Skill Aliases

Map skill synonyms to canonical names for better matching.

```typescript
config: {
  skillAliases: {
    "javascript": ["js", "ecmascript", "es6"],
    "react": ["reactjs", "react.js"],
    "node": ["nodejs", "node.js"]
  }
}
```

When "js" appears in a resume, it's treated as "javascript" for scoring.

## Industry Profiles

Define required skills and minimum experience for specific roles.

```typescript
config: {
  profile: {
    name: "Frontend Developer",
    mandatorySkills: ["javascript", "html", "css"],
    optionalSkills: ["react", "vue", "angular"],
    minExperience: 2  // minimum years
  }
}
```

Mandatory skills not found reduce the score; optional skills boost it when present.

## Keyword Density

Configure detection of keyword stuffing or underuse.

```typescript
config: {
  keywordDensity: {
    min: 0.0025,       // Minimum density threshold (default)
    max: 0.04,         // Maximum before penalty (default)
    overusePenalty: 5  // Points deducted for stuffing (default)
  }
}
```

Density is calculated as (keyword occurrences) / (total words).

## Section Penalties

Penalize missing resume sections.

```typescript
config: {
  sectionPenalties: {
    missingSummary: 5,
    missingExperience: 10,
    missingSkills: 5,
    missingEducation: 5
  }
}
```

## Custom Rules

Add your own validation logic with penalties.

```typescript
config: {
  rules: [{
    id: "no-tables",
    description: "Resumes with tables are hard for ATS to parse",
    penalty: 10,
    warning: "Remove tables from your resume",
    condition: (context) => context.resume.hasTables
  }]
}
```

Rules receive a `RuleContext` with parsed resume/job data, current breakdown, and matched keywords.

## Partial Matches

Allow partial keyword matches (e.g., "Java" matches "JavaScript").

```typescript
config: {
  allowPartialMatches: true  // default: true
}
```

## Defaults & Resolution

All user input is merged with sane defaults using `resolveConfig()` and weights are normalized to sum to 1.0.

Default values:
- **Weights**: skills 0.3, experience 0.3, keywords 0.25, education 0.15
- **Keyword Density**: min 0.0025, max 0.04, overusePenalty 5
- **Section Penalties**: missingSummary 4, missingExperience 10, missingSkills 8, missingEducation 6
- **Partial Matches**: `allowPartialMatches: true`
- **Skill Aliases**: merged from built-in `defaultSkillAliases` + your overrides
- **Profile**: `softwareEngineerProfile` unless overridden

See implementation in [src/core/scoring/weights.ts](../src/core/scoring/weights.ts).

For rule customization, refer to [Rules Engine](rules.md).

## Complete Example

```typescript
import { analyzeResume } from "@pranavraut033/ats-checker";

const result = analyzeResume({
  resumeText: "...",
  jobDescription: "...",
  config: {
    weights: { skills: 0.5, experience: 0.3, keywords: 0.1, education: 0.1 },
    skillAliases: { "typescript": ["ts"] },
    profile: {
      mandatorySkills: ["javascript", "react"],
      minExperience: 3
    },
    rules: [{
      id: "phone-number",
      penalty: 2,
      condition: (context) => !context.resume.contactInfo?.phone
    }]
  }
});
```