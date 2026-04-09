import { describe, expect, it } from "vitest";
import { resetRuntimeStore } from "@/lib/state/runtime-store";
import { handleGetJobMatchesRequest } from "../get-job-matches";
import { handleUploadResumeRequest } from "../upload-resume";

describe("resume upload to job match flow", () => {
  it("produces ranked matches after upload in demo mode", async () => {
    resetRuntimeStore();

    const uploadRequest = new Request("https://example.com/api/v1/resume/upload", {
      method: "POST",
      body: JSON.stringify({
        file_name: "resume.txt",
        file_type: "text/plain",
        storage_path: "resume-ingest/user_123/resume.txt",
        resume_text: `
Jane Doe
Backend Engineer
jane@example.com
TypeScript, Postgres, Redis
        `,
      }),
    });

    const uploadResponse = await handleUploadResumeRequest(
      uploadRequest,
      {
        API_VERSION: "v1",
        DEV_DEMO_USER_ID: "user_123",
        DEV_IMMEDIATE_QUEUE_PROCESSING: "true",
      } as Env,
    );

    expect(uploadResponse.status).toBe(200);

    const matchRequest = new Request("https://example.com/api/v1/match", {
      method: "POST",
      headers: {
        Authorization: "Bearer user_123",
      },
      body: JSON.stringify({ limit: 5 }),
    });

    const matchResponse = await handleGetJobMatchesRequest(matchRequest, {
      API_VERSION: "v1",
    } as Env);

    expect(matchResponse.status).toBe(200);
    const matchBody = (await matchResponse.json()) as {
      data: { matches: Array<{ id: string }> };
    };
    expect(matchBody.data.matches.length).toBeGreaterThan(0);
  });
});
