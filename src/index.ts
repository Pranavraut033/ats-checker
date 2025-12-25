import { parseJobDescription } from "./core/parser/jd.parser";
import { parseResume } from "./core/parser/resume.parser";
import { RuleEngine } from "./core/rules/rule.engine";
import { calculateScore } from "./core/scoring/scorer";
import { resolveConfig } from "./core/scoring/weights";
import { SuggestionEngine } from "./core/suggestions/suggestion.engine";
import { AnalyzeResumeInput, ATSAnalysisResult } from "./types/scoring";
import { ATSConfig } from "./types/config";
import { clamp } from "./utils/text";
import { defaultProfiles, defaultSkillAliases } from "./profiles";

export * from "./types";
export { defaultProfiles, defaultSkillAliases };

/**
 * Analyze a resume against a job description using deterministic, explainable rules.
 */
export function analyzeResume(input: AnalyzeResumeInput): ATSAnalysisResult {
  const resolvedConfig = resolveConfig(input.config ?? ({} as ATSConfig));
  const parsedResume = parseResume(input.resumeText, resolvedConfig);
  const parsedJob = parseJobDescription(input.jobDescription, resolvedConfig);

  const scoring = calculateScore(parsedResume, parsedJob, resolvedConfig);
  const ruleEngine = new RuleEngine(resolvedConfig);
  const ruleResult = ruleEngine.evaluate({
    resume: parsedResume,
    job: parsedJob,
    breakdown: scoring.breakdown,
    matchedKeywords: scoring.matchedKeywords,
    overusedKeywords: scoring.overusedKeywords,
  });

  const suggestionEngine = new SuggestionEngine();
  const suggestionResult = suggestionEngine.generate({
    resume: parsedResume,
    job: parsedJob,
    score: scoring,
    ruleWarnings: ruleResult.warnings,
  });

  const finalScore = clamp(scoring.score - ruleResult.totalPenalty, 0, 100);

  return {
    score: finalScore,
    breakdown: scoring.breakdown,
    matchedKeywords: scoring.matchedKeywords,
    missingKeywords: scoring.missingKeywords,
    overusedKeywords: scoring.overusedKeywords,
    suggestions: suggestionResult.suggestions,
    warnings: suggestionResult.warnings,
  };
}
