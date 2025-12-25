import { ParsedJobDescription, ParsedResume } from "../../types/parser";
import { ATSAnalysisResult } from "../../types/scoring";
import { ScoreComputation } from "../scoring/scorer";

interface SuggestionInput {
  resume: ParsedResume;
  job: ParsedJobDescription;
  score: ScoreComputation;
  ruleWarnings: string[];
}

function formatList(values: string[], max = 6): string {
  const uniqueValues = Array.from(new Set(values));
  const trimmed = uniqueValues.slice(0, max);
  return trimmed.join(", ") + (uniqueValues.length > max ? "..." : "");
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

    return { suggestions, warnings };
  }
}
