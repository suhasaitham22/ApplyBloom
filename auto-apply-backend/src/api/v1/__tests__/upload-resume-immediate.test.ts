import { describe, expect, it } from "vitest";
import { getRuntimeProfile, resetRuntimeStore } from "@/lib/state/runtime-store";
import { handleUploadResumeRequest } from "../upload-resume";

describe("handleUploadResumeRequest immediate processing", () => {
  it("parses and saves a runtime profile when demo queue processing is enabled", async () => {
    resetRuntimeStore();

    const request = new Request("https://example.com/api/v1/resume/upload", {
      method: "POST",
      body: JSON.stringify({
        file_name: "resume.txt",
        file_type: "text/plain",
        storage_path: "resume-ingest/user_123/resume.txt",
        resume_text: `
Jane Doe
Backend Engineer
jane@example.com
TypeScript, Postgres
        `,
      }),
    });

    const response = await handleUploadResumeRequest(
      request,
      {
        API_VERSION: "v1",
        DEV_DEMO_USER_ID: "user_123",
        DEV_IMMEDIATE_QUEUE_PROCESSING: "true",
      } as Env,
    );

    expect(response.status).toBe(200);
    expect(getRuntimeProfile("user_123")?.headline).toBe("Backend Engineer");
  });
});
