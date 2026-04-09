import { describe, expect, it } from "vitest";
import { resetRuntimeStore, saveRuntimeProfile } from "@/lib/state/runtime-store";
import { handleTailorResumeRequest } from "../tailor-resume";

describe("handleTailorResumeRequest immediate processing", () => {
  it("returns a tailored resume artifact in demo mode", async () => {
    resetRuntimeStore();
    saveRuntimeProfile({
      user_id: "user_123",
      full_name: "Jane Doe",
      headline: "Backend Engineer",
      skills: ["TypeScript", "Postgres", "Redis"],
      years_experience: 5,
      summary: "Backend engineer summary",
      updated_at: new Date().toISOString(),
    });

    const request = new Request("https://example.com/api/v1/resume/tailor", {
      method: "POST",
      headers: {
        Authorization: "Bearer user_123",
      },
      body: JSON.stringify({
        job_id: "internal-001",
        mode: "manual",
      }),
    });

    const response = await handleTailorResumeRequest(request, {
      API_VERSION: "v1",
      DEV_IMMEDIATE_QUEUE_PROCESSING: "true",
    } as Env);

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: {
        status: string;
        tailored_resume: { rendered_pdf: { file_name: string } };
      };
    };
    expect(body.data.status).toBe("tailored");
    expect(body.data.tailored_resume.rendered_pdf.file_name).toBe("tailored-resume.pdf");
  });
});
