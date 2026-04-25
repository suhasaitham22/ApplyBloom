// Guarantee: when chatWithResume is called, the current resume JSON is ALWAYS
// present in the messages passed to the model. No partial sends, no stale state.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai/sdk", () => ({ runChat: vi.fn() }));
vi.mock("@/lib/prompts", () => ({
  PROMPTS: {
    chat_resume: { name: "chat_resume", version: "vT", system: "You are a coach." },
    general_chat: { name: "general_chat", version: "vT", system: "General." },
  },
}));

import { chatWithResume, chatWithoutResume } from "../chat-with-resume";
import type { StructuredResume } from "../structure-resume";
import { runChat } from "@/lib/ai/sdk";

const mockRunChat = vi.mocked(runChat);

const resume: StructuredResume = {
  full_name: "Uday A",
  headline: "Data Engineer",
  contact: {},
  summary: "Data engineer specialising in Azure.",
  skills: ["Python", "Azure", "SQL"],
  experience: [{ heading: "Acme, Data Eng, 2021-2024", bullets: ["Built pipelines", "Reduced cost 30%"] }],
  education: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRunChat.mockResolvedValue({
    text: "sure",
    toolCalls: [],
    meta: { model: "m", provider: "none", prompt_version: "vT", latency_ms: 1, tokens_input: null, tokens_output: null, demo: false },
  });
});

describe("resume-always-in-context guarantee", () => {
  it("first message includes the full resume JSON in the user context block", async () => {
    await chatWithResume({ resume, messages: [], instruction: "hi" }, { OPENAI_API_KEY: "x" });
    const call = mockRunChat.mock.calls[0][1];
    const firstUserMsg = call.messages.find((m) => m.role === "user");
    expect(firstUserMsg).toBeDefined();
    expect(firstUserMsg!.content).toContain("CURRENT RESUME");
    expect(firstUserMsg!.content).toContain("Uday A");
    expect(firstUserMsg!.content).toContain("Azure");
    expect(firstUserMsg!.content).toContain("Data Engineer");
  });

  it("resume JSON is present even with many prior turns", async () => {
    const prior = Array.from({ length: 10 }).map((_, i) => ({
      role: i % 2 === 0 ? "user" as const : "assistant" as const,
      content: `message ${i}`,
    }));
    await chatWithResume({ resume, messages: prior, instruction: "latest" }, { OPENAI_API_KEY: "x" });
    const call = mockRunChat.mock.calls[0][1];
    // First user message must still be the resume priming block
    const firstUserMsg = call.messages[0];
    expect(firstUserMsg.role).toBe("user");
    expect(firstUserMsg.content).toContain("CURRENT RESUME");
    expect(firstUserMsg.content).toContain("Uday A");
    // Latest instruction is the last message
    const last = call.messages[call.messages.length - 1];
    expect(last.role).toBe("user");
    expect(last.content).toBe("latest");
  });

  it("resume JSON reflects the latest resume state each turn (no staleness)", async () => {
    const updated: StructuredResume = { ...resume, skills: [...resume.skills, "Databricks"] };
    await chatWithResume({ resume: updated, messages: [], instruction: "hi" }, { OPENAI_API_KEY: "x" });
    const call = mockRunChat.mock.calls[0][1];
    expect(call.messages[0].content).toContain("Databricks");
  });

  it("system prompt is the chat_resume prompt (or override)", async () => {
    await chatWithResume({ resume, messages: [], instruction: "hi" }, { OPENAI_API_KEY: "x" });
    let call = mockRunChat.mock.calls[0][1];
    expect(call.system).toBe("You are a coach.");

    await chatWithResume(
      { resume, messages: [], instruction: "hi", systemPromptOverride: "CUSTOM COACH" },
      { OPENAI_API_KEY: "x" },
    );
    call = mockRunChat.mock.calls[1][1];
    expect(call.system).toBe("CUSTOM COACH");
  });

  it("job context is included alongside resume when present", async () => {
    await chatWithResume(
      {
        resume,
        messages: [],
        instruction: "tailor for this",
        job: { title: "Senior DE", company: "Contoso", description: "Azure Synapse + DBT" },
      },
      { OPENAI_API_KEY: "x" },
    );
    const call = mockRunChat.mock.calls[0][1];
    const firstContent = call.messages[0].content;
    expect(firstContent).toContain("CURRENT RESUME");
    expect(firstContent).toContain("TARGET JOB");
    expect(firstContent).toContain("Senior DE");
    expect(firstContent).toContain("Contoso");
  });

  it("chatWithoutResume does NOT include a resume block (no fake context)", async () => {
    await chatWithoutResume({ messages: [], instruction: "hi" }, { OPENAI_API_KEY: "x" });
    const call = mockRunChat.mock.calls[0][1];
    const joined = call.messages.map((m) => m.content).join("\n");
    expect(joined).not.toContain("CURRENT RESUME");
  });
});
