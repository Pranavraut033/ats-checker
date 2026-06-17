# Architecture

ats-checker processes resumes and job descriptions through a deterministic pipeline. The same input always produces the same output — no LLM, no randomness, no wall-clock dependency in the scoring path (use `referenceDate` to freeze "Present" date math).

## Pipeline

```
analyzeResume(input)
  │
  ├─ resolveConfig()          merge user ATSConfig with defaults; normalize weights
  │
  ├─ parseResume()            section detection, skill extraction, date range parsing
  ├─ parseJobDescription()    required/preferred skills, keywords, experience requirement
  │
  ├─ calculateScore()         four sub-scores → weighted combine → clamp(toFixed(2), 0, 100)
  │    ├─ scoreSkills         required coverage × 0.7 + optional coverage × 0.3
  │    ├─ scoreExperience     years coverage × 0.75 + role title coverage × 0.25
  │    ├─ scoreKeywords       matched / jobKeywordSet.size (alias-normalized both sides)
  │    └─ scoreEducation      substring coverage of degree keywords
  │
  ├─ RuleEngine.evaluate()    built-in + custom rules → totalPenalty + warnings[]
  ├─ SuggestionEngine.generate()  deterministic suggestions in fixed priority order
  │
  └─ return ATSAnalysisResult
       score = clamp(weightedScore - totalPenalty, 0, 100)
```

## Determinism Guarantees

- **Alias normalization** applied symmetrically to JD keywords and resume token stream — `js` in resume matches `javascript` in JD
- **Tech-aware tokenizer** preserves `c#`, `c++`, `node.js`, `ci/cd`, `full-stack`, `a/b` as single tokens
- **NFKC normalization** before all comparisons — accented chars handled consistently
- **All output arrays** (`matchedKeywords`, `missingKeywords`, `overusedKeywords`, `matchedSkills`, `missingSkills`) are `.sort()`-ed before return
- **`referenceDate` config** replaces `new Date()` in experience date parsing — set it to freeze scores across time

## Output Shape

`ATSAnalysisResult`:

| Field | Source |
|---|---|
| `score` | `clamp(weightedScore - totalPenalty, 0, 100)` |
| `breakdown` | `{ skills, experience, keywords, education }` sub-scores |
| `matchedSkills` | required skills found in resume (sorted) |
| `missingSkills` | required skills absent from resume (sorted) |
| `matchedKeywords` | JD keywords present in resume (sorted) |
| `missingKeywords` | JD keywords absent from resume (sorted) |
| `overusedKeywords` | keywords above density threshold (sorted) |
| `suggestions` | deterministic from SuggestionEngine |
| `warnings` | from RuleEngine + parse warnings |
| `experienceGap` | `max(requiredYears - parsedYears, 0)` |
| `detectedSections` | section names the resume parser found |
| `parsedExperienceYears` | sum of experience date ranges |

**Scores are immutable** — no code path modifies `score` or `breakdown` after `calculateScore()` returns.

## Module Map

| Module | Path | Role |
|---|---|---|
| Entry point | `src/index.ts` | Orchestrates pipeline; exports public API |
| Resume parser | `src/core/parser/resume.parser.ts` | Section detect, skill extract, date ranges |
| JD parser | `src/core/parser/jd.parser.ts` | Required/preferred skills, keywords, min experience |
| Scorer | `src/core/scoring/scorer.ts` | Four sub-scores, weighted combine |
| Config resolver | `src/core/scoring/weights.ts` | `resolveConfig()` — merge defaults, normalize weights |
| Rule engine | `src/core/rules/rule.engine.ts` | Pluggable penalty rules |
| Suggestion engine | `src/core/suggestions/suggestion.engine.ts` | Deterministic suggestions |
| LLM layer (deprecated) | `src/llm/` | Budget-controlled wrapper; only touches `suggestions` |
| Profiles | `src/profiles/index.ts` | Built-in skill sets + `defaultSkillAliases` |
| Types | `src/types/` | All shared types; re-exported from `src/index.ts` |
| Text utils | `src/utils/text.ts` | Tech-aware tokenizer, NFKC normalize, `clamp`, `unique` |
| Skill utils | `src/utils/skills.ts` | `normalizeSkill`, `normalizeSkills` |
| Date utils | `src/utils/dates.ts` | `parseDateRange` (respects `referenceDate`), `sumExperienceYears` |

## Build & Distribution

- **Bundler**: `tsup` → dual ESM (`dist/index.mjs`) + CJS (`dist/index.cjs`) + types (`dist/index.d.ts`)
- **Zero runtime dependencies** — no `node_modules` in the published bundle
- **Demo UI**: `ui/public/index.html` — vanilla JS, loads `dist/index.mjs` from CDN-style local copy
