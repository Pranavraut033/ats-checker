/**
 * LLM Module - v2 Optional LLM Support
 * Isolated, optional, backward-compatible LLM integration
 */

export { LLMManager } from "./llm.manager";
export { LLMBudgetManager } from "./llm.budget";
export { LLMSchemas } from "./llm.schemas";
export { LLMPrompts, createPrompt } from "./llm.prompts";
export {
  adaptSkillNormalizationResponse,
  adaptSectionClassificationResponse,
  adaptSuggestionEnhancementResponse,
  adaptJdClarificationResponse,
  safeExtractString,
  safeExtractArray,
  safeExtractNumber,
} from "./llm.adapters";
