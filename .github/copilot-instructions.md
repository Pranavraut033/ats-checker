# ATS Checker - AI Agent Instructions

## Architecture Overview

This is a zero-dependency TypeScript library for ATS (Applicant Tracking System) compatibility analysis. The core flow is:

1. Parse resume/job description text → extract structured data
2. Calculate deterministic scores (skills/experience/keywords/education)
3. Apply rule-based penalties (missing sections, keyword stuffing)
4. Generate suggestions → optionally enhance with LLM
5. Return score (0-100), breakdown, keywords, suggestions, warnings

**Key Components:**

- `src/index.ts` - Main `analyzeResume()` entry point
- `src/core/parser/` - Text parsing (resumes/JDs) with section detection
- `src/core/rules/rule.engine.ts` - Penalty system for ATS violations
- `src/core/scoring/` - Weighted scoring calculations
- `src/core/suggestions/` - Actionable improvement suggestions
- `src/llm/` - Optional LLM enhancement (isolated, backward-compatible)
- `src/profiles/` - Industry-specific skill sets and aliases

## Critical Workflows

- **Build**: `npm run build` (tsup bundles to ESM/CJS)
- **Test**: `npm run test` (vitest) - focus on deterministic scoring tests
- **Dev UI**: `npm run dev` (serves `ui/public` static UI at http://localhost:3005)
- **Type Check**: `npm run type-check` (tsc --noEmit)

## Project-Specific Patterns

### Configuration System

Use `resolveConfig()` from `src/core/scoring/weights.ts` to merge user config with defaults. Always pass resolved config to parsers/engines.

```typescript
const resolvedConfig = resolveConfig(input.config ?? ({} as ATSConfig));
```

### Skill Normalization

Skills are normalized using aliases from `src/profiles/index.ts`. Always use `normalizeSkills()` from `src/utils/skills.ts` for consistent matching.

### Section Detection

Resumes use section aliases (e.g., "work experience" → "experience"). See `SECTION_ALIASES` in `src/core/parser/resume.parser.ts`.

### Rule Engine

Rules apply penalties via `RuleEngine.evaluate()`. Context includes parsed data + scoring results. Rules are configurable via `ATSConfig.rules[]`.

### LLM Integration (Optional)

LLM enhancement is isolated in `src/llm/`. Use `LLMManager` with budget controls. Failures gracefully fall back to deterministic suggestions.

### Testing Conventions

Tests focus on end-to-end `analyzeResume()` calls with realistic resume/JD text. Mock LLM calls for deterministic testing. See `tests/analyzeResume.test.ts` for examples.

## Integration Points

- **UI Server**: `ui/server.ts` implements minimal OpenAI client for web interface
- **Exports**: All public APIs exported from `src/index.ts`
- **Types**: Centralized in `src/types/` with re-exports
- **Utils**: Pure functions in `src/utils/` (dates, text, skills)

## Common Pitfalls

- Don't modify deterministic scores when adding LLM features
- Always use resolved config, never raw user input
- Skills must be normalized before comparison
- Rules operate on parsed data + scoring context
- LLM calls are optional and should fail gracefully
