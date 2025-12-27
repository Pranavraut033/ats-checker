# Rules Engine

Customize ATS validation via rules that add penalties and warnings. Built-in rules cover common ATS issues; you can extend with your own logic.

## Built-in Rules

Defaults applied by the engine:
- **Missing Sections**: penalties for missing `summary` (4), `experience` (10), `skills` (8), `education` (6)
- **Formatting**: table/column-like structures detected → penalty 8
- **Keyword Stuffing**: per-overused keyword penalty (default 5× count)
- **Too Few Sections**: fewer than 3 recognizable sections → penalty 5

See implementation: [src/core/rules/rule.engine.ts](../src/core/rules/rule.engine.ts)

## Rule Context

Custom `condition` functions receive a `RuleContext` object:

```ts
interface RuleContext {
  resume: ParsedResume;        // parsed resume data
  job: ParsedJobDescription;   // parsed job description
  weights: NormalizedWeights;  // resolved weights (sum to 1)
  keywordDensity: KeywordDensityConfig; // thresholds and penalties
  breakdown?: ATSBreakdown;    // component scores
  matchedKeywords?: string[];  // in resume & JD
  overusedKeywords?: string[]; // suspected stuffing
}
```

Types are exported from the package; see [src/types](../src/types/) for details.

## Adding Custom Rules

Rules are configured via `ATSConfig.rules` and applied after built-in rules.

```ts
import { analyzeResume } from "@pranavraut033/ats-checker";

const result = analyzeResume({
  resumeText: "...",
  jobDescription: "...",
  config: {
    rules: [
      {
        id: "min-years",
        description: "Require at least 3 years experience",
        penalty: 5,
        warning: "Less than 3 years experience",
        condition: (ctx) => (ctx.resume.experienceYears ?? 0) < 3,
      },
      {
        id: "require-contact",
        description: "Require phone and email in contact info",
        penalty: 2,
        warning: "Add phone/email to contact info",
        condition: (ctx) => !ctx.resume.contactInfo?.phone || !ctx.resume.contactInfo?.email,
      },
      {
        id: "limit-overuse",
        description: "Extra penalty if more than 3 keywords flagged as overused",
        penalty: 3,
        warning: "Reduce repeated keywords",
        condition: (ctx) => (ctx.overusedKeywords?.length ?? 0) > 3,
      }
    ]
  }
});
```

Rules do not alter deterministic scoring; they add to `totalPenalty` and may append `warnings`.

## Tips

- Keep penalties proportional and explainable in `warning`
- Use `profile` to codify role-specific requirements
- Combine built-in section penalties with targeted custom rules
- Avoid rules that depend on unstable signals; prefer parsed fields and normalized skills
