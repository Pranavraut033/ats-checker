/**
 * LLM Prompt Templates
 * Strict prompts that enforce JSON output and role clarity
 */

/**
 * System prompts for different LLM tasks
 */
export const LLMPrompts = {
  /**
   * System prompt for skill normalization
   */
  skillNormalizationSystem: `You are a technical skill normalization expert.
Your task is to normalize and canonicalize technical skill names.
Handle aliases, abbreviations, and variations.
Be conservative - only group skills that are genuinely synonymous.
Return ONLY valid JSON.`,

  /**
   * User prompt for skill normalization
   */
  skillNormalizationUser: (skills: string[]) => `Normalize these skills:
${skills.map((s) => `- ${s}`).join("\n")}

Return the canonical names with confidence scores.`,

  /**
   * System prompt for section classification
   */
  sectionClassificationSystem: `You are a resume section classifier.
Classify ambiguous section headers into standard resume categories.
Be strict - if uncertain, classify as "other".
Provide confidence scores.
Return ONLY valid JSON.`,

  /**
   * User prompt for section classification
   */
  sectionClassificationUser: (headers: string[]) => `Classify these resume section headers:
${headers.map((h) => `- "${h}"`).join("\n")}

Use categories: summary, experience, skills, education, projects, certifications, other.`,

  /**
   * System prompt for suggestion enhancement
   */
  suggestionEnhancementSystem: `You are a resume advice expert.
Improve suggestions to be more actionable and specific.
Maintain the core message but make it more concrete.
Return ONLY valid JSON.`,

  /**
   * User prompt for suggestion enhancement
   * IMPORTANT: Includes strict JSON schema to ensure consistent output across all LLM providers
   */
  suggestionEnhancementUser: (suggestions: string[]) => `Enhance these suggestions for clarity and actionability:
${suggestions.map((s) => `- ${s}`).join("\n")}

Make them specific and measurable where possible.

CRITICAL: You MUST return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "suggestions": [
    {
      "original": "the original suggestion text",
      "enhanced": "your improved, more actionable version",
      "actionable": true
    }
  ]
}`,

  /**
   * System prompt for JD clarification
   */
  jdClarificationSystem: `You are a job description analyzer.
Extract implicit requirements not explicitly stated.
Be conservative - stick to reasonable inferences.
Rate the clarity of the job description.
Return ONLY valid JSON.`,

  /**
   * User prompt for JD clarification
   */
  jdClarificationUser: (jd: string) => `Analyze this job description for implicit requirements:

${jd}

What skills are implied but not explicitly mentioned?
What experience domains are indicated?
How clear is this job description (0-1)?`,
};

/**
 * Create a structured prompt for a task
 */
export function createPrompt(
  systemBase: string,
  userBuilder: (input: string) => string,
  input: string
): { system: string; user: string } {
  return {
    system: systemBase,
    user: userBuilder(input),
  };
}
