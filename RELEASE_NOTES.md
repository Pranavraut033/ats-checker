# Release Notes

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
