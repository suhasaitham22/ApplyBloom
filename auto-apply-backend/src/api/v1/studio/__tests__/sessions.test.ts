import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/services/tailor-resume-llm", () => ({
  tailorResumeForJob: vi.fn(),
}));
vi.mock("@/services/chat-with-resume", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    chatWithResume: vi.fn(async (input: any) => ({
      assistant_message: "Mocked reply",
      operations: [],
      meta: { model: null, provider: "none", prompt_version: "v3", latency_ms: 1, tokens_input: null, tokens_output: null, demo: true },
    })),
    chatWithoutResume: vi.fn(async () => ({
      assistant_message: "Mocked no-resume reply",
      meta: { model: null, provider: "none", prompt_version: "v1", latency_ms: 1, tokens_input: null, tokens_output: null, demo: true },
    })),
  };
});
vi.mock("@/lib/ai/sdk", () => ({
  runChat: vi.fn(async (_env: any, opts: any) => {
    const fb = opts.fallback();
    return { text: fb.text, toolCalls: fb.toolCalls ?? [], meta: { model: null, provider: "none", prompt_version: "v1", latency_ms: 1, tokens_input: null, tokens_output: null, demo: true } };
  }),
}));
vi.mock("@/services/structure-resume", () => ({
  structureResume: vi.fn(async () => ({
    data: { full_name: "Test", headline: "", contact: {}, summary: "", skills: [], experience: [], education: [], confidence: 0.5 },
    demo: true,
  })),
}));

import { handleSessionsRequest } from "../sessions";

const env = { DEMO_MODE: "true" } as any;

function resetStore() {
  const g = globalThis as unknown as { __applybloom_studio?: unknown };
  delete g.__applybloom_studio;
}

function req(method: string, body?: unknown): Request {
  const opts: RequestInit = {
    method,
    headers: { Authorization: "Bearer test_user", "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  return new Request("https://example.com", opts);
}

describe("handleSessionsRequest", () => {
  beforeEach(() => resetStore());

  it("rejects unauthenticated", async () => {
    const r = new Request("https://example.com");
    const env2 = { SUPABASE_JWT_SECRET: "some-secret-key-long-enough-xxxxxxxxxxxxxxxxxxxxx" } as any;
    const res = await handleSessionsRequest(r, env2, { kind: "list", method: "GET" });
    expect(res.status).toBe(401);
  });

  it("GET list returns empty", async () => {
    const res = await handleSessionsRequest(req("GET"), env, { kind: "list", method: "GET" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.sessions).toEqual([]);
  });

  it("POST creates session", async () => {
    const res = await handleSessionsRequest(
      req("POST", { title: "Test", mode: "single" }),
      env,
      { kind: "list", method: "POST" },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.session.title).toBe("Test");
    expect(body.data.session.status).toBe("idle");
  });

  it("GET detail returns session + messages", async () => {
    const createRes = await handleSessionsRequest(req("POST", {}), env, { kind: "list", method: "POST" });
    const { session } = ((await createRes.json()) as any).data;

    const res = await handleSessionsRequest(req("GET"), env, { kind: "detail", method: "GET", id: session.id });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.session.id).toBe(session.id);
    expect(body.data.messages).toEqual([]);
  });

  it("GET detail returns 404 for missing", async () => {
    const res = await handleSessionsRequest(req("GET"), env, { kind: "detail", method: "GET", id: "nope" });
    expect(res.status).toBe(404);
  });

  it("PATCH updates session", async () => {
    const createRes = await handleSessionsRequest(req("POST", {}), env, { kind: "list", method: "POST" });
    const { session } = ((await createRes.json()) as any).data;

    const res = await handleSessionsRequest(
      req("PATCH", { title: "Updated" }),
      env,
      { kind: "detail", method: "PATCH", id: session.id },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.session.title).toBe("Updated");
  });

  it("POST messages sends user message and gets reply (no resume)", async () => {
    const createRes = await handleSessionsRequest(req("POST", {}), env, { kind: "list", method: "POST" });
    const { session } = ((await createRes.json()) as any).data;

    const res = await handleSessionsRequest(
      req("POST", { content: "hello" }),
      env,
      { kind: "messages", method: "POST", id: session.id },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.messages.length).toBeGreaterThanOrEqual(2);
    expect(body.data.messages[0].role).toBe("user");
    expect(body.data.messages[body.data.messages.length - 1].role).toBe("assistant");
  });

  it("POST messages requires content", async () => {
    const createRes = await handleSessionsRequest(req("POST", {}), env, { kind: "list", method: "POST" });
    const { session } = ((await createRes.json()) as any).data;

    const res = await handleSessionsRequest(
      req("POST", { content: "" }),
      env,
      { kind: "messages", method: "POST", id: session.id },
    );
    expect(res.status).toBe(400);
  });

  it("start transitions to running", async () => {
    const createRes = await handleSessionsRequest(req("POST", {}), env, { kind: "list", method: "POST" });
    const { session } = ((await createRes.json()) as any).data;

    const res = await handleSessionsRequest(req("POST"), env, { kind: "start", method: "POST", id: session.id });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.session.status).toBe("running");
  });

  it("pause transitions running → paused", async () => {
    const createRes = await handleSessionsRequest(req("POST", {}), env, { kind: "list", method: "POST" });
    const { session } = ((await createRes.json()) as any).data;

    await handleSessionsRequest(req("POST"), env, { kind: "start", method: "POST", id: session.id });
    const res = await handleSessionsRequest(req("POST"), env, { kind: "pause", method: "POST", id: session.id });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.session.status).toBe("paused");
  });

  it("resume transitions paused → running", async () => {
    const createRes = await handleSessionsRequest(req("POST", {}), env, { kind: "list", method: "POST" });
    const { session } = ((await createRes.json()) as any).data;

    await handleSessionsRequest(req("POST"), env, { kind: "start", method: "POST", id: session.id });
    await handleSessionsRequest(req("POST"), env, { kind: "pause", method: "POST", id: session.id });
    const res = await handleSessionsRequest(req("POST"), env, { kind: "resume", method: "POST", id: session.id });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.session.status).toBe("running");
  });

  it("cancel transitions to cancelled", async () => {
    const createRes = await handleSessionsRequest(req("POST", {}), env, { kind: "list", method: "POST" });
    const { session } = ((await createRes.json()) as any).data;

    const res = await handleSessionsRequest(req("POST"), env, { kind: "cancel", method: "POST", id: session.id });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.session.status).toBe("cancelled");
  });

  it("start returns 404 for missing session", async () => {
    const res = await handleSessionsRequest(req("POST"), env, { kind: "start", method: "POST", id: "nope" });
    expect(res.status).toBe(404);
  });

  it("pause returns 404 for missing session", async () => {
    const res = await handleSessionsRequest(req("POST"), env, { kind: "pause", method: "POST", id: "nope" });
    expect(res.status).toBe(404);
  });
});
