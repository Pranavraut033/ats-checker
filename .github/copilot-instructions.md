# ATS Checker - AI Coding Agent Instructions

## Project Architecture

This is a deterministic, zero-dependency ATS (Applicant Tracking System) compatibility checker. Single entry point: `analyzeResume()` in [src/index.ts](../src/index.ts) orchestrates a pipeline:

1. **Parse** → [resume.parser.ts](../src/core/parser/resume.parser.ts) + [jd.parser.ts](../src/core/parser/jd.parser.ts)
2. **Score** → [scorer.ts](../src/core/scoring/scorer.ts) with [weights.ts](../src/core/scoring/weights.ts)
3. **Rules** → [rule.engine.ts](../src/core/rules/rule.engine.ts) applies penalties
4. **Suggest** → [suggestion.engine.ts](../src/core/suggestions/suggestion.engine.ts)

Final score = base score - rule penalties (clamped 0-100). All scoring is deterministic and explainable.

## Key Patterns

### Skill Normalization

Skills are normalized via aliases ([profiles/index.ts](../src/profiles/index.ts)) - always use `normalizeSkills()` from [utils/skills.ts](../src/utils/skills.ts). Example: `"js" → "javascript"`, `"k8s" → "kubernetes"`.

### Configuration System

- `ATSConfig` (partial) → `resolveConfig()` → `ResolvedATSConfig` (fully defaulted)
- Weights auto-normalize to sum to 1.0 in [weights.ts](../src/core/scoring/weights.ts)
- Rules are user-extensible functions with `condition(context) => boolean`

### Scoring Components

Four weighted components ([scorer.ts](../src/core/scoring/scorer.ts)):

- **Skills**: Required (70%) + Optional (30%) coverage
- **Experience**: Years (75%) + Role titles (25%)
- **Keywords**: Token-based matching with density checks
- **Education**: Degree level comparison

### Rule System

Default rules in [rule.engine.ts](../src/core/rules/rule.engine.ts) check:

- Missing sections (summary/experience/skills/education)
- Table-like structures (ATS-unfriendly)
- Keyword stuffing (density > `config.keywordDensity.max`)
- Custom user rules via `config.rules`

## Development Commands

```bash
npm run build      # tsup → dist/ (ESM + CJS + types)
npm test           # vitest run
npm run test:watch # vitest with UI
npm run type-check # tsc --noEmit
```

Tests in [tests/analyzeResume.test.ts](../tests/analyzeResume.test.ts) focus on end-to-end scoring scenarios.

## Type System Boundaries

- **Input**: `AnalyzeResumeInput` (raw text + optional config)
- **Parser Output**: `ParsedResume` / `ParsedJobDescription` (structured data)
- **Scorer Output**: `ScoreComputation` (with breakdown + artifacts)
- **Final Output**: `ATSAnalysisResult` (score + suggestions + warnings)

All types in [src/types/](../src/types/).

## Adding Features

- **New rule**: Add to `config.rules` array with `condition()` function
- **New profile**: Add to [profiles/index.ts](../src/profiles/index.ts) with mandatorySkills/optionalSkills
- **New skill alias**: Extend `defaultSkillAliases` object
- **New penalty**: Check [rule.engine.ts](../src/core/rules/rule.engine.ts) for penalty structure
