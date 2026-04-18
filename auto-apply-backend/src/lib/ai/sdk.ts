// Multi-provider AI SDK wrapper.
//
// Provider priority (first available wins):
//   1. OPENAI_API_KEY        → OpenAI (gpt-4o-mini by default)
//   2. ANTHROPIC_API_KEY     → Anthropic (claude-3-5-sonnet by default)
//   3. env.AI binding        → Cloudflare Workers AI (llama-3.1-8b by default)
//   4. none                  → deterministic heuristic fallback
//
// DEMO_MODE=true is NO LONGER a hard "disable AI" flag — if keys are present,
// AI still runs. DEMO_MODE now only affects auth bypass.

import { createWorkersAI } from "workers-ai-provider";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateObject, generateText, type LanguageModel, type ToolSet } from "ai";
import type { ZodType } from "zod";

export const DEFAULT_WORKERS_MODEL = "@cf/meta/llama-3.1-8b-instruct" as const;
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini" as const;
export const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-sonnet-latest" as const;

export interface AiEnv {
  AI?: Ai;
  AI_MODEL_ID?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  DEMO_MODE?: string;
}

export type Provider = "openai" | "anthropic" | "workers-ai" | "none";

export interface ResolvedModel {
  model: LanguageModel;
  provider: Provider;
  modelId: string;
}

/** Pick the best available provider + model. Returns null if nothing configured. */
export function getModel(env: AiEnv): ResolvedModel | null {
  // 1) OpenAI
  if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.length > 0) {
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    const modelId = env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
    return { model: openai(modelId), provider: "openai", modelId };
  }

  // 2) Anthropic
  if (env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.length > 0) {
    const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const modelId = env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
    return { model: anthropic(modelId), provider: "anthropic", modelId };
  }

  // 3) Workers AI binding
  if (env.AI) {
    const provider = createWorkersAI({ binding: env.AI });
    const modelId = env.AI_MODEL_ID || DEFAULT_WORKERS_MODEL;
    return {
      model: provider(modelId as Parameters<typeof provider>[0]),
      provider: "workers-ai",
      modelId,
    };
  }

  return null;
}

/** True when a real model is wired up. */
export function aiAvailable(env: AiEnv): boolean {
  return getModel(env) !== null;
}

export interface LlmCallMeta {
  model: string | null;
  provider: Provider;
  prompt_version: string;
  latency_ms: number;
  tokens_input: number | null;
  tokens_output: number | null;
  demo: boolean;
}

function fallbackMeta(start: number, promptVersion: string): LlmCallMeta {
  return {
    model: null,
    provider: "none",
    prompt_version: promptVersion,
    latency_ms: Date.now() - start,
    tokens_input: null,
    tokens_output: null,
    demo: true,
  };
}

/**
 * Structured JSON generation with Zod schema + deterministic fallback.
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
  const resolved = getModel(env);

  if (!resolved) {
    return { data: opts.fallback(), meta: fallbackMeta(start, opts.promptVersion) };
  }

  try {
    const result = await generateObject({
      model: resolved.model,
      schema: opts.schema,
      system: opts.system,
      prompt: typeof opts.user === "string" ? opts.user : JSON.stringify(opts.user),
      temperature: 0.2,
    });
    return {
      data: result.object,
      meta: {
        model: resolved.modelId,
        provider: resolved.provider,
        prompt_version: opts.promptVersion,
        latency_ms: Date.now() - start,
        tokens_input: result.usage?.inputTokens ?? null,
        tokens_output: result.usage?.outputTokens ?? null,
        demo: false,
      },
    };
  } catch (err) {
    console.warn("[ai] runStructured failed, falling back:", err instanceof Error ? err.message : err);
    return {
      data: opts.fallback(),
      meta: {
        ...fallbackMeta(start, opts.promptVersion),
        model: resolved.modelId,
        provider: resolved.provider,
      },
    };
  }
}

/**
 * Text chat with optional tools.
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
  const resolved = getModel(env);

  if (!resolved) {
    const fb = opts.fallback();
    return {
      text: fb.text,
      toolCalls: fb.toolCalls ?? [],
      meta: fallbackMeta(start, opts.promptVersion),
    };
  }

  try {
    const result = await generateText({
      model: resolved.model,
      system: opts.system,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
      tools: opts.tools,
      temperature: 0.5,
    });
    const toolCalls = (result.toolCalls ?? []).map((tc) => ({
      toolName: tc.toolName,
      input: tc.input,
    }));
    return {
      text: result.text,
      toolCalls,
      meta: {
        model: resolved.modelId,
        provider: resolved.provider,
        prompt_version: opts.promptVersion,
        latency_ms: Date.now() - start,
        tokens_input: result.usage?.inputTokens ?? null,
        tokens_output: result.usage?.outputTokens ?? null,
        demo: false,
      },
    };
  } catch (err) {
    console.warn("[ai] runChat failed, falling back:", err instanceof Error ? err.message : err);
    const fb = opts.fallback();
    return {
      text: fb.text,
      toolCalls: fb.toolCalls ?? [],
      meta: {
        ...fallbackMeta(start, opts.promptVersion),
        model: resolved.modelId,
        provider: resolved.provider,
      },
    };
  }
}
