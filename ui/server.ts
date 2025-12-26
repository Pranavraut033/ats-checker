import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { analyzeResumeAsync } from "../src/index";
import type { AnalyzeResumeInput } from "../src/types";
import type { LLMClient, LLMConfig } from "../src/types/llm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3005;

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

interface AnalysisRequest {
  resume: string;
  jobDescription: string;
  useLLM?: boolean;
  apiKey?: string;
}

/**
 * Minimal OpenAI client implementing the library's LLMClient interface.
 * Uses Chat Completions with JSON-only response_format for portability.
 */
class OpenAIClient implements LLMClient {
  constructor(private readonly apiKey: string) { }

  async createCompletion(input: {
    model: string;
    messages: { role: "system" | "user"; content: string }[];
    max_tokens: number;
    response_format: any;
  }): Promise<{ content: unknown; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }> {
    console.log(`[OpenAI] Calling ${input.model} with ${input.messages.length} messages`);

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: input.model || "gpt-4o-mini",
        messages: input.messages,
        response_format: { type: "json_object" },
        max_tokens: input.max_tokens || 2000,
        temperature: 0.2,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`[OpenAI] Error ${resp.status}: ${text}`);
      throw new Error(`OpenAI API error ${resp.status}: ${text}`);
    }

    const data = (await resp.json()) as any;
    const contentStr = data?.choices?.[0]?.message?.content ?? "{}";
    const usage = data?.usage ?? {};

    console.log(`[OpenAI] Response received, parsing JSON...`);

    // Parse JSON string from OpenAI into actual object
    let parsedContent: unknown;
    try {
      parsedContent = typeof contentStr === "string" ? JSON.parse(contentStr) : contentStr;
      console.log(`[OpenAI] Parsed content:`, parsedContent);
    } catch (e) {
      console.error(`[OpenAI] JSON parse error:`, e, `Raw content:`, contentStr);
      parsedContent = {};
    }

    return { content: parsedContent, usage };
  }
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "ats-checker-ui" });
});

// Main analysis endpoint
app.post("/api/analyze", async (req, res) => {
  try {
    const { resume, jobDescription, useLLM, apiKey } = req.body as AnalysisRequest;

    if (!resume || !jobDescription) {
      return res.status(400).json({
        error: "Missing resume or jobDescription",
      });
    }

    console.log(`[Analysis] useLLM=${useLLM}, hasApiKey=${!!apiKey}`);

    const input: AnalyzeResumeInput = {
      resumeText: resume,
      jobDescription: jobDescription,
    };

    // Add LLM config if requested (requires valid API key)
    if (useLLM && apiKey) {
      console.log(`[Analysis] Configuring LLM with OpenAI key`);
      const llmClient: LLMClient = new OpenAIClient(apiKey);
      const llmConfig: LLMConfig = {
        client: llmClient,
        models: { default: "gpt-4o-mini", thinking: "o4-mini" },
        limits: { maxCalls: 3, maxTokensPerCall: 2000, maxTotalTokens: 5000 },
        enable: { suggestions: true },
        timeoutMs: 25000,
      };
      (input as any).llm = llmConfig;
    }

    console.log(`[Analysis] Starting analysis...`);
    const result = await analyzeResumeAsync(input);
    console.log(`[Analysis] Complete. Suggestions count: ${result.suggestions.length}`);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`ATS Checker UI running at http://localhost:${PORT}`);
  console.log(`Open your browser and navigate to http://localhost:${PORT}`);
});
