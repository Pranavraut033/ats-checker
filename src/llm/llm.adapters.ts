/**
 * LLM Adapters - Transform LLM responses into usable data
 * Safely extract and validate results from LLM calls
 */

/**
 * Adapter for skill normalization response
 */
export function adaptSkillNormalizationResponse(data: unknown): { input: string; normalized: string; confidence?: number }[] {
  if (!data || typeof data !== "object") {
    return [];
  }

  const obj = data as Record<string, unknown>;
  const canonicalSkills = obj.canonicalSkills;

  if (!Array.isArray(canonicalSkills)) {
    return [];
  }

  const results: { input: string; normalized: string; confidence?: number }[] = [];
  for (const item of canonicalSkills) {
    if (typeof item !== "object" || item === null) continue;
    const skill = item as Record<string, unknown>;
    const input = skill.input as string | undefined;
    const normalized = skill.normalized as string | undefined;
    const confidence = typeof skill.confidence === "number" ? skill.confidence : undefined;

    if (input && normalized) {
      results.push({ input, normalized, confidence });
    }
  }
  return results;
}

/**
 * Adapter for section classification response
 */
export function adaptSectionClassificationResponse(
  data: unknown
): { header: string; classification: string; confidence?: number }[] {
  if (!data || typeof data !== "object") {
    return [];
  }

  const obj = data as Record<string, unknown>;
  const sections = obj.sections;

  if (!Array.isArray(sections)) {
    return [];
  }

  const results: { header: string; classification: string; confidence?: number }[] = [];
  for (const item of sections) {
    if (typeof item !== "object" || item === null) continue;
    const section = item as Record<string, unknown>;
    const header = section.header as string | undefined;
    const classification = section.classification as string | undefined;
    const confidence = typeof section.confidence === "number" ? section.confidence : undefined;

    if (header && classification) {
      results.push({ header, classification, confidence });
    }
  }
  return results;
}

/**
 * Adapter for suggestion enhancement response
 */
export function adaptSuggestionEnhancementResponse(
  data: unknown
): { original: string; enhanced: string; actionable?: boolean }[] {
  if (!data || typeof data !== "object") {
    return [];
  }

  const obj = data as Record<string, unknown>;
  const suggestions = obj.suggestions;

  if (!Array.isArray(suggestions)) {
    return [];
  }

  const results: { original: string; enhanced: string; actionable?: boolean }[] = [];
  for (const item of suggestions) {
    if (typeof item !== "object" || item === null) continue;
    const suggestion = item as Record<string, unknown>;
    const original = suggestion.original as string | undefined;
    const enhanced = suggestion.enhanced as string | undefined;
    const actionable = typeof suggestion.actionable === "boolean" ? suggestion.actionable : undefined;

    if (original && enhanced) {
      results.push({ original, enhanced, actionable });
    }
  }
  return results;
}

/**
 * Adapter for JD clarification response
 */
export function adaptJdClarificationResponse(
  data: unknown
): {
  implicitSkills: string[];
  implicitExperience?: { minYears?: number; domains?: string[] };
  clarityScore?: number;
} {
  if (!data || typeof data !== "object") {
    return { implicitSkills: [] };
  }

  const obj = data as Record<string, unknown>;
  const implicitSkills = Array.isArray(obj.implicitSkills) ? obj.implicitSkills.filter((s) => typeof s === "string") : [];

  const implicitExperience =
    obj.implicitExperience && typeof obj.implicitExperience === "object"
      ? (obj.implicitExperience as Record<string, unknown>)
      : undefined;

  const minYears =
    implicitExperience && typeof (implicitExperience as Record<string, unknown>).minYears === "number"
      ? ((implicitExperience as Record<string, unknown>).minYears as number)
      : undefined;

  const domains =
    implicitExperience && Array.isArray((implicitExperience as Record<string, unknown>).domains)
      ? ((implicitExperience as Record<string, unknown>).domains as string[])
      : undefined;

  const clarityScore = typeof obj.clarityScore === "number" ? obj.clarityScore : undefined;

  return {
    implicitSkills,
    implicitExperience: minYears || domains ? { minYears, domains } : undefined,
    clarityScore,
  };
}

/**
 * Safe value extraction with type coercion
 */
export function safeExtractString(obj: unknown, key: string): string | undefined {
  if (typeof obj !== "object" || obj === null) return undefined;
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Safe array extraction
 */
export function safeExtractArray(obj: unknown, key: string): unknown[] {
  if (typeof obj !== "object" || obj === null) return [];
  const value = (obj as Record<string, unknown>)[key];
  return Array.isArray(value) ? value : [];
}

/**
 * Safe number extraction
 */
export function safeExtractNumber(obj: unknown, key: string): number | undefined {
  if (typeof obj !== "object" || obj === null) return undefined;
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}
