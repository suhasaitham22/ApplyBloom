import { describe, expect, it } from "vitest";
import { handleUploadResumeRequest } from "../upload-resume";

describe("handleUploadResumeRequest", () => {
  it("rejects non-POST requests", async () => {
    const request = new Request("https://example.com/api/v1/resume/upload", {
      method: "GET",
      headers: {
        Authorization: "Bearer user_123",
      },
    });

    const response = await handleUploadResumeRequest(request, {} as Env);

    expect(response.status).toBe(405);
  });

  it("rejects missing auth", async () => {
    const request = new Request("https://example.com/api/v1/resume/upload", {
      method: "POST",
      body: JSON.stringify({
        file_name: "resume.pdf",
        file_type: "application/pdf",
        storage_path: "user_123/resume.pdf",
      }),
    });

    const response = await handleUploadResumeRequest(request, {} as Env);

    expect(response.status).toBe(401);
  });
});

