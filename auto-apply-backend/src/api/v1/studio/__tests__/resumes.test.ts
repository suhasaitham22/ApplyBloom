import { describe, it, expect, beforeEach } from "vitest";
import { handleResumesRequest } from "../resumes";

const env = { DEMO_MODE: "true" } as any;

function resetStore() {
  const g = globalThis as unknown as { __applybloom_studio?: unknown };
  delete g.__applybloom_studio;
}

function authedReq(method: string, body?: unknown): Request {
  const opts: RequestInit = {
    method,
    headers: { Authorization: "Bearer test_user", "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  return new Request("https://example.com/api/v1/resumes", opts);
}

describe("handleResumesRequest", () => {
  beforeEach(() => resetStore());

  it("rejects unauthenticated request", async () => {
    const req = new Request("https://example.com/api/v1/resumes");
    const env2 = { SUPABASE_JWT_SECRET: "some-secret-key-long-enough-for-hs256-xxxxxx" } as any;
    const res = await handleResumesRequest(req, env2, { method: "GET" });
    expect(res.status).toBe(401);
  });

  it("GET list returns empty initially", async () => {
    const res = await handleResumesRequest(authedReq("GET"), env, { method: "GET" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.resumes).toEqual([]);
  });

  it("POST creates a resume", async () => {
    const res = await handleResumesRequest(
      authedReq("POST", { name: "My Resume", raw_text: "hello" }),
      env,
      { method: "POST" },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.resume.name).toBe("My Resume");
    expect(body.data.resume.raw_text).toBe("hello");
  });

  it("POST defaults name to Untitled", async () => {
    const res = await handleResumesRequest(
      authedReq("POST", {}),
      env,
      { method: "POST" },
    );
    const body = (await res.json()) as any;
    expect(body.data.resume.name).toBe("Untitled resume");
  });

  it("GET by id returns resume", async () => {
    const createRes = await handleResumesRequest(authedReq("POST", { name: "A" }), env, { method: "POST" });
    const { resume } = ((await createRes.json()) as any).data;

    const res = await handleResumesRequest(authedReq("GET"), env, { method: "GET", id: resume.id });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.resume.id).toBe(resume.id);
  });

  it("GET by id returns 404 for missing", async () => {
    const res = await handleResumesRequest(authedReq("GET"), env, { method: "GET", id: "nope" });
    expect(res.status).toBe(404);
  });

  it("PATCH updates resume", async () => {
    const createRes = await handleResumesRequest(authedReq("POST", { name: "A" }), env, { method: "POST" });
    const { resume } = ((await createRes.json()) as any).data;

    const patchRes = await handleResumesRequest(
      authedReq("PATCH", { name: "Updated" }),
      env,
      { method: "PATCH", id: resume.id },
    );
    expect(patchRes.status).toBe(200);
    const body = (await patchRes.json()) as any;
    expect(body.data.resume.name).toBe("Updated");
  });

  it("DELETE removes resume", async () => {
    const createRes = await handleResumesRequest(authedReq("POST", { name: "A" }), env, { method: "POST" });
    const { resume } = ((await createRes.json()) as any).data;

    const delRes = await handleResumesRequest(authedReq("DELETE"), env, { method: "DELETE", id: resume.id });
    expect(delRes.status).toBe(200);

    const getRes = await handleResumesRequest(authedReq("GET"), env, { method: "GET", id: resume.id });
    expect(getRes.status).toBe(404);
  });

  it("unsupported method returns 405", async () => {
    const res = await handleResumesRequest(authedReq("PUT"), env, { method: "PUT" });
    expect(res.status).toBe(405);
  });
});
