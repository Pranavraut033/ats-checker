# Release Notes

## v2.0.0 — 2026-07-15

**ATS Checker now scores how well your resume actually parses — not just what's on it.**

- **New parseability score** — tables, multi-column layouts, unusual bullet styles, and scanned/image text all get flagged, since these are the #1 reason real ATS software rejects a resume before a human ever reads it. See exactly what's costing you points.
- **Typos and phrasing no longer cost you a match** — "ReactJS" now matches "React", "developing" matches "develop", and so on, out of the box.
- **Skills are found everywhere in your resume**, not just a dedicated Skills section — mentioning a tool in a bullet point now counts, and each skill is tied to the specific role you used it in.
- **Seniority and career-gap awareness** — see how your experience level stacks up against what the role requires, and get a heads-up on any employment gaps.
- **A much bigger vocabulary** — the built-in skill/keyword list grew from 171 to 407 terms, covering more cloud, security, data, and soft-skill vocabulary.
- **Smarter missing-contact-info detection** — a resume with no reachable email is now treated as the near-disqualifier it is with real ATS software, not a minor warning.

> **Heads up:** scores from this version won't exactly match v1.x scores for the same resume — the model is meaningfully more realistic now, and the default weighting changed to make room for the new parseability score. If you depend on exact score values, re-baseline after upgrading.

## v1.4.0 — 2026-07-12

**Smarter gap-checking: ATS Checker now flags experience mismatches and a missing contact email.**

- **Catch experience gaps** — if a job description asks for "5+ years of React" and your resume doesn't show it, you'll see the gap called out.
- **Missing contact email warning** — get a heads-up if your resume doesn't list a way for recruiters to reach you.

Both checks are informational and never change your score.

## v1.3.3 — 2026-06-24

**ATS Checker is here: a zero-dependency library and web UI that scores your resume against a job description the way applicant tracking systems do.**

- **Score your resume instantly** — get a weighted breakdown across skills, experience, keywords, and education, plus concrete suggestions to improve it.
- **PDF support with OCR fallback** — paste a scanned or image-based PDF resume and it still gets parsed and scored.
- **Multi-language keyword matching** — English, German, and French resumes and job descriptions are recognized out of the box.
- **See your parsed experience** — the UI now shows your extracted job entries (title, company, dates) so you can confirm the parser read your resume correctly.
- **Optional AI-powered suggestions** — bring your own LLM client to get richer, natural-language suggestions. Your score is always deterministic and never affected by the AI.
- **Runs entirely in your browser** — no backend, no data leaves your machine.

Try it at the hosted demo linked in the [README](README.md).
