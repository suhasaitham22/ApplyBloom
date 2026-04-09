import { describe, expect, it } from "vitest";
import { resetRuntimeStore } from "@/lib/state/runtime-store";
import { handleCreateApplicationRequest } from "../create-application";

describe("handleCreateApplicationRequest immediate processing", () => {
  it("returns a planning result in demo mode", async () => {
    resetRuntimeStore();

    const request = new Request("https://example.com/api/v1/applications", {
      method: "POST",
      headers: {
        Authorization: "Bearer user_123",
      },
      body: JSON.stringify({
        job_id: "job_123",
        resume_artifact_id: "resume_123",
        apply_mode: "manual_review",
      }),
    });

    const response = await handleCreateApplicationRequest(request, {
      API_VERSION: "v1",
      DEV_IMMEDIATE_QUEUE_PROCESSING: "true",
    } as Env);

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { status: string; application_result: { submitted: boolean } };
    };
    expect(body.data.status).toBe("manual_review_required");
    expect(body.data.application_result.submitted).toBe(false);
  });
});
