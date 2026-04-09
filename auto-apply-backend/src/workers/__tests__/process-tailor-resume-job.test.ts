import { describe, expect, it, vi } from "vitest";
import { processTailorResumeJob } from "../process-tailor-resume-job";

vi.mock("@/services/tailor-resume", () => ({
  tailorResume: vi.fn().mockResolvedValue({ resume: "tailored" }),
}));

vi.mock("@/services/render-resume-pdf", () => ({
  renderResumePdf: vi.fn().mockResolvedValue({
    file_name: "resume.pdf",
    content_type: "application/pdf",
    base64_pdf: "UEZERg==",
  }),
}));

describe("processTailorResumeJob", () => {
  it("returns tailored resume artifacts", async () => {
    await expect(
      processTailorResumeJob({
        user_id: "user_123",
        profile_id: "profile_123",
        job_id: "job_123",
        request_id: "req_123",
        resume: {},
        job: {},
      }),
    ).resolves.toEqual({
      user_id: "user_123",
      request_id: "req_123",
      job_id: "job_123",
      tailored_resume: { resume: "tailored" },
      rendered_pdf: {
        file_name: "resume.pdf",
        content_type: "application/pdf",
        base64_pdf: "UEZERg==",
      },
    });
  });
});
