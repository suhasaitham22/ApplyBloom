import { describe, expect, it, vi } from "vitest";
import { processFetchJobsJob } from "../process-fetch-jobs-job";

vi.mock("@/services/discover-jobs", () => ({
  discoverJobs: vi.fn().mockResolvedValue([{ title: "Engineer" }]),
}));

describe("processFetchJobsJob", () => {
  it("returns fetched jobs", async () => {
    await expect(
      processFetchJobsJob({
        user_id: "user_123",
        profile_id: "profile_123",
        request_id: "req_123",
      }),
    ).resolves.toEqual({
      user_id: "user_123",
      request_id: "req_123",
      jobs: [{ title: "Engineer" }],
    });
  });
});
