import { describe, expect, it } from "vitest";
import { handleCreateApplicationRequest } from "../create-application";

describe("handleCreateApplicationRequest", () => {
  it("rejects missing auth", async () => {
    const request = new Request("https://example.com/api/v1/applications", {
      method: "POST",
      body: JSON.stringify({
        job_id: "job_123",
        resume_artifact_id: "resume_123",
      }),
    });

    const response = await handleCreateApplicationRequest(request, {} as Env);

    expect(response.status).toBe(401);
  });
});

