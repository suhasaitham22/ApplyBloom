import { describe, expect, it, vi } from "vitest";
import { processMatchJobsJob } from "../process-match-jobs-job";

vi.mock("@/services/rank-job-matches", () => ({
  rankJobMatches: vi.fn().mockResolvedValue([{ score: 0.9 }]),
}));

describe("processMatchJobsJob", () => {
  it("returns ranked matches", async () => {
    await expect(
      processMatchJobsJob({
        user_id: "user_123",
        profile_id: "profile_123",
        request_id: "req_123",
        jobs: [{ id: "job_123", title: "Engineer" }],
      }),
    ).resolves.toEqual({
      user_id: "user_123",
      request_id: "req_123",
      matches: [{ score: 0.9 }],
    });
  });
});
