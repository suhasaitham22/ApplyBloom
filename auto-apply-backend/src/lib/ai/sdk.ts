// Thin wrapper around the Vercel AI SDK configured for Cloudflare Workers AI.
// Falls back to deterministic heuristics when no AI binding is available (demo / CI).
//
// Docs:
//   - https://developers.cloudflare.com/workers-ai/configuration/ai-sdk/
//   - https://ai-sdk.dev/docs/reference

import { createWorkersAI } from "workers-ai-provider";
import { generateObject, generateText, type LanguageModel, type ToolSet } from "ai";
import type { ZodType } from "zod";

export const DEFAULT_MODEL_ID = "@cf/meta/llama-3.1-8b-instruct" as const;

export interface AiEnv {
  AI?: Ai;
  DEMO_MODE?: string;
  AI_MODEL_ID?: string;
}

/** True when we should call an actual model; false forces the heuristic fallback. */
export function aiAvailable(env: AiEnv): boolean {
  if (env.DEMO_MODE === "true") return false;
  return Boolean(env.AI);
}

/** Build a LanguageModel for the current env, or null if unavailable. */
export function getModel(env: AiEnv): LanguageModel | null {
  if (!aiAvailable(env)) return null;
  const provider = createWorkersAI({ binding: env.AI as Ai });
  return provider((env.AI_MODEL_ID ?? DEFAULT_MODEL_ID) as Parameters<typeof provider>[0]);
}

export interface LlmCallMeta {
  model: string | null;
  prompt_version: string;
  latency_ms: number;
  tokens_input: number | null;
  tokens_output: number | null;
  demo: boolean;
}

/**
 * Structured JSON generation with Zod schema + deterministic fallback.
 * Use this for resume parsing, tailoring, matching — anywhere you need typed output.
 */
export async function runStructured<T>(
  env: AiEnv,
  opts: {
    schema: ZodType<T>;
    system: string;
    user: string | object;
    promptVersion: string;
    fallback: () => T;
  },
): Promise<{ data: T; meta: LlmCallMeta }> {
  const start = Date.now();
  const model = getModel(env);

  if (!model) {
    const data = opts.fallback();
    return {
      data,
      meta: {
        model: null,
        prompt_version: opts.promptVersion,
        latency_ms: Date.now() - start,
        tokens_input: null,
        tokens_output: null,
        demo: true,
      },
    };
  }

  try {
    const result = await generateObject({
      model,
      schema: opts.schema,
      system: opts.system,
      prompt: typeof opts.user === "string" ? opts.user : JSON.stringify(opts.user),
      temperature: 0.2,
    });
    return {
      data: result.object,
      meta: {
        model: (env.AI_MODEL_ID ?? DEFAULT_MODEL_ID),
        prompt_version: opts.promptVersion,
        latency_ms: Date.now() - start,
        tokens_input: result.usage?.inputTokens ?? null,
        tokens_output: result.usage?.outputTokens ?? null,
        demo: false,
      },
    };
  } catch (err) {
    console.warn("runStructured: LLM call failed, falling back", err);
    return {
      data: opts.fallback(),
      meta: {
        model: (env.AI_MODEL_ID ?? DEFAULT_MODEL_ID),
        prompt_version: opts.promptVersion,
        latency_ms: Date.now() - start,
        tokens_input: null,
        tokens_output: null,
        demo: true,
      },
    };
  }
}

/**
 * Text chat with optional tools. Tools let the model decide *when* to mutate state
 * (add_skills, rewrite_bullet, etc.) instead of keyword matching.
 */
export async function runChat(
  env: AiEnv,
  opts: {
    system: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    tools?: ToolSet;
    promptVersion: string;
    fallback: () => { text: string; toolCalls?: Array<{ toolName: string; input: unknown }> };
  },
): Promise<{
  text: string;
  toolCalls: Array<{ toolName: string; input: unknown }>;
  meta: LlmCallMeta;
}> {
  const start = Date.now();
  const model = getModel(env);

  if (!model) {
    const fb = opts.fallback();
    return {
      text: fb.text,
      toolCalls: fb.toolCalls ?? [],
      meta: {
        model: null,
        prompt_version: opts.promptVersion,
        latency_ms: Date.now() - start,
        tokens_input: null,
        tokens_output: null,
        demo: true,
      },
    };
  }

  try {
    const result = await generateText({
      model,
      system: opts.system,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
      tools: opts.tools,
      temperature: 0.4,
    });
    const toolCalls = (result.toolCalls ?? []).map((tc) => ({
      toolName: tc.toolName,
      input: tc.input,
    }));
    return {
      text: result.text,
      toolCalls,
      meta: {
        model: (env.AI_MODEL_ID ?? DEFAULT_MODEL_ID),
        prompt_version: opts.promptVersion,
        latency_ms: Date.now() - start,
        tokens_input: result.usage?.inputTokens ?? null,
        tokens_output: result.usage?.outputTokens ?? null,
        demo: false,
      },
    };
  } catch (err) {
    console.warn("runChat: LLM call failed, falling back", err);
    const fb = opts.fallback();
    return {
      text: fb.text,
      toolCalls: fb.toolCalls ?? [],
      meta: {
        model: (env.AI_MODEL_ID ?? DEFAULT_MODEL_ID),
        prompt_version: opts.promptVersion,
        latency_ms: Date.now() - start,
        tokens_input: null,
        tokens_output: null,
        demo: true,
      },
    };
  }
}
