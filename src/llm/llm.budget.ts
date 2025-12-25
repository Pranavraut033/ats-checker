/**
 * LLM Budget Manager
 * Enforces call and token limits to prevent runaway costs
 */

import { LLMBudget } from "../types/llm";

export class LLMBudgetManager {
  private callCount: number = 0;
  private totalTokensUsed: number = 0;
  private readonly limits: LLMBudget;

  constructor(limits: LLMBudget) {
    this.limits = limits;
  }

  /**
   * Check if we can make a call with the given token estimate
   * Throws if budget would be exceeded
   */
  assertCanCall(requestedTokens: number): void {
    if (this.callCount >= this.limits.maxCalls) {
      throw new Error(
        `LLM call limit exceeded: ${this.callCount}/${this.limits.maxCalls} calls used`
      );
    }

    if (requestedTokens > this.limits.maxTokensPerCall) {
      throw new Error(
        `Requested tokens ${requestedTokens} exceeds per-call limit ${this.limits.maxTokensPerCall}`
      );
    }

    if (this.totalTokensUsed + requestedTokens > this.limits.maxTotalTokens) {
      throw new Error(
        `Total token budget exceeded: ${this.totalTokensUsed + requestedTokens}/${this.limits.maxTotalTokens}`
      );
    }
  }

  /**
   * Record actual token usage from a completed call
   */
  recordUsage(tokensUsed: number): void {
    this.callCount += 1;
    this.totalTokensUsed += tokensUsed;
  }

  /**
   * Get current budget state
   */
  getStats() {
    return {
      callsUsed: this.callCount,
      callsRemaining: Math.max(0, this.limits.maxCalls - this.callCount),
      tokensUsed: this.totalTokensUsed,
      tokensRemaining: Math.max(0, this.limits.maxTotalTokens - this.totalTokensUsed),
      totalCalls: this.limits.maxCalls,
      totalTokens: this.limits.maxTotalTokens,
    };
  }

  /**
   * Check if budget is exhausted
   */
  isExhausted(): boolean {
    return (
      this.callCount >= this.limits.maxCalls ||
      this.totalTokensUsed >= this.limits.maxTotalTokens
    );
  }

  /**
   * Reset budget (for testing)
   */
  reset(): void {
    this.callCount = 0;
    this.totalTokensUsed = 0;
  }
}
