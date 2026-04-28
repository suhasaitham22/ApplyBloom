import { describe, it, expect, beforeEach, vi } from "vitest";
import { handleJobsRequest } from "@/api/v1/jobs";
import { __resetJobsStore, upsertDiscoveredJobs, upsertJobMatches } from "@/services/jobs/store";
import { __resetApplyQueueStore } from "@/services/apply-queue/store";
import { __resetUserProfileStore, upsertProfile } from "@/services/user-profile/store";
import type { NormalizedJob } from "@/services/job-sources/types";

const env = { DEMO_MODE: "true" } as unknown as Env;

function req(method: string, url: string, body?: unknown, user = "u-1"): Request {
  return new Request(url, {
    method,
    headers: { Authorization: `Bearer ${user}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function mkJob(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    source: "greenhouse", source_job_id: "1", company: "Co", title: "SWE",
    location: "SF", description: "build cool stuff", apply_url: "https://boards.greenhouse.io/x/jobs/1",
    ats_provider: "greenhouse", salary_min: null, salary_max: null, remote: null,
    tags: [], posted_at: null, ...overrides,
  };
}

beforeEach(() => {
  __resetJobsStore();
  __resetApplyQueueStore();
  __resetUserProfileStore();
});

describe("jobs API", () => {
  it("GET /jobs returns ranked matches", async () => {
    const [j] = await upsertDiscoveredJobs(env, [mkJob()]);
    await upsertJobMatches(env, "u-1", [{ job_id: j.id, score: 55, breakdown: {} }]);
    const r = await handleJobsRequest(
      req("GET", "http://x/api/v1/jobs"), env, { kind: "list", method: "GET" },
    );
    expect(r.status).toBe(200);
    const body = await r.json() as { data: { items: Array<{ score: number }> } };
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].score).toBe(55);
  });

  it("GET /jobs respects ?status=", async () => {
    const [j] = await upsertDiscoveredJobs(env, [mkJob()]);
    await upsertJobMatches(env, "u-1", [{ job_id: j.id, score: 55, breakdown: {} }]);
    const r = await handleJobsRequest(
      req("GET", "http://x/api/v1/jobs?status=saved"), env, { kind: "list", method: "GET" },
    );
    const body = await r.json() as { data: { items: unknown[] } };
    expect(body.data.items).toHaveLength(0);
  });

  it("PATCH updates match status", async () => {
    const [j] = await upsertDiscoveredJobs(env, [mkJob()]);
    const [m] = await upsertJobMatches(env, "u-1", [{ job_id: j.id, score: 1, breakdown: {} }]);
    const r = await handleJobsRequest(
      req("PATCH", `http://x/api/v1/jobs/${m.id}`, { status: "saved" }), env,
      { kind: "patch", method: "PATCH", id: m.id },
    );
    expect(r.status).toBe(200);
    const body = await r.json() as { data: { item: { status: string } } };
    expect(body.data.item.status).toBe("saved");
  });

  it("PATCH rejects invalid status", async () => {
    const r = await handleJobsRequest(
      req("PATCH", "http://x/api/v1/jobs/x", { status: "bogus" }), env,
      { kind: "patch", method: "PATCH", id: "x" },
    );
    expect(r.status).toBe(400);
  });

  it("POST /:id/apply enqueues + flips status to queued_apply", async () => {
    const [j] = await upsertDiscoveredJobs(env, [mkJob()]);
    const [m] = await upsertJobMatches(env, "u-1", [{ job_id: j.id, score: 1, breakdown: {} }]);
    const r = await handleJobsRequest(
      req("POST", `http://x/api/v1/jobs/${m.id}/apply`), env,
      { kind: "apply", method: "POST", id: m.id },
    );
    expect(r.status).toBe(200);
    const body = await r.json() as { data: { apply: { apply_url: string } } };
    expect(body.data.apply.apply_url).toBe("https://boards.greenhouse.io/x/jobs/1");

    // Verify status flipped
    const list = await handleJobsRequest(
      req("GET", "http://x/api/v1/jobs"), env, { kind: "list", method: "GET" },
    );
    const lb = await list.json() as { data: { items: Array<{ status: string }> } };
    expect(lb.data.items[0].status).toBe("queued_apply");
  });

  it("POST /:id/apply → 404 for unknown match", async () => {
    const r = await handleJobsRequest(
      req("POST", "http://x/api/v1/jobs/missing/apply"), env,
      { kind: "apply", method: "POST", id: "missing" },
    );
    expect(r.status).toBe(404);
  });

  it("POST /refresh → 409 without profile", async () => {
    const r = await handleJobsRequest(
      req("POST", "http://x/api/v1/jobs/refresh"), env,
      { kind: "refresh", method: "POST" },
    );
    expect(r.status).toBe(409);
    const body = await r.json() as { code?: string };
    expect(body.code).toBe("profile_missing");
  });

  it("POST /refresh with profile → calls aggregator (mocked)", async () => {
    await upsertProfile(env, "u-1", {
      legal_first_name: "X", legal_last_name: "Y",
      email: "x@y.com", phone: "+1", location: "SF",
      work_authorization: "citizen", relocation_ok: true,
    });
    // Mock the external fetches used by the real adapters
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ jobs: [], data: [] }), { status: 200 }));
    const r = await handleJobsRequest(
      req("POST", "http://x/api/v1/jobs/refresh"), env,
      { kind: "refresh", method: "POST" },
    );
    expect(r.status).toBe(200);
    const body = await r.json() as { data: { skipped: boolean } };
    expect(body.data.skipped).toBe(false);
  });

  it("cross-user isolation: u-2 cannot patch u-1's match", async () => {
    const [j] = await upsertDiscoveredJobs(env, [mkJob()]);
    const [m] = await upsertJobMatches(env, "u-1", [{ job_id: j.id, score: 1, breakdown: {} }]);
    const r = await handleJobsRequest(
      req("PATCH", `http://x/api/v1/jobs/${m.id}`, { status: "rejected" }, "u-2"), env,
      { kind: "patch", method: "PATCH", id: m.id },
    );
    expect(r.status).toBe(404);
  });
});
