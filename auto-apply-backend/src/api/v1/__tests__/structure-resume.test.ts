import { describe, it, expect, vi } from "vitest";

vi.mock("@/services/structure-resume", () => ({
  structureResume: vi.fn(async () => ({
    data: { full_name: "Jane Doe", headline: "Engineer", contact: {}, summary: "Summary", skills: ["TS"], experience: [], education: [], confidence: 0.8 },
    demo: true,
  })),
}));

import { handleStructureResumeRequest } from "../structure-resume";

const env = { DEMO_MODE: "true" } as any;

function req(method: string, body?: unknown): Request {
  const opts: RequestInit = {
    method,
    headers: { Authorization: "Bearer test_user", "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  return new Request("https://example.com/api/v1/structure-resume", opts);
}

describe("handleStructureResumeRequest", () => {
  it("rejects non-POST", async () => {
    const res = await handleStructureResumeRequest(req("GET"), env);
    expect(res.status).toBe(405);
  });

  it("rejects empty resume_text", async () => {
    const res = await handleStructureResumeRequest(req("POST", { resume_text: "" }), env);
    expect(res.status).toBe(400);
  });

  it("rejects missing resume_text", async () => {
    const res = await handleStructureResumeRequest(req("POST", {}), env);
    expect(res.status).toBe(400);
  });

  it("returns structured resume on success", async () => {
    const res = await handleStructureResumeRequest(
      req("POST", { resume_text: "Jane Doe\nEngineer\njane@test.com", file_name: "resume.pdf" }),
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.resume.full_name).toBe("Jane Doe");
    expect(body.data.demo_mode).toBe(true);
    expect(body.data.file_name).toBe("resume.pdf");
  });

  it("defaults file_name to null", async () => {
    const res = await handleStructureResumeRequest(
      req("POST", { resume_text: "some text" }),
      env,
    );
    const body = (await res.json()) as any;
    expect(body.data.file_name).toBeNull();
  });
});
