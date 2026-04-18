import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external AI providers
vi.mock("workers-ai-provider", () => ({
  createWorkersAI: vi.fn(() => vi.fn((modelId: string) => ({ modelId, type: "workers-ai" }))),
}));
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn((modelId: string) => ({ modelId, type: "openai" }))),
}));
vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() => vi.fn((modelId: string) => ({ modelId, type: "anthropic" }))),
}));
vi.mock("ai", () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
}));

import {
  getModel,
  aiAvailable,
  runStructured,
  runChat,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_WORKERS_MODEL,
} from "../sdk";
import { generateObject, generateText } from "ai";
import { z } from "zod";

const mockGenerateObject = vi.mocked(generateObject);
const mockGenerateText = vi.mocked(generateText);

describe("getModel", () => {
  it("returns null when no providers configured", () => {
    expect(getModel({})).toBeNull();
  });

  it("prioritizes OpenAI", () => {
    const result = getModel({ OPENAI_API_KEY: "sk-123" });
    expect(result).not.toBeNull();
    expect(result!.provider).toBe("openai");
    expect(result!.modelId).toBe(DEFAULT_OPENAI_MODEL);
  });

  it("uses custom OpenAI model", () => {
    const result = getModel({ OPENAI_API_KEY: "sk-123", OPENAI_MODEL: "gpt-4" });
    expect(result!.modelId).toBe("gpt-4");
  });

  it("falls back to Anthropic", () => {
    const result = getModel({ ANTHROPIC_API_KEY: "sk-ant-123" });
    expect(result!.provider).toBe("anthropic");
    expect(result!.modelId).toBe(DEFAULT_ANTHROPIC_MODEL);
  });

  it("uses custom Anthropic model", () => {
    const result = getModel({ ANTHROPIC_API_KEY: "sk-ant-123", ANTHROPIC_MODEL: "claude-3-opus" });
    expect(result!.modelId).toBe("claude-3-opus");
  });

  it("falls back to Workers AI", () => {
    const result = getModel({ AI: {} as any });
    expect(result!.provider).toBe("workers-ai");
    expect(result!.modelId).toBe(DEFAULT_WORKERS_MODEL);
  });

  it("uses custom Workers AI model", () => {
    const result = getModel({ AI: {} as any, AI_MODEL_ID: "@cf/custom/model" });
    expect(result!.modelId).toBe("@cf/custom/model");
  });

  it("OpenAI takes priority over Anthropic and Workers AI", () => {
    const result = getModel({
      OPENAI_API_KEY: "sk-123",
      ANTHROPIC_API_KEY: "sk-ant-123",
      AI: {} as any,
    });
    expect(result!.provider).toBe("openai");
  });

  it("Anthropic takes priority over Workers AI", () => {
    const result = getModel({
      ANTHROPIC_API_KEY: "sk-ant-123",
      AI: {} as any,
    });
    expect(result!.provider).toBe("anthropic");
  });

  it("ignores empty string keys", () => {
    expect(getModel({ OPENAI_API_KEY: "" })).toBeNull();
    expect(getModel({ ANTHROPIC_API_KEY: "" })).toBeNull();
  });
});

describe("aiAvailable", () => {
  it("false when no providers", () => {
    expect(aiAvailable({})).toBe(false);
  });

  it("true when OpenAI configured", () => {
    expect(aiAvailable({ OPENAI_API_KEY: "sk-123" })).toBe(true);
  });
});

describe("runStructured", () => {
  const schema = z.object({ name: z.string() });
  const opts = {
    schema,
    system: "sys",
    user: "parse this",
    promptVersion: "v1",
    fallback: () => ({ name: "fallback" }),
  };

  it("returns fallback when no model", async () => {
    const result = await runStructured({}, opts);
    expect(result.data).toEqual({ name: "fallback" });
    expect(result.meta.provider).toBe("none");
    expect(result.meta.demo).toBe(true);
    expect(result.meta.model).toBeNull();
  });

  it("calls generateObject when model available", async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: { name: "real" },
      usage: { inputTokens: 10, outputTokens: 20 },
    } as any);

    const result = await runStructured({ OPENAI_API_KEY: "sk-123" }, opts);
    expect(result.data).toEqual({ name: "real" });
    expect(result.meta.provider).toBe("openai");
    expect(result.meta.demo).toBe(false);
    expect(result.meta.tokens_input).toBe(10);
  });

  it("falls back on generateObject error", async () => {
    mockGenerateObject.mockRejectedValueOnce(new Error("API error"));

    const result = await runStructured({ OPENAI_API_KEY: "sk-123" }, opts);
    expect(result.data).toEqual({ name: "fallback" });
    expect(result.meta.provider).toBe("openai");
    expect(result.meta.demo).toBe(true);
  });

  it("accepts object user input", async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: { name: "obj" },
      usage: {},
    } as any);

    const result = await runStructured({ OPENAI_API_KEY: "sk-123" }, { ...opts, user: { key: "val" } });
    expect(result.data).toEqual({ name: "obj" });
  });
});

describe("runChat", () => {
  const chatOpts = {
    system: "sys",
    messages: [{ role: "user" as const, content: "hello" }],
    promptVersion: "v1",
    fallback: () => ({ text: "fallback text", toolCalls: [{ toolName: "add_skills", input: { skills: ["A"] } }] }),
  };

  it("returns fallback when no model", async () => {
    const result = await runChat({}, chatOpts);
    expect(result.text).toBe("fallback text");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.meta.provider).toBe("none");
  });

  it("calls generateText when model available", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "AI response",
      toolCalls: [{ toolName: "add_skills", input: { skills: ["B"] } }],
      usage: { inputTokens: 5, outputTokens: 10 },
    } as any);

    const result = await runChat({ OPENAI_API_KEY: "sk-123" }, chatOpts);
    expect(result.text).toBe("AI response");
    expect(result.meta.provider).toBe("openai");
    expect(result.meta.demo).toBe(false);
  });

  it("falls back on generateText error", async () => {
    mockGenerateText.mockRejectedValueOnce(new Error("API error"));

    const result = await runChat({ OPENAI_API_KEY: "sk-123" }, chatOpts);
    expect(result.text).toBe("fallback text");
    expect(result.meta.provider).toBe("openai");
  });

  it("handles missing toolCalls in result", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "No tools",
      usage: {},
    } as any);

    const result = await runChat({ OPENAI_API_KEY: "sk-123" }, chatOpts);
    expect(result.toolCalls).toEqual([]);
  });

  it("handles fallback without toolCalls", async () => {
    const result = await runChat({}, {
      ...chatOpts,
      fallback: () => ({ text: "just text" }),
    });
    expect(result.toolCalls).toEqual([]);
  });
});
