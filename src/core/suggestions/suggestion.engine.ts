import { ResolvedATSConfig } from "../../types/config";
import { ParsedJobDescription, ParsedResume } from "../../types/parser";
import { ATSAnalysisResult } from "../../types/scoring";
import { normalizeSkill } from "../../utils/skills";
import { tokenize, unique } from "../../utils/text";
import { ScoreComputation } from "../scoring/scorer";

interface SuggestionInput {
  resume: ParsedResume;
  job: ParsedJobDescription;
  score: ScoreComputation;
  ruleWarnings: string[];
  config: ResolvedATSConfig;
}

function formatList(values: string[], max = 6): string {
  const uniqueValues = Array.from(new Set(values));
  const trimmed = uniqueValues.slice(0, max);
  return trimmed.join(", ") + (uniqueValues.length > max ? "..." : "");
}

// Resume term whose canonical matches a JD keyword but whose surface form differs from the
// JD's own wording — e.g. resume says "js", JD says "JavaScript". Capped to keep suggestions short.
function buildAliasReplacementSuggestions(
  resume: ParsedResume,
  job: ParsedJobDescription,
  config: ResolvedATSConfig
): string[] {
  const jobKeywordSet = new Set(job.keywords.map((k) => normalizeSkill(k, config.skillAliases)));
  const replacements: string[] = [];
  for (const token of unique(tokenize(resume.normalizedText))) {
    const canonical = normalizeSkill(token, config.skillAliases);
    const jdSurface = job.keywordSurfaceForms[canonical];
    if (jdSurface && jobKeywordSet.has(canonical) && jdSurface.toLowerCase() !== token.toLowerCase()) {
      replacements.push(`Replace "${token}" with "${jdSurface}" to match the job description's wording.`);
    }
  }
  return unique(replacements).slice(0, 5);
}

export class SuggestionEngine {
  generate(input: SuggestionInput): Pick<ATSAnalysisResult, "suggestions" | "warnings"> {
    const suggestions: string[] = [];
    const warnings: string[] = [...input.ruleWarnings, ...input.resume.warnings];

    if (input.score.missingSkills.length > 0) {
      suggestions.push(
        `Highlight these required skills: ${formatList(input.score.missingSkills)}`
      );
    }

    if (input.score.missingKeywords.length > 0) {
      suggestions.push(
        `Incorporate job-specific keywords: ${formatList(input.score.missingKeywords)}`
      );
    }

    suggestions.push(...buildAliasReplacementSuggestions(input.resume, input.job, input.config));

    if (input.score.overusedKeywords.length > 0) {
      suggestions.push(
        `Avoid keyword stuffing for: ${formatList(input.score.overusedKeywords)}`
      );
    }

    if (input.score.missingExperienceYears > 0) {
      suggestions.push(
        `Clarify at least ${input.job.minExperienceYears ?? input.score.missingExperienceYears} years of relevant experience with quantified achievements.`
      );
    }

    if (input.job.educationRequirements.length > 0 && input.score.educationScore === 0) {
      suggestions.push(
        `State your education credentials matching: ${formatList(input.job.educationRequirements)}`
      );
    }

    if (input.resume.actionVerbs.length < 3) {
      suggestions.push(
        "Strengthen bullet points with impact verbs (led, built, improved, delivered)."
      );
    }

    if (input.resume.weakVerbs.length > 0) {
      suggestions.push(
        `Replace weak verbs (${formatList(input.resume.weakVerbs)}) with stronger ones (e.g. led, built, optimized).`
      );
    }

    if (input.score.missingLanguages.length > 0) {
      const formatted = input.score.missingLanguages
        .map((l) => (l.level ? `${l.name} (${l.level})` : l.name))
        .join(", ");
      suggestions.push(`Mention your proficiency in: ${formatted}`);
    }

    const weakAchievement = input.resume.achievements.find((a) => a.strength === "weak");
    if (weakAchievement) {
      suggestions.push(
        `Strengthen "${weakAchievement.text}" — add scope/metrics, e.g. "Built and maintained scalable services handling 500k+ requests/day."`
      );
    }

    // Long raw text but few detected sections → likely a multi-column PDF that
    // didn't parse cleanly even after line reconstruction
    if (
      input.resume.detectedSections.length < 2 &&
      input.resume.raw.trim().length > 300
    ) {
      suggestions.push(
        "Your resume may use a multi-column layout. Export as a single-column PDF or paste plain text — most ATS systems and this parser work best with a linear layout."
      );
    }

    return { suggestions, warnings };
  }
}
