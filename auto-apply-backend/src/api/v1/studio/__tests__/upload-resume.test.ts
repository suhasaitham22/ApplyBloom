import { describe, it, expect, beforeEach } from "vitest";
import { handleUploadResumeRequest } from "../upload-resume";

const env = { DEMO_MODE: "true" } as any;

function resetStore() {
  const g = globalThis as unknown as { __applybloom_studio?: unknown };
  delete g.__applybloom_studio;
}

function makeFormRequest(fields: Record<string, string | File>): Request {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    form.append(k, v);
  }
  return new Request("https://example.com/api/v1/resumes/upload", {
    method: "POST",
    headers: { Authorization: "Bearer test_user" },
    body: form,
  });
}

describe("handleUploadResumeRequest", () => {
  beforeEach(() => resetStore());

  it("rejects unauthenticated request", async () => {
    const req = new Request("https://example.com/upload", { method: "POST" });
    const env2 = { SUPABASE_JWT_SECRET: "key-long-enough-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" } as any;
    const res = await handleUploadResumeRequest(req, env2);
    expect(res.status).toBe(401);
  });

  it("rejects request without file", async () => {
    const form = new FormData();
    form.append("name", "test");
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { Authorization: "Bearer test_user" },
      body: form,
    });
    const res = await handleUploadResumeRequest(req, env);
    expect(res.status).toBe(400);
  });

  it("uploads file and creates resume", async () => {
    const file = new File(["hello world"], "resume.pdf", { type: "application/pdf" });
    const req = makeFormRequest({ file });
    const res = await handleUploadResumeRequest(req, env);
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.resume.name).toBe("resume");
    expect(body.data.storage.file_type).toBe("pdf");
    expect(body.data.storage.bytes).toBe(11);
  });

  it("uses custom name from form", async () => {
    const file = new File(["data"], "doc.txt", { type: "text/plain" });
    const req = makeFormRequest({ file, name: "Custom Name" });
    const res = await handleUploadResumeRequest(req, env);
    const body = (await res.json()) as any;
    expect(body.data.resume.name).toBe("Custom Name");
  });
});
