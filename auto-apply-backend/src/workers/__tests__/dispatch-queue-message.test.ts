import { describe, expect, it, vi } from "vitest";
import { dispatchQueueMessage } from "../dispatch-queue-message";

vi.mock("@/workers/process-parse-resume-job", () => ({
  processParseResumeJob: vi.fn().mockResolvedValue({ parsed: true }),
}));

vi.mock("@/workers/process-fetch-jobs-job", () => ({
  processFetchJobsJob: vi.fn().mockResolvedValue({ jobs: [] }),
}));

vi.mock("@/workers/process-match-jobs-job", () => ({
  processMatchJobsJob: vi.fn().mockResolvedValue({ matches: [] }),
}));

vi.mock("@/workers/process-tailor-resume-job", () => ({
  processTailorResumeJob: vi.fn().mockResolvedValue({ tailored: true }),
}));

vi.mock("@/workers/process-apply-job", () => ({
  processApplyJob: vi.fn().mockResolvedValue({ submitted: true }),
}));

vi.mock("@/workers/process-notify-user-job", () => ({
  processNotifyUserJob: vi.fn().mockResolvedValue({ delivered: true }),
}));

describe("dispatchQueueMessage", () => {
  it("routes parse resume jobs", async () => {
    await expect(
      dispatchQueueMessage({
        type: "parse_resume",
        user_id: "user_123",
        artifact_id: "artifact_123",
        request_id: "req_123",
      }),
    ).resolves.toEqual({ parsed: true });
  });

  it("routes tailor resume jobs without expanded payloads", async () => {
    await expect(
      dispatchQueueMessage({
        type: "tailor_resume",
        user_id: "user_123",
        profile_id: "profile_123",
        job_id: "job_123",
        mode: "manual",
        request_id: "req_123",
      }),
    ).resolves.toEqual({
      tailored: true,
    });
  });

  it("routes match jobs jobs without preloaded job payloads", async () => {
    await expect(
      dispatchQueueMessage({
        type: "match_jobs",
        user_id: "user_123",
        profile_id: "profile_123",
        request_id: "req_123",
      }),
    ).resolves.toEqual({
      matches: [],
    });
  });
});
