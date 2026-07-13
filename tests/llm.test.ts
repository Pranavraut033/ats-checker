/**
 * LLM v2 Tests - Budget, Manager, Adapters, Integration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

import { analyzeResumeAsync } from "../src/index";
import {
  adaptSkillNormalizationResponse,
  adaptSuggestionEnhancementResponse,
} from "../src/llm/llm.adapters";
import { LLMBudgetManager } from "../src/llm/llm.budget";
import { LLMManager } from "../src/llm/llm.manager";
import { LLMSchemas } from "../src/llm/llm.schemas";

import type { LLMClient, LLMConfig } from "../src/types/llm";

// ============ Budget Manager Tests ============

describe("LLMBudgetManager", () => {
  it("tracks call count and token usage", () => {
    const budget = new LLMBudgetManager({
      maxCalls: 10,
      maxTokensPerCall: 5000,
      maxTotalTokens: 50000,
    });

    budget.assertCanCall(1000);
    budget.recordUsage(1000);

    const stats = budget.getStats();
    expect(stats.callsUsed).toBe(1);
    expect(stats.tokensUsed).toBe(1000);
    expect(stats.callsRemaining).toBe(9);
    expect(stats.tokensRemaining).toBe(49000);
  });

  it("throws when call limit exceeded", () => {
    const budget = new LLMBudgetManager({
      maxCalls: 1,
      maxTokensPerCall: 5000,
      maxTotalTokens: 50000,
    });

    budget.recordUsage(1000);

    expect(() => {
      budget.assertCanCall(1000);
    }).toThrow("call limit exceeded");
  });

  it("throws when token limit exceeded", () => {
    const budget = new LLMBudgetManager({
      maxCalls: 10,
      maxTokensPerCall: 5000,
      maxTotalTokens: 10000,
    });

    budget.recordUsage(8000);

    expect(() => {
      budget.assertCanCall(5000); // Would exceed total
    }).toThrow("Total token budget exceeded");
  });

  it("throws when per-call limit exceeded", () => {
    const budget = new LLMBudgetManager({
      maxCalls: 10,
      maxTokensPerCall: 1000,
      maxTotalTokens: 50000,
    });

    expect(() => {
      budget.assertCanCall(2000);
    }).toThrow("per-call limit");
  });

  it("identifies when budget is exhausted", () => {
    const budget = new LLMBudgetManager({
      maxCalls: 1,
      maxTokensPerCall: 5000,
      maxTotalTokens: 50000,
    });

    expect(budget.isExhausted()).toBe(false);
    budget.recordUsage(1000);
    expect(budget.isExhausted()).toBe(true);
  });

  it("resets budget for testing", () => {
    const budget = new LLMBudgetManager({
      maxCalls: 10,
      maxTokensPerCall: 5000,
      maxTotalTokens: 50000,
    });

    budget.recordUsage(5000);
    expect(budget.getStats().tokensUsed).toBe(5000);

    budget.reset();
    expect(budget.getStats().tokensUsed).toBe(0);
  });
});

// ============ LLM Manager Tests ============

describe("LLMManager", () => {
  let mockClient: LLMClient;
  let config: LLMConfig;

  beforeEach(() => {
    mockClient = {
      createCompletion: vi.fn(),
    };

    config = {
      client: mockClient,
      models: { default: "gpt-4o-mini" },
      limits: {
        maxCalls: 10,
        maxTokensPerCall: 5000,
        maxTotalTokens: 50000,
      },
      enable: { suggestions: true },
    };
  });

  it("makes successful LLM calls with valid JSON", async () => {
    const mockResponse = {
      content: JSON.stringify({
        suggestions: [
          {
            original: "Add skills",
            enhanced: "Highlight these required skills",
            actionable: true,
          },
        ],
      }),
      usage: { total_tokens: 150 },
    };

    vi.mocked(mockClient.createCompletion).mockResolvedValue(mockResponse);

    const manager = new LLMManager(config);
    const result = await manager.callLLM(
      "You are helpful",
      "Enhance this suggestion",
      LLMSchemas.suggestionEnhancement,
      { requestedTokens: 200 }
    );

    expect(result.success).toBe(true);
    expect(result.fallback).toBe(false);
    expect(result.data).toEqual({
      suggestions: [
        {
          original: "Add skills",
          enhanced: "Highlight these required skills",
          actionable: true,
        },
      ],
    });
    expect(result.tokensUsed).toBe(150);
  });

  it("fails gracefully on timeout", async () => {
    vi.mocked(mockClient.createCompletion).mockImplementation((_input: Parameters<LLMClient["createCompletion"]>[0]) => {
      const p = new Promise<{
        content: unknown;
        usage?: { total_tokens?: number };
      }>((_, reject) =>
        globalThis.setTimeout(() => reject(new Error("Timeout")), 100)
      );
      // Attach local catch to avoid unhandled rejections in test harness
      void p.catch(() => {});
      return p;
    });

    const manager = new LLMManager({ ...config, timeoutMs: 50 });
    const result = await manager.callLLM(
      "You are helpful",
      "Test",
      LLMSchemas.suggestionEnhancement
    );

    expect(result.success).toBe(false);
    expect(result.fallback).toBe(true);
    expect(result.error).toContain("timeout");
  });

  it("fails on invalid JSON response", async () => {
    vi.mocked(mockClient.createCompletion).mockResolvedValue({
      content: "not valid json",
      usage: { total_tokens: 150 },
    });

    const manager = new LLMManager(config);
    const result = await manager.callLLM(
      "System",
      "User",
      LLMSchemas.suggestionEnhancement
    );

    expect(result.success).toBe(false);
    expect(result.fallback).toBe(true);
    expect(result.error).toContain("Invalid JSON");
  });

  it("fails on schema mismatch", async () => {
    const mockResponse = {
      content: JSON.stringify({ wrong_field: "data" }),
      usage: { total_tokens: 150 },
    };

    vi.mocked(mockClient.createCompletion).mockResolvedValue(mockResponse);

    const manager = new LLMManager(config);
    const result = await manager.callLLM(
      "System",
      "User",
      LLMSchemas.suggestionEnhancement
    );

    expect(result.success).toBe(false);
    expect(result.fallback).toBe(true);
    expect(result.error).toContain("does not match schema");
  });

  it("fails when field type mismatches schema (string vs array)", async () => {
    const mockResponse = {
      content: JSON.stringify({ suggestions: "not-an-array" }),
      usage: { total_tokens: 120 },
    };

    vi.mocked(mockClient.createCompletion).mockResolvedValue(mockResponse);

    const manager = new LLMManager(config);
    const result = await manager.callLLM(
      "System",
      "User",
      LLMSchemas.suggestionEnhancement
    );

    expect(result.success).toBe(false);
    expect(result.fallback).toBe(true);
    expect(result.error).toContain("does not match schema");
  });

  it("does not produce unhandledRejection when client settles after timeout", async () => {
    let unhandled = false;
    let lastReason: unknown = undefined;
    const handler = (reason: unknown) => {
      unhandled = true;
      lastReason = reason;
      // Log to help debugging in CI

      console.error("UNHANDLED REJECTION CAPTURED:", reason);
    };
    process.once("unhandledRejection", handler);

    // client that resolves after a long delay (longer than timeout)
    vi.mocked(mockClient.createCompletion).mockImplementation((_input: Parameters<LLMClient["createCompletion"]>[0]) => {
      const p = new Promise<{
        content: unknown;
        usage?: { total_tokens?: number };
      }>((res) =>
        setTimeout(
          () =>
            res({
              content: JSON.stringify({ suggestions: [] }),
              usage: { total_tokens: 10 },
            }),
          200
        )
      );
      // Avoid unhandled rejections if this settles after manager returns
      void p.catch(() => {});
      return p;
    });

    const manager = new LLMManager({ ...config, timeoutMs: 50 });

    const result = await manager.callLLM(
      "System",
      "User",
      LLMSchemas.suggestionEnhancement
    );

    // wait enough time for any stray rejections to surface
    await new Promise((r) => setTimeout(r, 300));

    process.removeListener("unhandledRejection", handler);

    // call should have returned a fallback (timeout)
    expect(result.success).toBe(false);
    expect(result.fallback).toBe(true);

    // The whole point of this test: the late-settling client must not produce
    // an unhandled rejection once the manager has already returned its fallback.
    expect(unhandled).toBe(false);
    expect(lastReason).toBeUndefined();
  });

  it("enforces budget limits", async () => {
    const tightBudgetConfig = {
      ...config,
      limits: { maxCalls: 1, maxTokensPerCall: 5000, maxTotalTokens: 100 },
    };

    const mockResponse = {
      content: JSON.stringify({
        suggestions: [
          { original: "Test", enhanced: "Better test", actionable: true },
        ],
      }),
      usage: { total_tokens: 50 },
    };

    vi.mocked(mockClient.createCompletion).mockResolvedValue(mockResponse);

    const manager = new LLMManager(tightBudgetConfig);

    // First call succeeds
    const result1 = await manager.callLLM(
      "System",
      "User",
      LLMSchemas.suggestionEnhancement,
      { requestedTokens: 50 }
    );
    expect(result1.success).toBe(true);

    // Second call fails - no budget
    const result2 = await manager.callLLM(
      "System",
      "User",
      LLMSchemas.suggestionEnhancement,
      { requestedTokens: 50 }
    );
    expect(result2.success).toBe(false);
    expect(result2.fallback).toBe(true);
  });

  it("collects warnings from failed operations", async () => {
    vi.mocked(mockClient.createCompletion).mockResolvedValue({
      content: "invalid json",
      usage: { total_tokens: 150 },
    });

    const manager = new LLMManager(config);
    await manager.callLLM("System", "User", LLMSchemas.suggestionEnhancement);

    const warnings = manager.getWarnings();
    expect(warnings[0]).toContain("Invalid JSON");
  });

  it("checks feature enablement", () => {
    const manager = new LLMManager(config);
    expect(manager.isFeatureEnabled("suggestions")).toBe(true);
    expect(manager.isFeatureEnabled("skillNormalization")).toBe(false);
  });

  it("returns budget stats", () => {
    const manager = new LLMManager(config);
    const stats = manager.getBudgetStats();
    expect(stats.callsUsed).toBe(0);
    expect(stats.tokensUsed).toBe(0);
    expect(stats.callsRemaining).toBe(10);
  });
});

// ============ Adapter Tests ============

describe("LLM Adapters", () => {
  it("adapts skill normalization response", () => {
    const mockData = {
      canonicalSkills: [
        { input: "js", normalized: "javascript", confidence: 0.95 },
        { input: "Python", normalized: "python", confidence: 0.98 },
      ],
    };

    const result = adaptSkillNormalizationResponse(mockData);
    expect(result).toHaveLength(2);
    expect(result[0].normalized).toBe("javascript");
    expect(result[1].confidence).toBe(0.98);
  });

  it("handles malformed adaptation data gracefully", () => {
    const result = adaptSkillNormalizationResponse(null);
    expect(result).toEqual([]);

    const result2 = adaptSkillNormalizationResponse({ wrongField: [] });
    expect(result2).toEqual([]);
  });

  it("adapts suggestion enhancement response", () => {
    const mockData = {
      suggestions: [
        {
          original: "Add skills",
          enhanced: "Highlight these required skills: JavaScript, React",
          actionable: true,
        },
        {
          original: "Vague suggestion",
          enhanced: "Be more specific",
          actionable: false,
        },
      ],
    };

    const result = adaptSuggestionEnhancementResponse(mockData);
    expect(result).toHaveLength(2);
    expect(result[0].actionable).toBe(true);
    expect(result[1].actionable).toBe(false);
  });

  it("filters out non-actionable suggestions", () => {
    const mockData = {
      suggestions: [
        {
          original: "Test",
          enhanced: "Enhanced test",
          actionable: true,
        },
      ],
    };

    const result = adaptSuggestionEnhancementResponse(mockData);
    const actionable = result.filter((s) => s.actionable !== false);
    expect(actionable).toHaveLength(1);
  });
});

// ============ Integration Tests ============

describe("LLM v2 Integration", () => {
  it("maintains backward compatibility - v1 without LLM config", async () => {
    const { analyzeResume } = await import("../src/index");
    const resumeText = `Summary
Senior engineer with 5 years experience.
Skills
JavaScript, TypeScript, React
Experience
Engineer at Company (2020 - Present)
Education
B.S. Computer Science`;

    const jobDescription =
      "Looking for React engineer with 3+ years experience";

    // This should work exactly as v1 - no LLM involved
    const result = analyzeResume({
      resumeText,
      jobDescription,
      config: { referenceDate: "2026-01-01" },
    });

    expect(result.score).toBe(75.75);
    expect(result.breakdown).toEqual({
      skills: 52.49999999999999,
      experience: 100,
      keywords: 100,
      education: 100,
    });
    expect(result.suggestions).toEqual([
      "Highlight these required skills: node",
      "Avoid keyword stuffing for: engineer, react",
      "Strengthen bullet points with impact verbs (led, built, improved, delivered).",
      "Add a clearly formatted email address near the top of your resume so ATS and recruiters can contact you.",
    ]);
  });

  it("gracefully degrades when LLM disabled", async () => {
    const mockClient: LLMClient = {
      createCompletion: vi.fn(async () => ({
        content: JSON.stringify({ suggestions: [] }),
      })),
    };

    const result = await analyzeResumeAsync({
      resumeText: "Summary\nSkills\nExperience\nEducation",
      jobDescription: "Role requirements",
      llm: {
        client: mockClient,
        limits: { maxCalls: 5, maxTokensPerCall: 2000, maxTotalTokens: 10000 },
        enable: { suggestions: false }, // Disabled
      },
    });

    expect(result.score).toBe(47.5);
    expect(result.suggestions).toEqual([
      "Highlight these required skills: javascript, node, react, typescript",
      "Clarify at least 3 years of relevant experience with quantified achievements.",
      "Strengthen bullet points with impact verbs (led, built, improved, delivered).",
      "Add a clearly formatted email address near the top of your resume so ATS and recruiters can contact you.",
    ]);
    // Client should not have been called
    expect(mockClient.createCompletion).not.toHaveBeenCalled();
  });

  it("calls the LLM when suggestions are available, even for a high-match resume", async () => {
    const mockClient: LLMClient = {
      createCompletion: vi.fn(async () => ({
        content: JSON.stringify({ suggestions: [] }),
      })),
    };

    const result = await analyzeResumeAsync({
      resumeText: `Summary
Senior React Engineer
Skills
React, JavaScript, TypeScript, Node.js, GraphQL, SQL
Experience
Senior Engineer (2020 - Present) - Led React architecture
Education
B.S. Computer Science`,
      jobDescription:
        "React engineer. Required: React, JavaScript. Preferred: GraphQL.",
      llm: {
        client: mockClient,
        limits: { maxCalls: 10, maxTokensPerCall: 2000, maxTotalTokens: 50000 },
        enable: { suggestions: true },
      },
      config: { referenceDate: "2026-01-01" },
    });

    expect(result.score).toBe(78.2);
    // This resume has non-empty suggestions (keyword stuffing warning), so the LLM is invoked.
    expect(mockClient.createCompletion).toHaveBeenCalled();
  });
});
