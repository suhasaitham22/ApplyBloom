import { describe, expect, it, vi } from "vitest";
import { processApplyJob } from "../process-apply-job";

vi.mock("@/services/submit-application", () => ({
  submitApplication: vi.fn().mockResolvedValue({
    submitted: false,
    application_reference: "user_123:job_123:req_123",
    mode: "manual_review",
    next_action: "manual_review_required",
    notes: [],
  }),
}));

vi.mock("@/services/store-application-event", () => ({
  storeApplicationEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/send-notification", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

describe("processApplyJob", () => {
  it("returns the submission planning result", async () => {
    await expect(
      processApplyJob({
        user_id: "user_123",
        job_id: "job_123",
        resume_artifact_id: "resume_123",
        apply_mode: "manual_review",
        request_id: "req_123",
      }),
    ).resolves.toEqual({
      submitted: false,
      application_reference: "user_123:job_123:req_123",
      mode: "manual_review",
      next_action: "manual_review_required",
      notes: [],
    });
  });
});
