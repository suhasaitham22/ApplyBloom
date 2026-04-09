import { describe, expect, it } from "vitest";
import { enqueueParseResumeJob } from "../enqueue-parse-resume-job";

describe("enqueueParseResumeJob", () => {
  it("builds the parse resume queue message", async () => {
    await expect(
      enqueueParseResumeJob({
        user_id: "user_123",
        file_name: "resume.pdf",
        file_type: "application/pdf",
        storage_path: "resume-ingest/user_123/resume.pdf",
        request_id: "req_123",
      }),
    ).resolves.toEqual({
      queue_name: "parse-resume-queue",
      message: {
        type: "parse_resume",
        user_id: "user_123",
        artifact_id: "resume-ingest/user_123/resume.pdf",
        request_id: "req_123",
      },
    });
  });
});

