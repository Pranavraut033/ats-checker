# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # tsup → ESM + CJS bundles, then copies to ui/public/dist
npm run test           # vitest run (single pass)
npm run test:watch     # vitest interactive
npm run type-check     # tsc --noEmit
npm run dev            # static UI at http://localhost:3005
```

Run a single test file: `npx vitest run tests/analyzeResume.test.ts`

## Architecture

Zero-dependency TypeScript library. Pipeline in `src/index.ts`:

```
parseResume / parseJobDescription
  → calculateScore        (weighted: skills / experience / keywords / education)
  → RuleEngine.evaluate   (penalty system for ATS violations)
  → SuggestionEngine.generate
  → [optional] LLMManager.callLLM   (enhances suggestions only, never touches scores)
  → return ATSAnalysisResult
```

**Core modules:**

- `src/core/parser/` — section detection, skill/keyword extraction from raw text
- `src/core/scoring/weights.ts` — `resolveConfig()` merges user `ATSConfig` with defaults; always call this before passing config anywhere
- `src/core/rules/rule.engine.ts` — pluggable penalty rules via `ATSConfig.rules[]`
- `src/core/suggestions/` — deterministic suggestion generation
- `src/llm/` — optional LLM layer; isolated so failures fall back to deterministic output
- `src/profiles/` — `defaultKeywordRegistry` (categorized canonical/aliases/category entries) and derived `defaultSkillAliases`
- `src/lang/en/`, `src/lang/de/` — installable `KeywordRegistry` packs exported as `./en` / `./de` subpaths; canonical terms stay English, aliases are localized
- `src/utils/languages.ts` — `parseLanguageMentions()` (CEFR/descriptive spoken-language proficiency parsing) and `diffLanguages()` (rank comparison); informational only, never feeds `score`/`breakdown`
- `src/types/` — all shared types; re-exported from `src/index.ts`

**LLM integration** (`src/llm/`):

- `LLMManager` — budget-controlled wrapper around any `LLMClient` (caller-supplied)
- `LLMBudgetManager` — enforces `maxCalls / maxTokensPerCall / maxTotalTokens`
- `LLMSchemas` / `LLMPrompts` — JSON schema + prompt constants
- Only `analyzeResumeAsync` actually uses LLM; the sync `analyzeResume` skips it

## Key Patterns

- **Always use `resolveConfig()`** before passing config to parsers/engines — never pass raw `ATSConfig`. It merges `keywordRegistry` over `defaultKeywordRegistry` (by canonical term) and builds `categoryIndex`.
- **Skills must be normalized** via `normalizeSkills()` from `src/utils/skills.ts` before comparison. `normalizeSkill()` is Map-cached per `skillAliases` object (`WeakMap`) — don't reintroduce a linear scan.
- **Deterministic scores are immutable** — LLM paths may only touch `suggestions`, never `score` or `breakdown`.
- **Keyword scoring is weighted**, not a flat coverage ratio — see `keywordWeightOf()` in `scorer.ts` (location: required > preferred > body, plus a frequency bonus).
- Tests are end-to-end against `analyzeResume()` with realistic text; mock LLM for deterministic tests.
- Build target is dual ESM/CJS (`tsup`); `dist/` is published, `ui/public/dist/` is the dev UI copy.
