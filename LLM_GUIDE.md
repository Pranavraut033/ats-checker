# ATS Checker — LLM Support Guide

## Overview

ATS Checker adds **optional** LLM capabilities while maintaining 100% backward compatibility with the deterministic core (v1). The LLM is never responsible for the final score—it only enhances suggestions and provides insights.

**Key Principles:**
- ✅ Deterministic ATS score (v1 unchanged)
- ✅ Optional LLM features (opt-in via config)
- ✅ Budget-bounded (configurable token/call limits)
- ✅ Structured output (JSON schemas)
- ✅ Graceful fallback (deterministic if LLM fails)
- ✅ No hidden dependencies (you provide the LLM client)

---

## Quick Start

### v1 Behavior (No LLM)

```typescript
import { analyzeResume } from "@pranavraut033/ats-checker";

const result = analyzeResume({
  resumeText: "...",
  jobDescription: "..."
});

console.log(result.score); // 0-100 (unchanged, deterministic)
```

**No changes needed.** v1 calls work exactly as before.

---

### Async with LLM (Optional)

```typescript
import { analyzeResumeAsync } from "@pranavraut033/ats-checker";
import type { LLMClient } from "@pranavraut033/ats-checker";

// Provide your own LLM client (example: OpenAI wrapper)
const myLLMClient: LLMClient = {
  async createCompletion(input) {
    // Call your LLM provider (OpenAI, Claude, etc.)
    const response = await openai.beta.messages.create({
      model: input.model,
      messages: input.messages,
      max_tokens: input.max_tokens,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "output",
          schema: input.response_format as any,
          strict: true
        }
      }
    });
    
    return {
      content: response.content[0].type === "text" ? response.content[0].text : "",
      usage: {
        total_tokens: response.usage.input_tokens + response.usage.output_tokens
      }
    };
  }
};

const result = await analyzeResumeAsync({
  resumeText: "...",
  jobDescription: "...",
  llm: {
    client: myLLMClient,
    models: {
      default: "gpt-4o-mini",      // Fast, structured output
      thinking: "o4-mini"          // Optional, for complex reasoning
    },
    limits: {
      maxCalls: 5,                 // Max LLM calls
      maxTokensPerCall: 2000,      // Per-call token limit
      maxTotalTokens: 10000        // Total token budget
    },
    enable: {
      suggestions: true            // Enhance suggestion wording
      // skillNormalization: false  (not yet implemented)
      // sectionClassification: false (not yet implemented)
    }
  }
});

console.log(result.score);           // Same as v1 (LLM doesn't change score)
console.log(result.suggestions);     // Enhanced by LLM
console.log(result.warnings);        // Includes LLM fallback warnings
```

---

## LLM Configuration

### `LLMConfig` Interface

```typescript
interface LLMConfig {
  // Required: Your LLM client implementation
  client: LLMClient;

  // Optional: Model identifiers
  models?: {
    default: string;   // e.g., "gpt-4o-mini"
    thinking?: string; // e.g., "o4-mini" (optional)
  };

  // Required: Budget limits to prevent runaway costs
  limits: {
    maxCalls: number;              // e.g., 5
    maxTokensPerCall: number;      // e.g., 2000
    maxTotalTokens: number;        // e.g., 10000
  };

  // Optional: Which features to enable
  enable?: {
    skillNormalization?: boolean;      // Normalize skill names
    sectionClassification?: boolean;   // Classify non-standard headers
    suggestions?: boolean;             // Enhance suggestion phrasing
  };

  // Optional: Request timeout
  timeoutMs?: number;  // e.g., 30000 (default)
}
```

### `LLMClient` Interface

You provide the implementation. It's a simple abstraction:

```typescript
interface LLMClient {
  createCompletion(input: {
    model: string;
    messages: Array<{ role: "system" | "user"; content: string }>;
    max_tokens: number;
    response_format: JSONSchema;  // Enforce structured output
  }): Promise<{
    content: unknown;  // JSON content
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  }>;
}
```

---

## Example: OpenAI Client Adapter

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { LLMClient } from "@pranavraut033/ats-checker";

export const createAnthropicClient = (apiKey: string): LLMClient => {
  const client = new Anthropic({ apiKey });

  return {
    async createCompletion(input) {
      // Anthropic requires the schema in system prompt for JSON mode
      const schemaStr = JSON.stringify(input.response_format);
      const messages = [
        {
          role: "user" as const,
          content: `${input.messages[0].content}\n\nRespond with JSON matching this schema:\n${schemaStr}`
        }
      ];

      const response = await client.messages.create({
        model: input.model,
        max_tokens: input.max_tokens,
        system: input.messages[0].role === "system" ? input.messages[0].content : undefined,
        messages: messages
      });

      return {
        content: response.content[0].type === "text" ? response.content[0].text : "",
        usage: {
          total_tokens: response.usage.input_tokens + response.usage.output_tokens
        }
      };
    }
  };
};
```

---

## Budget Management

The LLM budget manager prevents runaway costs:

```typescript
// Example: Strict budget
const result = await analyzeResumeAsync({
  resumeText: "...",
  jobDescription: "...",
  llm: {
    client: myLLMClient,
    limits: {
      maxCalls: 2,           // At most 2 LLM calls
      maxTokensPerCall: 500, // Short responses
      maxTotalTokens: 1000   // ~$0.01 with gpt-4o-mini
    },
    enable: { suggestions: true }
  }
});

// If budget exceeded → suggestions fallback to deterministic
```

---

## Structured Output & Schemas

Every LLM call enforces a JSON schema:

### Suggestion Enhancement Schema

```json
{
  "type": "object",
  "properties": {
    "suggestions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "original": { "type": "string" },
          "enhanced": { "type": "string" },
          "actionable": { "type": "boolean" }
        },
        "required": ["original", "enhanced"]
      }
    }
  },
  "required": ["suggestions"]
}
```

Schemas are provided in:

```typescript
import { LLMSchemas } from "@pranavraut033/ats-checker";

console.log(LLMSchemas.suggestionEnhancement);
console.log(LLMSchemas.skillNormalization);
console.log(LLMSchemas.sectionClassification);
```

---

## Error Handling & Fallback

The library gracefully falls back to v1 logic if anything fails:

```typescript
const result = await analyzeResumeAsync({
  resumeText: "...",
  jobDescription: "...",
  llm: {
    client: brokenLLMClient,  // Fails
    limits: { ... }
  }
});

// result.score → unchanged (deterministic)
// result.suggestions → deterministic (not enhanced)
// result.warnings → includes LLM error messages
console.log(result.warnings[0]); // "LLM call failed: timeout"
```

---

## Async vs Sync

- **`analyzeResume()`** - Synchronous, v1 only (or skip LLM)
- **`analyzeResumeAsync()`** - Async, supports full LLM features

```typescript
// Sync (v1 only)
const result1 = analyzeResume({ resumeText, jobDescription });

// Async (v2 with LLM)
const result2 = await analyzeResumeAsync({ 
  resumeText, 
  jobDescription, 
  llm: { ... } 
});
```

---

## What LLM Can Do

✅ **Allowed:**
- Enhance suggestion wording
- Normalize skill synonyms
- Classify non-standard resume headers
- Clarify ambiguous JD language

❌ **Never:**
- Generate the final ATS score
- Rank candidates
- Make hiring decisions
- Introduce bias

---

## Testing & Mocking

```typescript
import type { LLMClient } from "@pranavraut033/ats-checker";
import { vi } from "vitest";

const mockLLMClient: LLMClient = {
  createCompletion: vi.fn(async () => ({
    content: JSON.stringify({
      suggestions: [
        { original: "Test", enhanced: "Improved test", actionable: true }
      ]
    }),
    usage: { total_tokens: 100 }
  }))
};

const result = await analyzeResumeAsync({
  resumeText: "...",
  jobDescription: "...",
  llm: {
    client: mockLLMClient,
    limits: { maxCalls: 5, maxTokensPerCall: 2000, maxTotalTokens: 10000 }
  }
});

expect(mockLLMClient.createCompletion).toHaveBeenCalled();
```

---

## Migration Path

### From sync to async

No breaking changes. Your existing sync (v1) code works unchanged:

```typescript
// v1.0 code (still works in v2)
const result = analyzeResume({ resumeText, jobDescription });
```

### Adopting LLM

Gradually add LLM features:

```typescript
// Step 1: Switch to async version
const result = await analyzeResumeAsync({ resumeText, jobDescription });

// Step 2: Add LLM client
const result = await analyzeResumeAsync({
  resumeText,
  jobDescription,
  llm: { client, limits: { ... } }
});

// Step 3: Enable features
const result = await analyzeResumeAsync({
  resumeText,
  jobDescription,
  llm: {
    client,
    limits: { ... },
    enable: { suggestions: true }
  }
});
```

---

## Performance & Costs

### Token Estimation

1 token ≈ 4 characters (rough estimate)

```
resume (2KB) + JD (1KB) = 3000 chars
Input: ~750 tokens
Output: ~375 tokens (estimate)
Total per call: ~1125 tokens

gpt-4o-mini: $0.00015 / 1K tokens
Per call: ~$0.00017
5 calls: ~$0.00085 (< 1 cent)
```

### Budget Examples

```typescript
// Tight budget (~$0.01)
limits: { maxCalls: 5, maxTokensPerCall: 500, maxTotalTokens: 1000 }

// Comfortable budget (~$0.05)
limits: { maxCalls: 10, maxTokensPerCall: 2000, maxTotalTokens: 5000 }

// Generous budget (~$0.20)
limits: { maxCalls: 20, maxTokensPerCall: 5000, maxTotalTokens: 20000 }
```

---

## Architecture

```
src/
├── index.ts                      # analyzeResume + analyzeResumeAsync
├── llm/
│   ├── index.ts                  # Public exports
│   ├── llm.manager.ts            # Core orchestration + budget check
│   ├── llm.budget.ts             # Budget enforcement
│   ├── llm.schemas.ts            # JSON schemas for structured output
│   ├── llm.prompts.ts            # Strict prompt templates
│   └── llm.adapters.ts           # Response parsing
├── core/                         # v1 logic (unchanged)
│   ├── parser/
│   ├── scoring/
│   ├── rules/
│   └── suggestions/
└── types/
    ├── llm.ts                    # LLM types
    └── ...
```

---

## Debugging

Enable warning collection:

```typescript
const result = await analyzeResumeAsync({ ... llm ... });

for (const warning of result.warnings) {
  console.warn(warning);
  // "LLM suggestion enhancement failed: Invalid JSON in response"
  // "LLM call timeout after 30000ms"
}
```

---

## FAQ

**Q: Does LLM affect the final score?**
A: No. The score is always deterministic (v1 logic). LLM only enhances suggestions.

**Q: What if LLM fails?**
A: Graceful fallback. Suggestions revert to deterministic logic, warnings are added.

**Q: Can I use without OpenAI?**
A: Yes. Implement `LLMClient` for any provider (Anthropic, local models, etc.).

**Q: Is this production-ready?**
A: Yes. Budget limits, schema validation, error handling, and tests are included.

**Q: Do I need to change my code?**
A: No. v1 works unchanged. LLM is opt-in.

---

## See Also

- [Budget Manager](./src/llm/llm.budget.ts) - Token limit enforcement
- [LLM Manager](./src/llm/llm.manager.ts) - Core orchestration
- [Schemas](./src/llm/llm.schemas.ts) - JSON output validation
- [Tests](./tests/llm.test.ts) - Example usage patterns
