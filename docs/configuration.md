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

## Keyword Registry & Categories

The built-in `defaultKeywordRegistry` is a list of `{ canonical, aliases, category }` entries — `skillAliases` is derived from it for backward compatibility. Each entry's `category` is one of: `technical`, `tool`, `concept`, `soft`, `marketing`, `domain`.

```typescript
config: {
  keywordRegistry: [
    { canonical: "rust", aliases: ["rustlang"], category: "technical" },
    {
      canonical: "javascript",
      aliases: ["js", "ecmascript"],
      category: "technical",
    }, // overrides default entry
  ];
}
```

Entries merge over `defaultKeywordRegistry` by `canonical` term — your entries win on conflict, everything else from the default registry is kept. Categories drive `result.keywordsByCategory`, which groups matched/missing keywords for display.

### Keyword Weighting

Within `scoreKeywords`, each JD keyword gets a weight based on:

- **Location**: required (`3`) > preferred (`2`) > body-only (`1`)
- **Frequency**: a small bonus when the JD repeats the term

The `keywords` sub-score is `sum(weight of matched) / sum(weight of all) × 100` — missing a required keyword costs more than missing a body-only one. Per-keyword weights are exposed in `result.keywordWeights` (`jdWeight`/`importance`, and `resumeWeight` — how often it appears in the resume).

### Multi-language Packs

Categorized registries for other languages ship as subpath exports (canonical terms stay English so scoring/profiles are unaffected; the pack supplies localized aliases):

```typescript
import de from "@pranavraut033/ats-checker/de";
config: {
  keywordRegistry: de;
}
```

See [src/lang/](../src/lang/) for available packs (`en`, `de`).

## Language Requirements

Spoken-language requirements (English, German, Spanish, etc. — distinct from the keyword registry, which is for tech/domain terms) are parsed automatically from free text — no config needed. Both the JD parser and resume parser scan for:

- CEFR codes: `A1`, `A2`, `B1`, `B2`, `C1`, `C2`
- Descriptive levels: `basic`/`elementary`, `conversational`/`intermediate`, `professional`/`advanced`, `fluent`, `native`/`bilingual`

Any language mentioned in the JD is treated as required. A resume language counts as a match only if its level rank is equal to or higher than the JD's:

```typescript
const result = analyzeResume({
  resumeText: "Languages: German (C1), fluent Spanish",
  jobDescription: "German (B2) required. Native English speaker preferred.",
});

result.matchedLanguages; // [{ name: "german", level: "b2", levelRank: 4 }]
result.missingLanguages; // [{ name: "english", level: "native", levelRank: 6 }]
```

This does not feed into `breakdown` or `score` — it's informational, surfaced via `result.matchedLanguages`/`result.missingLanguages` and a suggestion when a required language is missing or under-leveled. See [src/utils/languages.ts](../src/utils/languages.ts) for the supported language/level list.

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
    missingEducation: 5,
    missingContact: 0  // warning-only by default; set >0 to dock points for no parseable email
  }
}
```

## Custom Rules

Add your own validation logic with penalties.

```typescript
config: {
  rules: [
    {
      id: "no-tables",
      description: "Resumes with tables are hard for ATS to parse",
      penalty: 10,
      warning: "Remove tables from your resume",
      condition: (context) => context.resume.hasTables,
    },
  ];
}
```

Rules receive a `RuleContext` with parsed resume/job data, current breakdown, and matched keywords.

## Reference Date

Freeze the "Present"/"Now"/"Current" end date used in experience date ranges. Without this, experience years are calculated relative to `new Date()` — meaning the same resume produces a slightly different score each month. Set it to an ISO date string for fully reproducible scoring.

```typescript
config: {
  referenceDate: "2026-01-01"; // all "Present" ranges end here
}
```

Useful for: testing, CI pipelines, caching scores, or any context where you need identical output for identical input.

## Partial Matches

Allow partial keyword matches (e.g., "Java" matches "JavaScript").

```typescript
config: {
  allowPartialMatches: true; // default: true
}
```

## Defaults & Resolution

All user input is merged with sane defaults using `resolveConfig()` and weights are normalized to sum to 1.0.

Default values:

- **Weights**: skills 0.3, experience 0.3, keywords 0.25, education 0.15
- **Keyword Density**: min 0.0025, max 0.04, overusePenalty 5
- **Section Penalties**: missingSummary 4, missingExperience 10, missingSkills 8, missingEducation 6, missingContact 0 (warning-only)
- **Partial Matches**: `allowPartialMatches: true`
- **Skill Aliases**: merged from built-in `defaultSkillAliases` + your overrides
- **Keyword Registry**: merged from `defaultKeywordRegistry` + your `keywordRegistry` entries (by canonical term), then `skillAliases` layered on top
- **Language Requirements**: parsed automatically from JD/resume text, no config — see [Language Requirements](#language-requirements)
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
    skillAliases: { typescript: ["ts"] },
    profile: {
      mandatorySkills: ["javascript", "react"],
      minExperience: 3,
    },
    rules: [
      {
        id: "phone-number",
        penalty: 2,
        condition: (context) => !context.resume.contact?.phone,
      },
    ],
  },
});
```
