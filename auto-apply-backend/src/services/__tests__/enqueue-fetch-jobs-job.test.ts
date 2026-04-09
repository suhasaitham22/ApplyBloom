import { describe, expect, it } from "vitest";
import { enqueueFetchJobsJob } from "../enqueue-fetch-jobs-job";

describe("enqueueFetchJobsJob", () => {
  it("builds the fetch jobs queue message", async () => {
    await expect(
      enqueueFetchJobsJob({
        user_id: "user_123",
        profile_id: "profile_123",
        request_id: "req_123",
      }),
    ).resolves.toEqual({
      queue_name: "fetch-jobs-queue",
      message: {
        type: "fetch_jobs",
        user_id: "user_123",
        profile_id: "profile_123",
        request_id: "req_123",
      },
    });
  });
});

