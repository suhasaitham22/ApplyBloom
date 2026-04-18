import { describe, it, expect, vi } from "vitest";

vi.mock("@/services/chat-with-resume", () => ({
  chatWithResume: vi.fn(async () => ({
    assistant_message: "Here's my advice",
    operations: [{ op: "replace_summary", value: "New summary" }],
    meta: { model: null, provider: "none", prompt_version: "v3", latency_ms: 1, tokens_input: null, tokens_output: null, demo: true },
  })),
}));

import { handleResumeChatRequest } from "../resume-chat";

const env = { DEMO_MODE: "true" } as any;

function req(method: string, body?: unknown): Request {
  const opts: RequestInit = {
    method,
    headers: { Authorization: "Bearer test_user", "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  return new Request("https://example.com/api/v1/resume-chat", opts);
}

describe("handleResumeChatRequest", () => {
  it("rejects non-POST", async () => {
    const res = await handleResumeChatRequest(req("GET"), env);
    expect(res.status).toBe(405);
  });

  it("rejects unauthenticated", async () => {
    const r = new Request("https://example.com", { method: "POST", body: "{}" });
    const res = await handleResumeChatRequest(r, { SUPABASE_JWT_SECRET: "key-long-enough-for-hs256-xxxxxxxxxxxxxxxxxxx" } as any);
    expect(res.status).toBe(401);
  });

  it("rejects missing resume", async () => {
    const res = await handleResumeChatRequest(req("POST", { instruction: "help" }), env);
    expect(res.status).toBe(400);
  });

  it("rejects missing instruction", async () => {
    const res = await handleResumeChatRequest(req("POST", { resume: {} }), env);
    expect(res.status).toBe(400);
  });

  it("returns chat result on success", async () => {
    const resume = { full_name: "Test", headline: "", contact: {}, summary: "", skills: [], experience: [], education: [], confidence: 0.5 };
    const res = await handleResumeChatRequest(
      req("POST", { resume, instruction: "tighten my summary", messages: [] }),
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.reply.assistant_message).toBe("Here's my advice");
    expect(body.data.reply.operations).toHaveLength(1);
    expect(body.data.demo_mode).toBe(true);
  });
});
