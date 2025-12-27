/**
 * LLM Manager - Orchestrates all LLM operations with budget constraints
 * Provides safe fallback to v1 deterministic logic on any failure
 */

import { LLMClient, LLMConfig, LLMResult } from "../types/llm";
import { JSONSchema } from "../types/llm";
import { LLMBudgetManager } from "./llm.budget";
import { validateJsonSchema } from "./validation";

interface LLMCallOptions {
  model?: string;
  useThinking?: boolean;
  requestedTokens?: number;
}

/**
 * Core LLM manager - handles all interactions with the LLM client
 */
export class LLMManager {
  private client: LLMClient;
  private budgetManager: LLMBudgetManager;
  private config: LLMConfig;
  private timeoutMs: number;
  private warnings: string[] = [];

  constructor(config: LLMConfig) {
    this.config = config;
    this.client = config.client;
    this.budgetManager = new LLMBudgetManager(config.limits);
    this.timeoutMs = config.timeoutMs ?? 30000;
  }

  /**
   * Structured call to LLM with timeout and budget protection
   */
  async callLLM<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: JSONSchema,
    options: LLMCallOptions = {}
  ): Promise<LLMResult<T>> {
    // Attach a temporary handler to catch any unhandled rejections that may occur
    // while the LLM call is in-flight (e.g., provider rejects after we timeout).
    const onUnhandled = (reason: unknown) => {
      this.warnings.push(`Unhandled rejection during LLM call: ${String(reason)}`);
    };
    process.on("unhandledRejection", onUnhandled);

    let clientPromise: Promise<{ content: unknown; usage?: { total_tokens?: number } }> | undefined = undefined;

    try {
      // Check budget before attempting call
      const estimatedTokens = this.estimateTokens(systemPrompt, userPrompt, options.requestedTokens);

      try {
        this.budgetManager.assertCanCall(estimatedTokens);
      } catch (e) {
        const msg = `LLM budget exhausted: ${(e as Error).message}`;
        this.warnings.push(msg);
        // Ensure we remove handler shortly even on early return
        globalThis.setTimeout(() => process.removeListener("unhandledRejection", onUnhandled), 100);
        return { success: false, fallback: true, error: msg };
      }

      // Validate that JSON output is requested
      if (!this.isValidJsonSchema(schema)) {
        const msg = "Invalid JSON schema provided";
        this.warnings.push(msg);
        globalThis.setTimeout(() => process.removeListener("unhandledRejection", onUnhandled), 100);
        return { success: false, fallback: true, error: msg };
      }

      // Enforce strict JSON-only instruction
      const strictUserPrompt = `${userPrompt}\n\nReturn ONLY valid JSON matching the schema below.\nNo explanations. No markdown. No additional text.`;

      // Execute with timeout - ensure timeout is cleared if client returns first to avoid unhandled rejections
      clientPromise = this.client.createCompletion({
        model: options.useThinking
          ? this.config.models?.thinking || this.config.models?.default || "gpt-4o"
          : this.config.models?.default || "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: strictUserPrompt },
        ],
        max_tokens: options.requestedTokens || 2000,
        response_format: schema,
      });

      // Ensure client promise doesn't produce unhandled rejections if it settles later
      void clientPromise.catch(() => { });

      // Create a timeout promise that rejects after timeoutMs. Attach a noop catch
      // immediately to prevent unhandledRejection if the timer fires and no one
      // is observing the rejection later in the lifecycle.
      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = globalThis.setTimeout(() => reject(new Error(`LLM call timeout after ${this.timeoutMs}ms`)), this.timeoutMs);
        // Clear timeout when client settles to avoid the timer firing after client finishes
        void clientPromise!.finally(() => globalThis.clearTimeout(id));
      });
      // Prevent accidental unhandled rejections from the timeout promise
      void timeoutPromise.catch(() => { });

      const response = (await Promise.race([clientPromise, timeoutPromise])) as {
        content: unknown;
        usage?: { total_tokens?: number };
      };

      // Validate response structure
      if (!response || !response.content) {
        // Wait a short grace period to allow the client promise to settle (resolve/reject)
        // while our handler is registered. This prevents unhandled rejections from
        // escaping when the provider rejects/settles after we timed out.
        const graceMs = Math.min(Math.max(this.timeoutMs * 2, 100), 500);

        try {
          // Wait until either client settles or graceMs elapses
          await Promise.race([clientPromise!.catch(() => { }), new Promise((r) => setTimeout(r, graceMs))]);
        } catch (e) {
          // intentionally ignore
        } finally {
          process.removeListener("unhandledRejection", onUnhandled);
        }

        return { success: false, fallback: true, error: "Empty response from LLM" };
      }

      // Attempt to parse JSON
      let parsedContent: unknown;
      try {
        if (typeof response.content === "string") {
          parsedContent = JSON.parse(response.content);
        } else {
          parsedContent = response.content;
        }
      } catch (e) {
        const msg = `Invalid JSON in LLM response: ${(e as Error).message}`;
        this.warnings.push(msg);

        const graceMs = Math.min(Math.max(this.timeoutMs * 2, 100), 500);
        try {
          await Promise.race([clientPromise!.catch(() => { }), new Promise((r) => setTimeout(r, graceMs))]);
        } catch (e) {
          // intentionally ignore
        } finally {
          process.removeListener("unhandledRejection", onUnhandled);
        }

        return { success: false, fallback: true, error: msg };
      }

      // Validate against schema
      if (!this.validateAgainstSchema(parsedContent, schema)) {
        const msg = "LLM response does not match schema";
        this.warnings.push(msg);

        const graceMs = Math.min(Math.max(this.timeoutMs * 2, 100), 500);
        try {
          await Promise.race([clientPromise!.catch(() => { }), new Promise((r) => setTimeout(r, graceMs))]);
        } catch (e) {
          // intentionally ignore
        } finally {
          process.removeListener("unhandledRejection", onUnhandled);
        }

        return { success: false, fallback: true, error: msg };
      }

      // Record usage
      const tokensUsed = response.usage?.total_tokens || estimatedTokens;
      this.budgetManager.recordUsage(tokensUsed);

      // Success path: remove handler immediately
      process.removeListener("unhandledRejection", onUnhandled);

      return {
        success: true,
        fallback: false,
        data: parsedContent as T,
        tokensUsed,
      };
    } catch (e) {
      const msg = `LLM call failed: ${(e as Error).message}`;
      this.warnings.push(msg);

      // Wait a short grace period to allow the client promise to settle (resolve/reject)
      // while our handler is registered. This prevents unhandled rejections from
      // escaping when the provider rejects/settles after we timed out.
      const graceMs = Math.min(Math.max(this.timeoutMs * 2, 100), 500);

      try {
        await Promise.race([clientPromise!.catch(() => { }), new Promise((r) => setTimeout(r, graceMs))]);
      } catch (e) {
        // intentionally ignore
      } finally {
        process.removeListener("unhandledRejection", onUnhandled);
      }

      return { success: false, fallback: true, error: msg };
    }
  }

  /**
   * Get list of warnings from LLM operations
   */
  getWarnings(): string[] {
    return [...this.warnings];
  }

  /**
   * Get budget stats
   */
  getBudgetStats() {
    return this.budgetManager.getStats();
  }

  /**
   * Check if features are enabled
   */
  isFeatureEnabled(feature: keyof NonNullable<LLMConfig["enable"]>): boolean {
    return this.config.enable?.[feature] === true;
  }

  // ============ Private helpers ============


  /**
   * Estimate tokens for a call (rough approximation)
   * 1 token ≈ 4 characters average
   */
  private estimateTokens(systemPrompt: string, userPrompt: string, requestedTokens?: number): number {
    if (requestedTokens) {
      return requestedTokens;
    }
    const totalChars = systemPrompt.length + userPrompt.length;
    const estimatedInputTokens = Math.ceil(totalChars / 4);
    // Assume output will be 50-50 ratio with input
    return estimatedInputTokens + Math.ceil(estimatedInputTokens / 2);
  }

  /**
   * Validate that schema looks like valid JSON schema
   */
  private isValidJsonSchema(schema: JSONSchema): boolean {
    return schema && schema.type === "object" && !!(schema.properties || schema.required);
  }

  /**
   * Simple schema validation - check required fields exist
   */

  private validateAgainstSchema(data: unknown, schema: JSONSchema): boolean {
    try {
      return validateJsonSchema(data, schema);
    } catch (e) {
      // If validator throws for any reason, gracefully fallback to simple existence check
      if (typeof data !== "object" || data === null) {
        return false;
      }
      const obj = data as Record<string, unknown>;
      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in obj)) {
            return false;
          }
        }
      }
      return true;
    }
  }
}
