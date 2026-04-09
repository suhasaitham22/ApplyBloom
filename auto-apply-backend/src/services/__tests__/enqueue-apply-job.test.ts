import { describe, expect, it } from "vitest";
import { enqueueApplyJob } from "../enqueue-apply-job";

describe("enqueueApplyJob", () => {
  it("builds the apply job queue message", async () => {
    await expect(
      enqueueApplyJob({
        user_id: "user_123",
        job_id: "job_123",
        resume_artifact_id: "resume_123",
        apply_mode: "manual_review",
        request_id: "req_123",
      }),
    ).resolves.toEqual({
      queue_name: "apply-job-queue",
      message: {
        type: "apply_job",
        user_id: "user_123",
        job_id: "job_123",
        resume_artifact_id: "resume_123",
        apply_mode: "manual_review",
        request_id: "req_123",
      },
    });
  });
});

