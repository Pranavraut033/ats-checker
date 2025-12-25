/**
 * Example: OpenAI LLM Client Adapter
 * This is a reference implementation showing how to integrate with OpenAI's API.
 * 
 * Usage:
 *   import { createOpenAIClient } from './openai-client';
 *   const client = createOpenAIClient(process.env.OPENAI_API_KEY);
 *   
 *   const result = await analyzeResumeAsync({
 *     resumeText, jobDescription,
 *     llm: { client, limits: {...} }
 *   });
 */

import type { LLMClient, JSONSchema } from "@pranavraut033/ats-checker";

/**
 * Creates an OpenAI client adapter for the ATS checker
 * 
 * @param apiKey OpenAI API key
 * @returns LLMClient implementation
 * 
 * @example
 * const client = createOpenAIClient(process.env.OPENAI_API_KEY);
 * const result = await analyzeResumeAsync({
 *   resumeText: "...",
 *   jobDescription: "...",
 *   llm: {
 *     client,
 *     models: { default: "gpt-4o-mini" },
 *     limits: { maxCalls: 5, maxTokensPerCall: 2000, maxTotalTokens: 10000 },
 *     enable: { suggestions: true }
 *   }
 * });
 */
export function createOpenAIClient(apiKey: string): LLMClient {
  // Type stub - in real implementation, would import OpenAI SDK
  // import OpenAI from "openai";
  // const openai = new OpenAI({ apiKey });

  return {
    async createCompletion(input) {
      // In a real implementation:
      // const response = await openai.beta.messages.create({
      //   model: input.model,
      //   messages: input.messages,
      //   max_tokens: input.max_tokens,
      //   response_format: {
      //     type: "json_schema",
      //     json_schema: {
      //       name: "response",
      //       schema: input.response_format as Record<string, unknown>,
      //       strict: true
      //     }
      //   }
      // });

      // Mock response for demonstration
      throw new Error(
        "Not implemented. Install @openai/sdk and uncomment the implementation above."
      );
    }
  };
}

/**
 * Example: Anthropic (Claude) LLM Client Adapter
 * 
 * Usage:
 *   const client = createAnthropicClient(process.env.ANTHROPIC_API_KEY);
 */
export function createAnthropicClient(apiKey: string): LLMClient {
  // import Anthropic from "@anthropic-ai/sdk";
  // const client = new Anthropic({ apiKey });

  return {
    async createCompletion(input) {
      // Claude requires schema in system prompt or tool_use
      // const response = await client.messages.create({
      //   model: input.model,
      //   max_tokens: input.max_tokens,
      //   system: input.messages
      //     .filter(m => m.role === "system")
      //     .map(m => m.content)
      //     .join("\n"),
      //   messages: input.messages
      //     .filter(m => m.role !== "system")
      //     .map(m => ({ role: m.role, content: m.content }))
      // });
      // return {
      //   content: response.content[0].type === "text" ? response.content[0].text : "",
      //   usage: {
      //     total_tokens: response.usage.input_tokens + response.usage.output_tokens
      //   }
      // };

      throw new Error(
        "Not implemented. Install @anthropic-ai/sdk and uncomment the implementation above."
      );
    }
  };
}

/**
 * Example: Local Model (LM Studio, Ollama) Client Adapter
 * 
 * Usage:
 *   const client = createLocalModelClient("http://localhost:8000");
 */
export function createLocalModelClient(baseUrl: string): LLMClient {
  return {
    async createCompletion(input) {
      // const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     model: input.model,
      //     messages: input.messages,
      //     max_tokens: input.max_tokens,
      //     temperature: 0.7,
      //     top_p: 0.9
      //   })
      // });
      // const data = await response.json() as {
      //   choices: Array<{ message: { content: string } }>;
      //   usage?: { total_tokens: number };
      // };
      // return {
      //   content: data.choices[0].message.content,
      //   usage: { total_tokens: data.usage?.total_tokens || 0 }
      // };

      throw new Error(
        "Not implemented. Connect to your local LM Studio or Ollama server."
      );
    }
  };
}

/**
 * Example: Mock client for testing
 * 
 * Usage:
 *   const client = createMockClient();
 *   const result = await analyzeResumeAsync({
 *     resumeText, jobDescription,
 *     llm: { client, limits: {...} }
 *   });
 */
export function createMockClient(
  responseOverride?: (input: Parameters<LLMClient["createCompletion"]>[0]) => unknown
): LLMClient {
  return {
    async createCompletion(input) {
      // Return a valid response for the requested schema
      if (responseOverride) {
        return {
          content: responseOverride(input),
          usage: { total_tokens: 100 }
        };
      }

      // Default mock response based on schema
      const schemaName = input.response_format.type || "unknown";

      if (schemaName.includes("suggestion")) {
        return {
          content: {
            suggestions: [
              {
                original: "Test suggestion",
                enhanced: "Enhanced test suggestion",
                actionable: true
              }
            ]
          },
          usage: { total_tokens: 50 }
        };
      }

      if (schemaName.includes("skill")) {
        return {
          content: {
            canonicalSkills: [
              { input: "js", normalized: "javascript", confidence: 0.95 }
            ]
          },
          usage: { total_tokens: 30 }
        };
      }

      // Fallback
      return {
        content: { result: "success" },
        usage: { total_tokens: 20 }
      };
    }
  };
}
