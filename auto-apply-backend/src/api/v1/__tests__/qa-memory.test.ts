import { describe, it, expect, beforeEach } from "vitest";
import { handleQAMemoryRequest } from "@/api/v1/qa-memory";
import { __resetQAMemoryStore } from "@/services/qa-memory/store";

const env = { DEMO_MODE: "true", DEV_DEMO_USER_ID: "demo-user" } as unknown as Env;

function req(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { Authorization: "Bearer demo-user", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => __resetQAMemoryStore());

describe("qa-memory API", () => {
  it("POST creates; GET lists", async () => {
    const c = await handleQAMemoryRequest(
      req("POST", "http://x/api/v1/qa-memory", {
        question_text: "Are you authorized to work in the US?", answer: "Yes",
      }), env, { kind: "list", method: "POST" },
    );
    expect(c.status).toBe(201);

    const l = await handleQAMemoryRequest(
      req("GET", "http://x/api/v1/qa-memory"), env, { kind: "list", method: "GET" },
    );
    const env_ = await l.json() as { data: { items: unknown[] } }; const j = env_.data;
    expect(j.items).toHaveLength(1);
  });

  it("POST requires question_text and answer", async () => {
    const r = await handleQAMemoryRequest(
      req("POST", "http://x/api/v1/qa-memory", { answer: "Yes" }), env,
      { kind: "list", method: "POST" },
    );
    expect(r.status).toBe(400);
  });

  it("POST /match returns exact-match with verdict=auto", async () => {
    await handleQAMemoryRequest(
      req("POST", "http://x/api/v1/qa-memory", {
        question_text: "Need sponsorship?", answer: "No",
      }), env, { kind: "list", method: "POST" },
    );
    const r = await handleQAMemoryRequest(
      req("POST", "http://x/api/v1/qa-memory/match", {
        question_text: "need sponsorship??",
      }), env, { kind: "match", method: "POST" },
    );
    const env_ = await r.json() as { data: { match: { verdict: string; record: { answer: string } } } }; const j = env_.data;
    expect(j.match.verdict).toBe("auto");
    expect(j.match.record.answer).toBe("No");
  });

  it("POST /match returns null match for novel question without embedding backing", async () => {
    const r = await handleQAMemoryRequest(
      req("POST", "http://x/api/v1/qa-memory/match", { question_text: "nothing like before" }),
      env, { kind: "match", method: "POST" },
    );
    // No stored rows → no match.
    const env_ = await r.json() as { data: { match: unknown } }; const j = env_.data;
    expect(j.match).toBeNull();
  });

  it("POST /match requires question_text", async () => {
    const r = await handleQAMemoryRequest(
      req("POST", "http://x/api/v1/qa-memory/match", {}),
      env, { kind: "match", method: "POST" },
    );
    expect(r.status).toBe(400);
  });

  it("DELETE removes an entry", async () => {
    const create = await handleQAMemoryRequest(
      req("POST", "http://x/api/v1/qa-memory", { question_text: "Q", answer: "A" }),
      env, { kind: "list", method: "POST" },
    );
    const body_env = await create.json() as { data: { item: { id: string } } }; const body = body_env.data;
    const id = body.item.id;

    const d = await handleQAMemoryRequest(
      req("DELETE", `http://x/api/v1/qa-memory/${id}`), env,
      { kind: "detail", method: "DELETE", id },
    );
    expect(d.status).toBe(200);

    const dd = await handleQAMemoryRequest(
      req("DELETE", `http://x/api/v1/qa-memory/missing`), env,
      { kind: "detail", method: "DELETE", id: "missing" },
    );
    expect(dd.status).toBe(404);
  });
});
