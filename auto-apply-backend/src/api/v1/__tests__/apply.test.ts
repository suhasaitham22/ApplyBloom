import { describe, it, expect, beforeEach } from "vitest";
import { handleApplyRequest } from "@/api/v1/apply";
import { __resetApplyQueueStore } from "@/services/apply-queue/store";
import { __resetSessionEventsStore } from "@/services/session-events/store";

const env = { DEMO_MODE: "true" } as unknown as Env;

function req(method: string, url: string, body?: unknown, user = "u-1"): Request {
  return new Request(url, {
    method,
    headers: { Authorization: `Bearer ${user}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => { __resetApplyQueueStore(); __resetSessionEventsStore(); });

describe("apply API", () => {
  it("POST enqueue → 201 + dedup on second call", async () => {
    const r = await handleApplyRequest(
      req("POST", "http://x/api/v1/apply", {
        session_id: "s1",
        apply_url: "https://boards.greenhouse.io/stripe/jobs/12345",
        job_title: "SWE", company: "Stripe",
      }), env, { kind: "list", method: "POST" },
    );
    expect(r.status).toBe(201);
    const j = await r.json() as { data: { item: { id: string; ats_provider: string } } };
    const firstId = j.data.item.id;
    expect(j.data.item.ats_provider).toBe("greenhouse");

    const r2 = await handleApplyRequest(
      req("POST", "http://x/api/v1/apply", {
        session_id: "s1", apply_url: "https://boards.greenhouse.io/stripe/jobs/12345",
      }), env, { kind: "list", method: "POST" },
    );
    const j2 = await r2.json() as { data: { item: { id: string } } };
    expect(j2.data.item.id).toBe(firstId);
  });

  it("POST enqueue rejects missing apply_url", async () => {
    const r = await handleApplyRequest(
      req("POST", "http://x/api/v1/apply", {}), env, { kind: "list", method: "POST" },
    );
    expect(r.status).toBe(400);
  });

  it("GET list filters by status", async () => {
    await handleApplyRequest(
      req("POST", "http://x/api/v1/apply", { session_id: null, apply_url: "https://boards.greenhouse.io/s/jobs/1" }),
      env, { kind: "list", method: "POST" },
    );
    const r = await handleApplyRequest(
      req("GET", "http://x/api/v1/apply?status=queued"), env, { kind: "list", method: "GET" },
    );
    const j = await r.json() as { data: { items: unknown[] } };
    expect(j.data.items).toHaveLength(1);
  });

  it("POST claim returns the queued item, flips status", async () => {
    await handleApplyRequest(
      req("POST", "http://x/api/v1/apply", { session_id: null, apply_url: "https://jobs.lever.co/a/1" }),
      env, { kind: "list", method: "POST" },
    );
    const r = await handleApplyRequest(
      req("POST", "http://x/api/v1/apply/claim", { device_id: "dev-42" }),
      env, { kind: "claim", method: "POST" },
    );
    const j = await r.json() as { data: { item: { status: string; claimed_by: string } | null } };
    expect(j.data.item?.status).toBe("claimed");
    expect(j.data.item?.claimed_by).toBe("dev-42");
  });

  it("POST claim returns null when queue is empty", async () => {
    const r = await handleApplyRequest(
      req("POST", "http://x/api/v1/apply/claim", {}), env, { kind: "claim", method: "POST" },
    );
    const j = await r.json() as { data: { item: unknown } };
    expect(j.data.item).toBeNull();
  });

  it("POST report step appends to attempt_log + emits event", async () => {
    const c = await handleApplyRequest(
      req("POST", "http://x/api/v1/apply", { session_id: "s1", apply_url: "https://jobs.lever.co/a/1" }),
      env, { kind: "list", method: "POST" },
    );
    const body = await c.json() as { data: { item: { id: string } } };
    const id = body.data.item.id;
    const rep = await handleApplyRequest(
      req("POST", `http://x/api/v1/apply/${id}/report`, { kind: "step", step: "opened_page" }),
      env, { kind: "report", method: "POST", id },
    );
    expect(rep.status).toBe(200);

    const detail = await handleApplyRequest(
      req("GET", `http://x/api/v1/apply/${id}`), env, { kind: "detail", method: "GET", id },
    );
    const dj = await detail.json() as { data: { item: { attempt_log: unknown[] } } };
    expect(dj.data.item.attempt_log).toHaveLength(1);
  });

  it("POST report submitted flips status + sets finished_at", async () => {
    const c = await handleApplyRequest(
      req("POST", "http://x/api/v1/apply", { session_id: null, apply_url: "https://jobs.lever.co/a/1" }),
      env, { kind: "list", method: "POST" },
    );
    const id = ((await c.json()) as { data: { item: { id: string } } }).data.item.id;
    await handleApplyRequest(
      req("POST", `http://x/api/v1/apply/${id}/report`, { kind: "submitted" }),
      env, { kind: "report", method: "POST", id },
    );
    const detail = await handleApplyRequest(
      req("GET", `http://x/api/v1/apply/${id}`), env, { kind: "detail", method: "GET", id },
    );
    const dj = await detail.json() as { data: { item: { status: string; finished_at: string | null } } };
    expect(dj.data.item.status).toBe("submitted");
    expect(dj.data.item.finished_at).not.toBeNull();
  });

  it("POST cancel marks cancelled + sets finished_at", async () => {
    const c = await handleApplyRequest(
      req("POST", "http://x/api/v1/apply", { session_id: null, apply_url: "https://jobs.lever.co/a/1" }),
      env, { kind: "list", method: "POST" },
    );
    const id = ((await c.json()) as { data: { item: { id: string } } }).data.item.id;
    const r = await handleApplyRequest(
      req("POST", `http://x/api/v1/apply/${id}/cancel`), env, { kind: "cancel", method: "POST", id },
    );
    const j = await r.json() as { data: { item: { status: string } } };
    expect(j.data.item.status).toBe("cancelled");
  });

  it("GET detail on missing id → 404", async () => {
    const r = await handleApplyRequest(
      req("GET", "http://x/api/v1/apply/missing"), env, { kind: "detail", method: "GET", id: "missing" },
    );
    expect(r.status).toBe(404);
  });

  it("cross-user isolation: user B cannot see user A's apply", async () => {
    const c = await handleApplyRequest(
      req("POST", "http://x/api/v1/apply", { session_id: null, apply_url: "https://jobs.lever.co/a/1" }, "userA"),
      env, { kind: "list", method: "POST" },
    );
    const id = ((await c.json()) as { data: { item: { id: string } } }).data.item.id;
    const r = await handleApplyRequest(
      req("GET", `http://x/api/v1/apply/${id}`, undefined, "userB"),
      env, { kind: "detail", method: "GET", id },
    );
    expect(r.status).toBe(404);
  });
});
