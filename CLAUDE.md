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
  → calculateScore        (weighted: skills / experience / keywords / parseability / education)
  → RuleEngine.evaluate   (penalty system for ATS violations)
  → SuggestionEngine.generate
  → [optional] LLMManager.callLLM   (enhances suggestions only, never touches scores)
  → return ATSAnalysisResult
```

**Core modules:**

- `src/core/parser/` — section detection (header aliases + trailing-punctuation/date tolerance + fuzzy fallback), whole-document skill extraction (skills section + experience bullets + summary, per-role dated), contact/seniority/employment-gap parsing, header-scoped JD `Requirements:`/`Preferred:` block detection
- `src/core/scoring/scorer.ts` — five sub-scores (`skills`, `experience`, `keywords`, `parseability`, `education`); `scoreParseability()` is the "real ATS reject reason" dimension (tables/columns/special-chars/scanned-text/contact/section-count deductions, itemized in `ATSAnalysisResult.parseabilityReport`)
- `src/core/scoring/weights.ts` — `resolveConfig()` merges user `ATSConfig` with defaults; always call this before passing config anywhere. Also resolves `matching.fuzzy` (default `true`)
- `src/core/rules/rule.engine.ts` — pluggable penalty rules via `ATSConfig.rules[]`; table-formatting penalty reads `resume.formatting.hasTables` (parser-computed) rather than re-deriving it
- `src/core/suggestions/` — deterministic suggestion generation
- `src/llm/` — optional LLM layer; isolated so failures fall back to deterministic output
- `src/profiles/` — `defaultKeywordRegistry` (407 categorized canonical/aliases/category entries) and derived `defaultSkillAliases`
- `src/lang/en/`, `src/lang/de/` — installable `KeywordRegistry` packs exported as `./en` / `./de` subpaths; canonical terms stay English, aliases are localized
- `src/utils/match.ts` — hand-rolled `stem()`/`fuzzyEqual()` (bounded Levenshtein); zero-dependency fuzzy matching used by `normalizeSkill(..., { fuzzy: true })`
- `src/utils/titles.ts` — `inferSeniority()`, `titleMatch()` (stemmed/synonym role-title coverage), `normalizeTitle()`
- `src/utils/languages.ts` — `parseLanguageMentions()` (CEFR/descriptive spoken-language proficiency parsing) and `diffLanguages()` (rank comparison); informational only, never feeds `score`/`breakdown`
- `src/types/` — all shared types; re-exported from `src/index.ts`

**LLM integration** (`src/llm/`):

- `LLMManager` — budget-controlled wrapper around any `LLMClient` (caller-supplied)
- `LLMBudgetManager` — enforces `maxCalls / maxTokensPerCall / maxTotalTokens`
- `LLMSchemas` / `LLMPrompts` — JSON schema + prompt constants
- Only `analyzeResumeAsync` actually uses LLM; the sync `analyzeResume` skips it

## Key Patterns

- **Always use `resolveConfig()`** before passing config to parsers/engines — never pass raw `ATSConfig`. It merges `keywordRegistry` over `defaultKeywordRegistry` (by canonical term), builds `categoryIndex`, and resolves `matching.fuzzy` (default `true`).
- **Skills must be normalized** via `normalizeSkills()` from `src/utils/skills.ts` before comparison. `normalizeSkill()` is Map-cached per `skillAliases` object (`WeakMap`) — don't reintroduce a linear scan. Pass `{ fuzzy: true }` to fall back to stemmed/bounded-Levenshtein matching when the exact lookup misses (default off in the util itself; `resolveConfig`'s `matching.fuzzy` default turns it on for the scoring pipeline).
- **Deterministic scores are immutable** — LLM paths may only touch `suggestions`, never `score` or `breakdown`. `parseability` is the one new scored dimension in v2; everything else added (`seniorityMatch`, `employmentGaps`, `perSkillExperience`) stays informational like `skillExperienceGaps` always has.
- **Keyword scoring is weighted**, not a flat coverage ratio — see `keywordWeightOf()` in `scorer.ts` (location: required > preferred > body, plus a frequency bonus).
- **`skillExperienceGaps`** now derives from `perSkillExperience` (per-role dating — which specific roles' bullets mention the skill), not the resume's overall `totalExperienceYears`. Both `skillExperienceGaps` and contact-email detection (`resume.contact`, `sectionPenalties.missingContact`, default `12`) are informational except that `missingContact` also feeds the `parseability` score and rule-engine penalty — the field is dual-purpose, don't assume "informational" means "score-inert" for contact specifically.
- Tests are end-to-end against `analyzeResume()` with realistic text; mock LLM for deterministic tests.
- Build target is dual ESM/CJS (`tsup`); `dist/` is published, `ui/public/dist/` is the dev UI copy.
