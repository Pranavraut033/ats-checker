# Changelog

All notable changes to this project are documented in this file.

## [2.0.0] - 2026-07-15

Ships a more realistic ATS model: a new parseability dimension, re-weighted scoring, fuzzy/stem
matching on by default, a much richer parser, and a substantially expanded keyword registry.
Score/breakdown shapes change — treat this as a breaking release if you pin exact score values.

### Added
- New `parseability` scoring dimension (0-100) — deducts for table/columnar formatting, multi-column
  layout, special/control characters, non-standard bullets, likely-scanned text, an unparseable
  contact email, and too few detected sections. This is the "real ATS reject reason" the model was
  previously missing; `ATSAnalysisResult.parseabilityReport` exposes the specific deductions.
- `ATSAnalysisResult.seniorityMatch` — compares the resume's inferred seniority against the job
  description's required seniority; feeds a small, capped contribution into `breakdown.experience`
  (never penalizes when either side is unknown) and drives a new suggestion on mismatch.
- `ATSAnalysisResult.employmentGaps` — surfaces gaps of 3+ months between consecutive roles
  (informational; also now suggested on when 6+ months).
- `ATSAnalysisResult.perSkillExperience` — per-skill years of experience derived from per-role
  dating (which roles' bullets actually mention the skill), replacing the old approximation that
  assumed a matched skill spanned the resume's entire tenure. `skillExperienceGaps` now uses this
  for accuracy.
- `ATSConfig.matching` (`{ fuzzy?, threshold? }`) — stemmed/fuzzy matching for skills and keywords
  is now on by default (typos, word-form variants like "developing" vs "develop", "ReactJS" vs
  "react"); set `{ fuzzy: false }` to reproduce v1's exact-match-only behavior.
- Whole-document skill extraction (skills demonstrated in experience bullets and summary, not just
  the skills section), header-scoped JD requirement detection (`Requirements:`/`Preferred:`
  blocks), resume contact/seniority/employment-gap parsing, and per-role skill dating — all from
  the parser layer feeding the scoring changes above.
- Keyword registry expanded from 171 to 407 canonical terms across technical/tool/concept/domain/
  soft/marketing categories, with corrected canonical/alias groupings (e.g. `postgresql`/`mysql`/
  `sqlite` are now separate canonicals instead of aliases of `sql`).

### Changed
- Default scoring weights re-balanced to make room for `parseability`: skills 0.30 → 0.25,
  experience 0.30 → 0.20, education 0.15 → 0.10, keywords unchanged at 0.25, parseability new
  at 0.20.
- `experience` sub-score now uses `titleMatch()` (stemmed/synonym role-title coverage) instead of
  single-token overlap, and blends in the new seniority-match signal (capped at ~15% of the
  component).
- `education` sub-score softens the old hard 0-cliff: adjacent degree levels (e.g. holding a
  Master's when a Bachelor's is required) now earn partial credit instead of scoring 0 whenever
  the exact degree string isn't held.
- `sectionPenalties.missingContact` default raised from 0 (warning-only) to 12 — a real ATS treats
  an unparseable contact email as a near-knockout, not a minor warning.
- The formatting/table-structure rule penalty now reads from the resume's already-computed
  `FormattingSignals` instead of independently re-scanning the raw text, keeping detection to a
  single source of truth.

No new runtime dependencies were introduced — the library remains zero-dependency (fuzzy/stem
matching is hand-rolled in `src/utils/match.ts`, per the project's existing convention).

## [1.4.0] - 2026-07-12

### Added
- Detect skill-experience gaps (JD "N+ years of X" vs. resume's overall experience) and flag resumes missing a contact email. Both are informational — they don't affect `score`/`breakdown` ([8f4a928])

[8f4a928]: https://github.com/Pranavraut033/ats-checker/commit/8f4a928

## [1.3.3] - 2026-06-24

Initial changelog entry, covering the project's full history to date.

### Added
- Core ATS analysis pipeline: resume/job-description parsing, weighted scoring, rule engine, and suggestion generation ([e727caf])
- Optional async LLM enhancement layer with budget management, JSON-schema validation, and adapters — deterministic scores are never affected ([54b11c6])
- Web UI with Tailwind styling, navigation, and results visualization, later migrated to a fully client-side architecture ([be2e196], [c4558f0])
- PDF text extraction (via optional `pdfjs-dist` peer dependency), including OCR fallback for scanned PDFs and warnings for malformed extractions ([32f6e34], [0e4a81f], [ac43fac])
- `experienceEntries` field exposing parsed job entries (title, company, dates) on `ATSAnalysisResult` ([06c5355])
- Categorized keyword registry with weighted scoring, achievement-strength detection, and language-proficiency matching ([af9912f])
- Installable locale packs for keyword registries: English (`./en`) and German (`./de`) ([af8d45c])
- Improved job-description/resume parsing accuracy, plus French locale support ([47e69cf])
- GitHub Pages documentation site (MkDocs) and CI workflow ([fad0861], [b5af34a])

### Fixed
- Prevented unhandled promise rejection from a late-settling LLM client after timeout ([cfe9485])
- Bumped Node.js version for CI/CD compatibility ([89f8ab2], [c571d42])

### Changed
- Migrated web UI from an Express backend to a static, client-side architecture ([be2e196])

[e727caf]: https://github.com/Pranavraut033/ats-checker/commit/e727caf
[54b11c6]: https://github.com/Pranavraut033/ats-checker/commit/54b11c6
[be2e196]: https://github.com/Pranavraut033/ats-checker/commit/be2e196
[c4558f0]: https://github.com/Pranavraut033/ats-checker/commit/c4558f0
[32f6e34]: https://github.com/Pranavraut033/ats-checker/commit/32f6e34
[0e4a81f]: https://github.com/Pranavraut033/ats-checker/commit/0e4a81f
[ac43fac]: https://github.com/Pranavraut033/ats-checker/commit/ac43fac
[06c5355]: https://github.com/Pranavraut033/ats-checker/commit/06c5355
[af9912f]: https://github.com/Pranavraut033/ats-checker/commit/af9912f
[af8d45c]: https://github.com/Pranavraut033/ats-checker/commit/af8d45c
[47e69cf]: https://github.com/Pranavraut033/ats-checker/commit/47e69cf
[fad0861]: https://github.com/Pranavraut033/ats-checker/commit/fad0861
[b5af34a]: https://github.com/Pranavraut033/ats-checker/commit/b5af34a
[cfe9485]: https://github.com/Pranavraut033/ats-checker/commit/cfe9485
[89f8ab2]: https://github.com/Pranavraut033/ats-checker/commit/89f8ab2
[c571d42]: https://github.com/Pranavraut033/ats-checker/commit/c571d42
