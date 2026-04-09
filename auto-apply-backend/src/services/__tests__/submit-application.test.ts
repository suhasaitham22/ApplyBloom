import { describe, expect, it } from "vitest";
import { submitApplication } from "../submit-application";

describe("submitApplication", () => {
  it("marks saved-for-later applications as not submitted", async () => {
    const result = await submitApplication({
      user_id: "user_123",
      job_id: "job_123",
      resume_artifact_id: "resume_123",
      apply_mode: "save_for_later",
      request_id: "req_123",
    });

    expect(result.submitted).toBe(false);
    expect(result.next_action).toBe("saved_for_later");
  });

  it("keeps auto-apply requests in a safe planning state until the adapter is connected", async () => {
    const result = await submitApplication({
      user_id: "user_123",
      job_id: "job_123",
      resume_artifact_id: "resume_123",
      apply_mode: "auto_apply",
      request_id: "req_123",
    });

    expect(result.submitted).toBe(false);
    expect(result.next_action).toBe("manual_review_required");
  });
});

