import { describe, expect, it } from "vitest";
import { enqueueMatchJobsJob } from "../enqueue-match-jobs-job";

describe("enqueueMatchJobsJob", () => {
  it("builds the match jobs queue message", async () => {
    await expect(
      enqueueMatchJobsJob({
        user_id: "user_123",
        profile_id: "profile_123",
        request_id: "req_123",
      }),
    ).resolves.toEqual({
      queue_name: "match-jobs-queue",
      message: {
        type: "match_jobs",
        user_id: "user_123",
        profile_id: "profile_123",
        request_id: "req_123",
      },
    });
  });
});

