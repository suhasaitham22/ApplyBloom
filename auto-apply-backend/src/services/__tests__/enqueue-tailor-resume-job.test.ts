import { describe, expect, it } from "vitest";
import { enqueueTailorResumeJob } from "../enqueue-tailor-resume-job";

describe("enqueueTailorResumeJob", () => {
  it("builds the tailor resume queue message", async () => {
    await expect(
      enqueueTailorResumeJob({
        user_id: "user_123",
        profile_id: "profile_123",
        job_id: "job_123",
        mode: "manual",
        request_id: "req_123",
      }),
    ).resolves.toEqual({
      queue_name: "tailor-resume-queue",
      message: {
        type: "tailor_resume",
        user_id: "user_123",
        profile_id: "profile_123",
        job_id: "job_123",
        mode: "manual",
        request_id: "req_123",
      },
    });
  });
});
