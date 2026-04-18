import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase browser client to isolate studio-client
vi.mock("@/lib/supabase/browser", () => ({
  getSupabaseBrowserClient: () => null,
}));

// Ensure DEMO_MODE is true so getAuthToken returns DEMO_USER
vi.stubEnv("NEXT_PUBLIC_BACKEND_API_BASE_URL", "http://127.0.0.1:8787");

import {
  listResumes,
  createSession,
  sendMessage,
  createResume,
  updateSession,
} from "../studio-client";

function mockOk(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data }),
    text: () => Promise.resolve(JSON.stringify({ data })),
  } as unknown as Response;
}
function mockErr(status: number, problem: { title?: string; detail?: string; code?: string } = {}) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve(problem),
    text: () => Promise.resolve(JSON.stringify(problem)),
  } as unknown as Response;
}

describe("studio-client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("listResumes returns resumes array", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockOk({ resumes: [{ id: "r1", name: "Base" }] }));
    global.fetch = fetchSpy;
    const result = await listResumes();
    expect(result.resumes).toHaveLength(1);
    expect(result.resumes[0].id).toBe("r1");
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/api/v1/resumes",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer local_demo_user" }),
      }),
    );
  });

  it("createSession POSTs with correct body", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockOk({ session: { id: "s1", title: "t", mode: "single" } }));
    global.fetch = fetchSpy;
    await createSession({ title: "My session", mode: "single", resume_id: "r1" });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:8787/api/v1/sessions");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body).toEqual({ title: "My session", mode: "single", resume_id: "r1" });
  });

  it("sendMessage POSTs content to the session messages endpoint", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockOk({ messages: [] }));
    global.fetch = fetchSpy;
    await sendMessage("sess-42", "hello");
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:8787/api/v1/sessions/sess-42/messages");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ content: "hello" });
  });

  it("createResume posts name + optional raw_text", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockOk({ resume: { id: "r2", name: "new" } }));
    global.fetch = fetchSpy;
    await createResume("new", "plain text resume");
    const init = fetchSpy.mock.calls[0][1];
    expect(JSON.parse(init.body)).toEqual({ name: "new", raw_text: "plain text resume" });
  });

  it("updateSession PATCHes provided fields", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockOk({ session: { id: "s1" } }));
    global.fetch = fetchSpy;
    await updateSession("s1", { title: "Renamed" });
    const init = fetchSpy.mock.calls[0][1];
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ title: "Renamed" });
  });

  it("throws with backend error detail on non-2xx", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockErr(400, { title: "Validation", detail: "Content required", code: "bad_input" }),
    );
    await expect(sendMessage("s1", "")).rejects.toThrow(/Content required/);
  });

  it("throws with generic message on non-2xx without body", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve(null),
      text: () => Promise.resolve(""),
    } as unknown as Response);
    await expect(listResumes()).rejects.toThrow(/HTTP 503/);
  });
});

describe("studio-client — remaining methods", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  function mockOk(data: unknown) {
    return {
      ok: true, status: 200,
      json: () => Promise.resolve({ data }),
      text: () => Promise.resolve(JSON.stringify({ data })),
    } as unknown as Response;
  }

  it("parseResume POSTs resume_text to parse endpoint", async () => {
    const { parseResume } = await import("../studio-client");
    const fetchSpy = vi.fn().mockResolvedValue(mockOk({}));
    global.fetch = fetchSpy;
    await parseResume("s1", "raw text");
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/sessions\/s1\/parse$/);
    expect(JSON.parse(init.body)).toEqual({ resume_text: "raw text" });
  });

  it("tailorResume POSTs resume payload", async () => {
    const { tailorResume } = await import("../studio-client");
    const fetchSpy = vi.fn().mockResolvedValue(mockOk({}));
    global.fetch = fetchSpy;
    await tailorResume("s1", { full_name: "x" });
    expect(fetchSpy.mock.calls[0][0]).toMatch(/\/sessions\/s1\/tailor$/);
  });

  it("applySession POSTs to apply endpoint", async () => {
    const { applySession } = await import("../studio-client");
    const fetchSpy = vi.fn().mockResolvedValue(mockOk({ submitted: true, session: {} }));
    global.fetch = fetchSpy;
    await applySession("s1");
    expect(fetchSpy.mock.calls[0][0]).toMatch(/\/sessions\/s1\/apply$/);
  });

  it("lockSession / startSession / pauseSessionApi / resumeSessionApi / cancelSession all POST to their endpoints", async () => {
    const mod = await import("../studio-client");
    const fetchSpy = vi.fn().mockResolvedValue(mockOk({ session: {} }));
    global.fetch = fetchSpy;
    await mod.lockSession("s1");
    await mod.startSession("s1");
    await mod.pauseSessionApi("s1");
    await mod.resumeSessionApi("s1");
    await mod.cancelSession("s1");
    expect(fetchSpy.mock.calls[0][0]).toMatch(/lock$/);
    expect(fetchSpy.mock.calls[1][0]).toMatch(/start$/);
    expect(fetchSpy.mock.calls[2][0]).toMatch(/pause$/);
    expect(fetchSpy.mock.calls[3][0]).toMatch(/resume$/);
    expect(fetchSpy.mock.calls[4][0]).toMatch(/cancel$/);
    for (const call of fetchSpy.mock.calls) {
      expect(call[1].method).toBe("POST");
    }
  });

  it("deleteResume DELETEs the resource", async () => {
    const { deleteResume } = await import("../studio-client");
    const fetchSpy = vi.fn().mockResolvedValue(mockOk({ deleted: true }));
    global.fetch = fetchSpy;
    await deleteResume("r1");
    expect(fetchSpy.mock.calls[0][0]).toMatch(/\/resumes\/r1$/);
    expect(fetchSpy.mock.calls[0][1].method).toBe("DELETE");
  });

  it("updateResume PATCHes provided fields", async () => {
    const { updateResume } = await import("../studio-client");
    const fetchSpy = vi.fn().mockResolvedValue(mockOk({ resume: {} }));
    global.fetch = fetchSpy;
    await updateResume("r1", { name: "new" });
    expect(fetchSpy.mock.calls[0][1].method).toBe("PATCH");
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({ name: "new" });
  });

  it("uploadResumeFile uses multipart form-data and Bearer token", async () => {
    const { uploadResumeFile } = await import("../studio-client");
    const fetchSpy = vi.fn().mockResolvedValue(mockOk({ resume: {}, storage: {} }));
    global.fetch = fetchSpy;
    const file = new File(["hello"], "resume.txt", { type: "text/plain" });
    await uploadResumeFile({ file, name: "my resume" });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/resumes\/upload$/);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^Bearer /);
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("uploadResumeFile supports replaceResumeId", async () => {
    const { uploadResumeFile } = await import("../studio-client");
    const fetchSpy = vi.fn().mockResolvedValue(mockOk({ resume: {}, storage: {} }));
    global.fetch = fetchSpy;
    const file = new File(["x"], "r.txt", { type: "text/plain" });
    await uploadResumeFile({ file, replaceResumeId: "r2" });
    const form = fetchSpy.mock.calls[0][1].body as FormData;
    expect(form.get("replace_resume_id")).toBe("r2");
  });

  it("uploadResumeFile throws on non-2xx", async () => {
    const { uploadResumeFile } = await import("../studio-client");
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 413,
      json: () => Promise.resolve({ title: "File too large", detail: "Max 5 MB" }),
    } as unknown as Response);
    const file = new File(["x"], "r.txt");
    await expect(uploadResumeFile({ file })).rejects.toThrow(/Max 5 MB/);
  });
});
