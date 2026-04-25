import { describe, it, expect, beforeEach } from "vitest";
import { handleResumeVersionsRequest } from "../resume-versions";
import { _memoryReset as resetVersions, createVersion } from "@/services/resume-versions/store";
import * as mem from "@/services/studio/memory-store";

const env = { DEMO_MODE: "true", DEV_DEMO_USER_ID: "u1" } as unknown as Env;

async function makeReq(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, {
    headers: { Authorization: "Bearer u1" },
    ...init,
  });
}

async function seedResume(userId = "u1") {
  return mem.createResume(userId, { name: "My Resume" });
}

describe("resume-versions API", () => {
  beforeEach(() => {
    resetVersions();
  });

  it("GET /versions returns 404 when resume doesn't belong to user", async () => {
    const r = await seedResume("other");
    const req = await makeReq(`/api/v1/resumes/${r.id}/versions`);
    const res = await handleResumeVersionsRequest(req, env, { kind: "list", resumeId: r.id });
    expect(res.status).toBe(404);
  });

  it("GET /versions lists in descending version order", async () => {
    const r = await seedResume();
    await createVersion(env, { resume_id: r.id, user_id: "u1", parsed: { a: 1 }, created_by: "user" });
    await createVersion(env, { resume_id: r.id, user_id: "u1", parsed: { a: 2 }, created_by: "ai", change_summary: "updated" });
    const req = await makeReq(`/api/v1/resumes/${r.id}/versions`);
    const res = await handleResumeVersionsRequest(req, env, { kind: "list", resumeId: r.id });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { versions: Array<{ version: number }> } };
    expect(body.data.versions.map((v) => v.version)).toEqual([2, 1]);
  });

  it("GET /versions/:v returns single version", async () => {
    const r = await seedResume();
    await createVersion(env, { resume_id: r.id, user_id: "u1", parsed: { v: 1 }, created_by: "user" });
    await createVersion(env, { resume_id: r.id, user_id: "u1", parsed: { v: 2 }, created_by: "ai" });
    const req = await makeReq(`/api/v1/resumes/${r.id}/versions/1`);
    const res = await handleResumeVersionsRequest(req, env, { kind: "detail", resumeId: r.id, version: 1 });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { version: { parsed: { v: number } } } };
    expect(body.data.version.parsed.v).toBe(1);
  });

  it("GET /versions/:v → 404 when version doesn't exist", async () => {
    const r = await seedResume();
    const req = await makeReq(`/api/v1/resumes/${r.id}/versions/99`);
    const res = await handleResumeVersionsRequest(req, env, { kind: "detail", resumeId: r.id, version: 99 });
    expect(res.status).toBe(404);
  });

  it("POST /versions/:v/restore rolls resume back + creates a new version", async () => {
    const r = await seedResume();
    await mem.updateResume("u1", r.id, { parsed: { skills: ["A"] } });
    await createVersion(env, { resume_id: r.id, user_id: "u1", parsed: { skills: ["A"] }, created_by: "user" });
    await mem.updateResume("u1", r.id, { parsed: { skills: ["A", "B"] } });
    await createVersion(env, { resume_id: r.id, user_id: "u1", parsed: { skills: ["A", "B"] }, created_by: "ai", change_summary: "added B" });

    const req = await makeReq(`/api/v1/resumes/${r.id}/versions/1/restore`, { method: "POST" });
    const res = await handleResumeVersionsRequest(req, env, { kind: "restore", resumeId: r.id, version: 1 });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { resume: { parsed: { skills: string[] } }; version: { version: number } } };
    expect(body.data.resume.parsed.skills).toEqual(["A"]);
    expect(body.data.version.version).toBe(3);
  });
});
