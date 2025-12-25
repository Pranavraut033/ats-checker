/**
 * JSON Schemas for LLM responses
 * These enforce structured output from the LLM
 */

import { JSONSchema } from "../types/llm";

/**
 * Schema for skill normalization response
 * Example use: Normalize messy skill names from resume/JD
 */
export const skillNormalizationSchema: JSONSchema = {
  type: "object",
  properties: {
    canonicalSkills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          input: {
            type: "string",
            description: "Original skill name from input",
          },
          normalized: {
            type: "string",
            description: "Canonical/normalized skill name",
          },
          confidence: {
            type: "number",
            description: "Confidence score 0-1 that this is correct",
          },
        },
        required: ["input", "normalized"],
      },
      description: "Array of skill normalizations",
    },
  },
  required: ["canonicalSkills"],
};

/**
 * Schema for section classification response
 * Example use: Classify non-standard section headers (e.g., "My Stuff" -> "skills")
 */
export const sectionClassificationSchema: JSONSchema = {
  type: "object",
  properties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          header: {
            type: "string",
            description: "The section header text",
          },
          classification: {
            type: "string",
            enum: ["summary", "experience", "skills", "education", "projects", "certifications", "other"],
            description: "Classified section type",
          },
          confidence: {
            type: "number",
            description: "Confidence 0-1 in the classification",
          },
        },
        required: ["header", "classification"],
      },
      description: "Array of section classifications",
    },
  },
  required: ["sections"],
};

/**
 * Schema for suggestion enhancement response
 * Example use: Improve deterministic suggestions with better phrasing
 */
export const suggestionEnhancementSchema: JSONSchema = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original: {
            type: "string",
            description: "Original suggestion from deterministic engine",
          },
          enhanced: {
            type: "string",
            description: "Improved phrasing of the suggestion",
          },
          actionable: {
            type: "boolean",
            description: "Whether the suggestion is concrete and actionable",
          },
        },
        required: ["original", "enhanced"],
      },
      description: "Array of enhanced suggestions",
    },
  },
  required: ["suggestions"],
};

/**
 * Schema for JD clarification response
 * Example use: Extract implicit requirements from JD prose
 */
export const jdClarificationSchema: JSONSchema = {
  type: "object",
  properties: {
    implicitSkills: {
      type: "array",
      items: { type: "string" },
      description: "Skills implied but not explicitly mentioned",
    },
    implicitExperience: {
      type: "object",
      properties: {
        minYears: {
          type: "number",
          description: "Inferred minimum experience years",
        },
        domains: {
          type: "array",
          items: { type: "string" },
          description: "Industry domains implied",
        },
      },
      description: "Inferred experience requirements",
    },
    clarityScore: {
      type: "number",
      description: "0-1 score indicating JD clarity",
    },
  },
  required: ["implicitSkills", "clarityScore"],
};

/**
 * Schema for validation - minimal response for safe fallback testing
 */
export const validationSchema: JSONSchema = {
  type: "object",
  properties: {
    valid: {
      type: "boolean",
      description: "Whether the input is valid",
    },
    message: {
      type: "string",
      description: "Validation message",
    },
  },
  required: ["valid"],
};

/**
 * Type-safe schema accessor
 */
export const LLMSchemas = {
  skillNormalization: skillNormalizationSchema,
  sectionClassification: sectionClassificationSchema,
  suggestionEnhancement: suggestionEnhancementSchema,
  jdClarification: jdClarificationSchema,
  validation: validationSchema,
} as const;
