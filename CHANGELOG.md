# Changelog

All notable changes to this project are documented in this file.

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
