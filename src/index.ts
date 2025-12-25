import { parseJobDescription } from "./core/parser/jd.parser";
import { parseResume } from "./core/parser/resume.parser";
import { RuleEngine } from "./core/rules/rule.engine";
import { calculateScore } from "./core/scoring/scorer";
import { resolveConfig } from "./core/scoring/weights";
import { SuggestionEngine } from "./core/suggestions/suggestion.engine";
import { AnalyzeResumeInput, ATSAnalysisResult } from "./types/scoring";
import { ATSConfig } from "./types/config";
import { LLMConfig } from "./types/llm";
import { clamp } from "./utils/text";
import { defaultProfiles, defaultSkillAliases } from "./profiles";
import { LLMManager, LLMSchemas, LLMPrompts, adaptSuggestionEnhancementResponse } from "./llm";

export * from "./types";
export { defaultProfiles, defaultSkillAliases };
export * from "./llm";

/**
 * Analyze a resume against a job description using deterministic, explainable rules.
 * Optional LLM config enables v2 features while maintaining full backward compatibility.
 *
 * @param input Resume, job description, and optional LLM config
 * @returns ATS analysis result with score, breakdown, and suggestions
 *
 * @example
 * // v1 behavior - deterministic only
 * const result = analyzeResume({ resumeText, jobDescription });
 *
 * @example
 * // v2 with LLM - enhanced suggestions
 * const result = analyzeResume({
 *   resumeText,
 *   jobDescription,
 *   llm: { client, limits: { maxCalls: 3, maxTokensPerCall: 2000, maxTotalTokens: 5000 } }
 * });
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

  let suggestions = suggestionResult.suggestions;
  const llmWarnings: string[] = [];

  // V2: Optional LLM enhancement of suggestions (deterministic scores unchanged)
  if (input.llm && suggestionResult.suggestions.length > 0) {
    const llmResult = enhanceSuggestionsWithLLM(input.llm, suggestionResult.suggestions);
    if (llmResult.success) {
      suggestions = llmResult.enhancedSuggestions || suggestions;
    }
    llmWarnings.push(...llmResult.warnings);
  }

  const finalScore = clamp(scoring.score - ruleResult.totalPenalty, 0, 100);

  return {
    score: finalScore,
    breakdown: scoring.breakdown,
    matchedKeywords: scoring.matchedKeywords,
    missingKeywords: scoring.missingKeywords,
    overusedKeywords: scoring.overusedKeywords,
    suggestions,
    warnings: [...suggestionResult.warnings, ...llmWarnings],
  };
}

/**
 * Internal: Enhance suggestions using LLM if configured
 * Failure gracefully falls back to deterministic suggestions
 */
function enhanceSuggestionsWithLLM(
  config: LLMConfig,
  suggestions: string[]
): { success: boolean; enhancedSuggestions?: string[]; warnings: string[] } {
  if (!config.enable?.suggestions) {
    return { success: false, warnings: [] };
  }

  const warnings: string[] = [];

  try {
    const llmManager = new LLMManager(config);

    // Use synchronous approach - we'll make this async-friendly in future
    // For now, we need to return synchronously, so we use a fallback pattern
    // In production, the calling code should make this async
    warnings.push(
      "LLM suggestion enhancement skipped - use async analyzeResumeAsync for LLM features"
    );

    return { success: false, warnings };
  } catch (e) {
    warnings.push(`Failed to enhance suggestions: ${(e as Error).message}`);
    return { success: false, warnings };
  }
}

/**
 * Async version: Analyze a resume with full LLM support
 * This version properly handles async LLM calls
 *
 * @param input Resume, job description, and optional LLM config
 * @returns Promise<ATSAnalysisResult>
 *
 * @example
 * const result = await analyzeResumeAsync({
 *   resumeText,
 *   jobDescription,
 *   llm: { client, limits: {...}, enable: { suggestions: true } }
 * });
 */
export async function analyzeResumeAsync(input: AnalyzeResumeInput): Promise<ATSAnalysisResult> {
  // First pass: deterministic v1 logic
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

  let suggestions = suggestionResult.suggestions;
  const llmWarnings: string[] = [];

  // V2: Optional async LLM enhancement
  if (input.llm && suggestionResult.suggestions.length > 0) {
    const llmResult = await enhanceSuggestionsWithLLMAsync(
      input.llm,
      suggestionResult.suggestions
    );
    if (llmResult.success) {
      suggestions = llmResult.enhancedSuggestions || suggestions;
    }
    llmWarnings.push(...llmResult.warnings);
  }

  const finalScore = clamp(scoring.score - ruleResult.totalPenalty, 0, 100);

  return {
    score: finalScore,
    breakdown: scoring.breakdown,
    matchedKeywords: scoring.matchedKeywords,
    missingKeywords: scoring.missingKeywords,
    overusedKeywords: scoring.overusedKeywords,
    suggestions,
    warnings: [...suggestionResult.warnings, ...llmWarnings],
  };
}

/**
 * Internal async: Enhance suggestions using LLM
 */
async function enhanceSuggestionsWithLLMAsync(
  config: LLMConfig,
  suggestions: string[]
): Promise<{ success: boolean; enhancedSuggestions?: string[]; warnings: string[] }> {
  if (!config.enable?.suggestions) {
    return { success: false, warnings: [] };
  }

  const warnings: string[] = [];

  try {
    const llmManager = new LLMManager(config);

    const result = await llmManager.callLLM(
      LLMPrompts.suggestionEnhancementSystem,
      LLMPrompts.suggestionEnhancementUser(suggestions),
      LLMSchemas.suggestionEnhancement,
      { requestedTokens: 2000 }
    );

    if (!result.success || !result.data) {
      if (result.error) {
        warnings.push(`LLM suggestion enhancement failed: ${result.error}`);
      }
      return { success: false, warnings: [...warnings, ...llmManager.getWarnings()] };
    }

    const enhanced = adaptSuggestionEnhancementResponse(result.data);
    const enhancedSuggestions = enhanced
      .filter((e) => e.actionable !== false)
      .map((e) => e.enhanced);

    if (enhancedSuggestions.length === 0) {
      warnings.push("LLM returned no actionable enhanced suggestions");
      return { success: false, warnings: [...warnings, ...llmManager.getWarnings()] };
    }

    return {
      success: true,
      enhancedSuggestions,
      warnings: llmManager.getWarnings(),
    };
  } catch (e) {
    warnings.push(`Unexpected error in LLM enhancement: ${(e as Error).message}`);
    return { success: false, warnings };
  }
}
