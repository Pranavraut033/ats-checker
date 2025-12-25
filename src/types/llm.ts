/**
 * LLM v2 Support Types - Optional, Backward Compatible
 */

import type { ATSConfig } from "./config";

/**
 * JSON Schema for response validation
 */
export interface JSONSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  items?: unknown;
  [key: string]: unknown;
}

/**
 * LLM Client abstraction - user provides their own implementation
 * This allows flexibility with different LLM providers without direct dependencies
 */
export interface LLMClient {
  /**
   * Create a structured completion from the LLM
   * Must validate and return only valid JSON matching the schema
   */
  createCompletion(input: {
    model: string;
    messages: {
      role: "system" | "user";
      content: string;
    }[];
    max_tokens: number;
    response_format: JSONSchema;
  }): Promise<{
    content: unknown;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  }>;
}

/**
 * LLM budget configuration - prevents runaway spending
 */
export interface LLMBudget {
  maxCalls: number;
  maxTokensPerCall: number;
  maxTotalTokens: number;
}

/**
 * Feature toggles for LLM capabilities
 */
export interface LLMFeatures {
  skillNormalization?: boolean;
  sectionClassification?: boolean;
  suggestions?: boolean;
}

/**
 * Complete LLM configuration
 */
export interface LLMConfig {
  /** User-provided LLM client (e.g., OpenAI wrapper) */
  client: LLMClient;

  /** Model identifiers */
  models?: {
    /** Default model for fast, structured output (e.g., "gpt-4o-mini") */
    default: string;
    /** Optional thinking model for complex reasoning (e.g., "o4-mini") */
    thinking?: string;
  };

  /** Budget constraints */
  limits: LLMBudget;

  /** Which LLM features to enable */
  enable?: LLMFeatures;

  /** Request timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * Updated AnalyzeResumeInput with optional LLM support
 */
export interface AnalyzeResumeInputV2 {
  resumeText: string;
  jobDescription: string;
  config?: ATSConfig;
  llm?: LLMConfig;
}

/**
 * LLM usage tracking for debugging
 */
export interface LLMUsageStats {
  totalCalls: number;
  totalTokensUsed: number;
  callsRemaining: number;
  tokensRemaining: number;
  features: Partial<Record<keyof LLMFeatures, boolean>>;
}

/**
 * Result of an LLM operation (with fallback info)
 */
export interface LLMResult<T> {
  success: boolean;
  data?: T;
  fallback: boolean;
  error?: string;
  tokensUsed?: number;
}
