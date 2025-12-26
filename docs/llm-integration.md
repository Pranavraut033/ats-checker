# LLM Integration

ats-checker supports optional AI enhancement for suggestions while keeping the core ATS score deterministic and unchanged.

## Overview

LLM features are completely opt-in and backward compatible. The base `analyzeResume` function works identically with or without AI. When enabled, LLMs can:

- Improve suggestion wording and specificity
- Provide more contextual feedback
- Handle complex resume formats

The ATS score remains based solely on rules, weights, and parsed data.

## Usage

Use `analyzeResumeAsync` instead of `analyzeResume` to enable LLM features.

```typescript
import { analyzeResumeAsync } from "@pranavraut033/ats-checker";

// Provide your own LLM client
const myLLMClient = {
  async createCompletion(input) {
    // Call your LLM provider (OpenAI, Anthropic, etc.)
    const response = await openai.chat.completions.create({
      model: input.model,
      messages: input.messages,
      max_tokens: input.max_tokens,
      response_format: { type: "json_object" }
    });

    return {
      content: response.choices[0].message.content,
      usage: {
        total_tokens: response.usage.total_tokens
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
      default: "gpt-4o-mini"
    },
    limits: {
      maxCalls: 3,
      maxTokensPerCall: 1000,
      maxTotalTokens: 5000
    },
    enable: {
      suggestions: true
    }
  }
});

console.log(result.score);        // Same as without LLM
console.log(result.suggestions);  // Enhanced by AI
```

## Configuration

### LLMConfig

```typescript
interface LLMConfig {
  client: LLMClient;        // Your LLM implementation
  models?: {
    default: string;        // Primary model for suggestions
    thinking?: string;      // Optional model for complex tasks
  };
  limits: {
    maxCalls: number;       // Maximum LLM API calls
    maxTokensPerCall: number; // Tokens per call
    maxTotalTokens: number; // Total token budget
  };
  enable?: {
    suggestions?: boolean;  // Enhance suggestion text
  };
  timeoutMs?: number;       // Request timeout (default: 30000ms)
}
```

### LLMClient

You must provide an LLM client that matches this interface:

```typescript
interface LLMClient {
  createCompletion(input: {
    model: string;
    messages: Array<{ role: "system" | "user"; content: string }>;
    max_tokens: number;
    response_format: any;  // JSON schema for structured output
  }): Promise<{
    content: string;       // JSON response
    usage?: {
      total_tokens?: number;
    };
  }>;
}
```

## Budget Controls

LLM calls are limited by:
- **Max Calls**: Total number of API requests
- **Tokens per Call**: Maximum tokens for each request
- **Total Tokens**: Overall token budget across all calls

If limits are exceeded, LLM features disable gracefully with a warning.

## Supported Providers

Any LLM provider can be used by implementing the `LLMClient` interface. Examples:

### OpenAI

```typescript
const openaiClient: LLMClient = {
  async createCompletion(input) {
    const response = await openai.chat.completions.create({
      model: input.model,
      messages: input.messages,
      max_tokens: input.max_tokens,
      response_format: { type: "json_object" }
    });

    return {
      content: response.choices[0].message.content || "",
      usage: { total_tokens: response.usage?.total_tokens }
    };
  }
};
```

### Anthropic

```typescript
const anthropicClient: LLMClient = {
  async createCompletion(input) {
    const schemaStr = JSON.stringify(input.response_format);
    const response = await anthropic.messages.create({
      model: input.model,
      max_tokens: input.max_tokens,
      system: input.messages.find(m => m.role === "system")?.content,
      messages: input.messages.filter(m => m.role === "user")
    });

    return {
      content: response.content[0].type === "text" ? response.content[0].text : "",
      usage: { total_tokens: response.usage?.input_tokens + response.usage?.output_tokens }
    };
  }
};
```

## Fallback Behavior

If LLM calls fail or timeout:
- Core analysis continues normally
- Suggestions fall back to deterministic versions
- A warning is added to the result
- No impact on the ATS score

## Cost Considerations

- LLM calls are optional and controlled by budgets
- Token usage is tracked and enforced
- Use smaller models like `gpt-4o-mini` for cost efficiency
- Test with low limits initially