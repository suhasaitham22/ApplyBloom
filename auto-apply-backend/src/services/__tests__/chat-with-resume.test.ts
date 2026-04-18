import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AI SDK before importing the module
vi.mock("@/lib/ai/sdk", () => ({
  runChat: vi.fn(),
}));

vi.mock("@/lib/prompts", () => ({
  PROMPTS: {
    chat_resume: { name: "chat_resume", version: "v3", system: "You are a coach." },
    general_chat: { name: "general_chat", version: "v1", system: "General chat." },
  },
}));

import {
  chatWithResume,
  chatWithoutResume,
  applyOperations,
  type ChatWithResumeInput,
  type ResumeOp,
} from "../chat-with-resume";
import type { StructuredResume } from "../structure-resume";
import { runChat } from "@/lib/ai/sdk";

const mockRunChat = vi.mocked(runChat);

function makeResume(overrides: Partial<StructuredResume> = {}): StructuredResume {
  return {
    full_name: "Jane Doe",
    headline: "Senior Backend Engineer",
    contact: { email: "jane@x.com", phone: "555", location: "Austin, TX" },
    summary: "Experienced engineer with 8 years building distributed systems.",
    skills: ["TypeScript", "Go", "Postgres", "AWS"],
    experience: [
      { heading: "Senior Engineer, Acme Corp (2022 — Present)", bullets: ["Led TypeScript migration", "Reduced latency"] },
    ],
    education: [{ heading: "BS CS, State U (2015)", bullets: ["GPA 3.8"] }],
    confidence: 0.9,
    ...overrides,
  };
}

const noAiEnv = {} as any;

describe("applyOperations", () => {
  it("replace_summary", () => {
    const r = makeResume();
    const out = applyOperations(r, [{ op: "replace_summary", value: "New summary" }]);
    expect(out.summary).toBe("New summary");
    expect(r.summary).not.toBe("New summary"); // immutable
  });

  it("replace_headline", () => {
    const out = applyOperations(makeResume(), [{ op: "replace_headline", value: "Staff Engineer" }]);
    expect(out.headline).toBe("Staff Engineer");
  });

  it("set_skills", () => {
    const out = applyOperations(makeResume(), [{ op: "set_skills", value: ["Python", "Rust"] }]);
    expect(out.skills).toEqual(["Python", "Rust"]);
  });

  it("add_skills deduplicates case-insensitively", () => {
    const out = applyOperations(makeResume(), [{ op: "add_skills", value: ["typescript", "Python"] }]);
    expect(out.skills).toEqual(["TypeScript", "Go", "Postgres", "AWS", "Python"]);
  });

  it("remove_skills case-insensitively", () => {
    const out = applyOperations(makeResume(), [{ op: "remove_skills", value: ["go", "aws"] }]);
    expect(out.skills).toEqual(["TypeScript", "Postgres"]);
  });

  it("rewrite_bullet", () => {
    const out = applyOperations(makeResume(), [{
      op: "rewrite_bullet",
      section: "experience",
      heading: "Senior Engineer, Acme Corp (2022 — Present)",
      index: 0,
      value: "New bullet",
    }]);
    expect(out.experience[0].bullets[0]).toBe("New bullet");
  });

  it("rewrite_bullet ignores wrong heading", () => {
    const r = makeResume();
    const out = applyOperations(r, [{
      op: "rewrite_bullet", section: "experience", heading: "Nonexistent", index: 0, value: "X",
    }]);
    expect(out.experience[0].bullets[0]).toBe("Led TypeScript migration");
  });

  it("add_bullet", () => {
    const out = applyOperations(makeResume(), [{
      op: "add_bullet",
      section: "education",
      heading: "BS CS, State U (2015)",
      value: "Magna cum laude",
    }]);
    expect(out.education[0].bullets).toHaveLength(2);
    expect(out.education[0].bullets[1]).toBe("Magna cum laude");
  });

  it("applies multiple ops", () => {
    const ops: ResumeOp[] = [
      { op: "replace_headline", value: "Staff Eng" },
      { op: "add_skills", value: ["Kafka"] },
      { op: "replace_summary", value: "Short." },
    ];
    const out = applyOperations(makeResume(), ops);
    expect(out.headline).toBe("Staff Eng");
    expect(out.skills).toContain("Kafka");
    expect(out.summary).toBe("Short.");
  });
});

describe("chatWithResume (heuristic fallback)", () => {
  beforeEach(() => {
    // Make runChat call the fallback
    mockRunChat.mockImplementation(async (_env, opts) => {
      const fb = opts.fallback!();
      return {
        text: fb.text,
        toolCalls: fb.toolCalls ?? [],
        meta: { model: null, provider: "none" as const, prompt_version: "v3", latency_ms: 1, tokens_input: null, tokens_output: null, demo: true },
      };
    });
  });

  it("greeting returns intro", async () => {
    const result = await chatWithResume({
      resume: makeResume(),
      messages: [],
      instruction: "Hello!",
    }, noAiEnv);
    expect(result.assistant_message).toContain("resume");
    expect(result.operations).toHaveLength(0);
  });

  it("tighten summary returns replace_summary op", async () => {
    const result = await chatWithResume({
      resume: makeResume({ summary: "First sentence. Second sentence. Third sentence." }),
      messages: [],
      instruction: "tighten my summary",
    }, noAiEnv);
    expect(result.operations.length).toBeGreaterThanOrEqual(1);
    expect(result.operations[0].op).toBe("replace_summary");
  });

  it("add skill returns add_skills op", async () => {
    const result = await chatWithResume({
      resume: makeResume(),
      messages: [],
      instruction: "add Python to my skills",
    }, noAiEnv);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].op).toBe("add_skills");
    expect((result.operations[0] as any).value).toContain("Python");
  });

  it("remove skills returns remove_skills op", async () => {
    const result = await chatWithResume({
      resume: makeResume(),
      messages: [],
      instruction: "remove Go from my skills",
    }, noAiEnv);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].op).toBe("remove_skills");
  });

  it("improve ATS score returns ops", async () => {
    const result = await chatWithResume({
      resume: makeResume(),
      messages: [],
      instruction: "improve my ATS score",
    }, noAiEnv);
    expect(result.operations.length).toBeGreaterThan(0);
    expect(result.assistant_message).toContain("ATS");
  });

  it("change headline returns replace_headline op", async () => {
    const result = await chatWithResume({
      resume: makeResume(),
      messages: [],
      instruction: 'change my headline to "Staff Engineer"',
    }, noAiEnv);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].op).toBe("replace_headline");
    expect((result.operations[0] as any).value).toBe("Staff Engineer");
  });

  it("show resume returns summary text", async () => {
    const result = await chatWithResume({
      resume: makeResume(),
      messages: [],
      instruction: "what does my resume look like?",
    }, noAiEnv);
    expect(result.assistant_message).toContain("Jane Doe");
    expect(result.operations).toHaveLength(0);
  });

  it("expand summary returns replace_summary", async () => {
    const result = await chatWithResume({
      resume: makeResume({ summary: "Short." }),
      messages: [],
      instruction: "expand my summary",
    }, noAiEnv);
    expect(result.operations.length).toBeGreaterThanOrEqual(1);
    expect(result.operations[0].op).toBe("replace_summary");
  });

  it("rewrite bullets for company", async () => {
    const result = await chatWithResume({
      resume: makeResume(),
      messages: [],
      instruction: "rewrite bullets at Acme",
    }, noAiEnv);
    expect(result.operations.length).toBeGreaterThan(0);
    expect(result.operations[0].op).toBe("rewrite_bullet");
  });

  it("rewrite bullets for unknown company", async () => {
    const result = await chatWithResume({
      resume: makeResume(),
      messages: [],
      instruction: "rewrite bullets at FooBarInc",
    }, noAiEnv);
    expect(result.operations).toHaveLength(0);
    expect(result.assistant_message).toContain("couldn't find");
  });

  it("unrecognized instruction returns generic help", async () => {
    const result = await chatWithResume({
      resume: makeResume(),
      messages: [],
      instruction: "do something random xyz",
    }, noAiEnv);
    expect(result.assistant_message).toContain("resume");
  });

  it("includes job context in messages", async () => {
    const result = await chatWithResume({
      resume: makeResume(),
      messages: [],
      instruction: "hello",
      job: { title: "SWE", company: "Google", description: "Build stuff", url: "https://g.co" },
    }, noAiEnv);
    expect(result.assistant_message).toBeTruthy();
  });

  it("uses systemPromptOverride when provided", async () => {
    let capturedSystem = "";
    mockRunChat.mockImplementation(async (_env, opts) => {
      capturedSystem = opts.system;
      const fb = opts.fallback!();
      return {
        text: fb.text,
        toolCalls: fb.toolCalls ?? [],
        meta: { model: null, provider: "none" as const, prompt_version: "v3", latency_ms: 1, tokens_input: null, tokens_output: null, demo: true },
      };
    });
    await chatWithResume({
      resume: makeResume(),
      messages: [],
      instruction: "hi",
      systemPromptOverride: "Custom prompt",
    }, noAiEnv);
    expect(capturedSystem).toBe("Custom prompt");
  });
});

describe("chatWithoutResume (heuristic fallback)", () => {
  beforeEach(() => {
    mockRunChat.mockImplementation(async (_env, opts) => {
      const fb = opts.fallback!();
      return {
        text: fb.text,
        toolCalls: [],
        meta: { model: null, provider: "none" as const, prompt_version: "v1", latency_ms: 1, tokens_input: null, tokens_output: null, demo: true },
      };
    });
  });

  it("greeting without job", async () => {
    const result = await chatWithoutResume({
      messages: [],
      instruction: "hi",
    }, noAiEnv);
    expect(result.assistant_message).toContain("Upload");
  });

  it("greeting with job", async () => {
    const result = await chatWithoutResume({
      messages: [],
      instruction: "hello",
      job: { title: "SWE" },
    }, noAiEnv);
    expect(result.assistant_message).toContain("SWE");
  });

  it("resume question", async () => {
    const result = await chatWithoutResume({
      messages: [],
      instruction: "how do I upload my resume?",
    }, noAiEnv);
    expect(result.assistant_message).toContain("resume");
  });

  it("advice question", async () => {
    const result = await chatWithoutResume({
      messages: [],
      instruction: "how can I improve?",
    }, noAiEnv);
    expect(result.assistant_message).toContain("Upload");
  });

  it("unrecognized returns upload prompt", async () => {
    const result = await chatWithoutResume({
      messages: [],
      instruction: "xyz random",
    }, noAiEnv);
    expect(result.assistant_message).toContain("Upload");
  });

  it("uses systemPromptOverride", async () => {
    let capturedSystem = "";
    mockRunChat.mockImplementation(async (_env, opts) => {
      capturedSystem = opts.system;
      const fb = opts.fallback!();
      return {
        text: fb.text,
        toolCalls: [],
        meta: { model: null, provider: "none" as const, prompt_version: "v1", latency_ms: 1, tokens_input: null, tokens_output: null, demo: true },
      };
    });
    await chatWithoutResume({ messages: [], instruction: "hi", systemPromptOverride: "Override" }, noAiEnv);
    expect(capturedSystem).toBe("Override");
  });
});
