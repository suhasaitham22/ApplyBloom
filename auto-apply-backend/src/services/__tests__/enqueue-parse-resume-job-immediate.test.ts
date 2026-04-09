import { describe, expect, it } from "vitest";
import { getRuntimeProfile, resetRuntimeStore } from "@/lib/state/runtime-store";
import { enqueueParseResumeJob } from "../enqueue-parse-resume-job";

describe("enqueueParseResumeJob immediate processing", () => {
  it("parses immediately when demo queue processing is enabled", async () => {
    resetRuntimeStore();

    await enqueueParseResumeJob(
      {
        user_id: "user_123",
        file_name: "resume.txt",
        file_type: "text/plain",
        storage_path: "resume-ingest/user_123/resume.txt",
        resume_text: `
Jane Doe
Backend Engineer
jane@example.com
TypeScript, Postgres
        `,
        request_id: "req_123",
      },
      {
        API_VERSION: "v1",
        DEV_IMMEDIATE_QUEUE_PROCESSING: "true",
      } as Env,
    );

    expect(getRuntimeProfile("user_123")?.headline).toBe("Backend Engineer");
  });
});
