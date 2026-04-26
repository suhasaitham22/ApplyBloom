import { describe, it, expect, beforeEach } from "vitest";
import { handleQAPendingRequest } from "@/api/v1/qa-pending";
import { handleApplyRequest } from "@/api/v1/apply";
import { __resetQAPendingStore } from "@/services/qa-pending/store";
import { __resetApplyQueueStore } from "@/services/apply-queue/store";
import { __resetSessionEventsStore } from "@/services/session-events/store";
import { __resetQAMemoryStore, listQA } from "@/services/qa-memory/store";

const env = { DEMO_MODE: "true" } as unknown as Env;

function req(method: string, url: string, body?: unknown, user = "u-1"): Request {
  return new Request(url, {
    method,
    headers: { Authorization: `Bearer ${user}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function createApply(user = "u-1"): Promise<string> {
  const r = await handleApplyRequest(
    req("POST", "http://x/api/v1/apply", {
      session_id: "s1", apply_url: "https://jobs.lever.co/a/1",
    }, user), env, { kind: "list", method: "POST" },
  );
  return ((await r.json()) as { data: { item: { id: string } } }).data.item.id;
}

beforeEach(() => {
  __resetQAPendingStore();
  __resetApplyQueueStore();
  __resetSessionEventsStore();
  __resetQAMemoryStore();
});

describe("qa-pending API", () => {
  it("POST create sets apply status → needs_input", async () => {
    const applyId = await createApply();
    const r = await handleQAPendingRequest(
      req("POST", "http://x/api/v1/qa-pending", {
        apply_id: applyId, question_text: "Why us?", question_type: "long_text",
      }), env, { kind: "list", method: "POST" },
    );
    expect(r.status).toBe(201);

    const d = await handleApplyRequest(
      req("GET", `http://x/api/v1/apply/${applyId}`), env, { kind: "detail", method: "GET", id: applyId },
    );
    const j = await d.json() as { data: { item: { status: string } } };
    expect(j.data.item.status).toBe("needs_input");
  });

  it("GET list scopes by user", async () => {
    const a1 = await createApply("u-1");
    await handleQAPendingRequest(
      req("POST", "http://x/api/v1/qa-pending", { apply_id: a1, question_text: "Q1" }),
      env, { kind: "list", method: "POST" },
    );
    const r = await handleQAPendingRequest(
      req("GET", "http://x/api/v1/qa-pending", undefined, "u-2"),
      env, { kind: "list", method: "GET" },
    );
    const j = await r.json() as { data: { items: unknown[] } };
    expect(j.data.items).toHaveLength(0);
  });

  it("answer persists to qa_memory + resumes apply", async () => {
    const applyId = await createApply();
    const c = await handleQAPendingRequest(
      req("POST", "http://x/api/v1/qa-pending", { apply_id: applyId, question_text: "Do you need sponsorship?" }),
      env, { kind: "list", method: "POST" },
    );
    const id = ((await c.json()) as { data: { item: { id: string } } }).data.item.id;

    const r = await handleQAPendingRequest(
      req("POST", `http://x/api/v1/qa-pending/${id}/answer`, { answer: "No" }),
      env, { kind: "answer", method: "POST", id },
    );
    expect(r.status).toBe(200);

    const memory = await listQA(env, "u-1");
    expect(memory).toHaveLength(1);
    expect(memory[0].answer).toBe("No");

    const d = await handleApplyRequest(
      req("GET", `http://x/api/v1/apply/${applyId}`), env, { kind: "detail", method: "GET", id: applyId },
    );
    const jd = await d.json() as { data: { item: { status: string } } };
    expect(jd.data.item.status).toBe("running");
  });

  it("answer on unknown id → 404", async () => {
    const r = await handleQAPendingRequest(
      req("POST", "http://x/api/v1/qa-pending/missing/answer", { answer: "x" }),
      env, { kind: "answer", method: "POST", id: "missing" },
    );
    expect(r.status).toBe(404);
  });

  it("answer without body rejected 400", async () => {
    const r = await handleQAPendingRequest(
      req("POST", "http://x/api/v1/qa-pending/whatever/answer", { answer: "" }),
      env, { kind: "answer", method: "POST", id: "whatever" },
    );
    expect(r.status).toBe(400);
  });
});
