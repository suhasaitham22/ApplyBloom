import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchApplicationsFromBackend,
  fetchJobMatchesFromBackend,
  requestResumeTailoring,
  uploadResumeToBackend,
} from "../auto-apply-backend";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("auto-apply-backend helpers", () => {
  it("posts resume uploads to the backend contract endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { status: "queued" } }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await uploadResumeToBackend({
      file_name: "resume.pdf",
      file_type: "application/pdf",
      storage_path: "resume-ingest/resume.pdf",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/resume/upload"),
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("posts job match requests to the backend contract endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { matches: [] } }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await fetchJobMatchesFromBackend();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/match"),
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("requests tailored resume generation on the correct endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { status: "queued" } }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await requestResumeTailoring("job_123");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/resume/tailor"),
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("fetches applications from the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { applications: [] } }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await fetchApplicationsFromBackend();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/applications"),
      expect.anything(),
    );
  });
});
