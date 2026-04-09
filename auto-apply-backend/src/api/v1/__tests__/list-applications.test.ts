import { describe, expect, it } from "vitest";
import { storeApplicationEvent } from "@/services/store-application-event";
import { resetRuntimeStore } from "@/lib/state/runtime-store";
import { handleListApplicationsRequest } from "../list-applications";

describe("handleListApplicationsRequest", () => {
  it("returns runtime applications for the authenticated user", async () => {
    resetRuntimeStore();
    await storeApplicationEvent({
      user_id: "user_123",
      request_id: "req_123",
      event_type: "application_submitted",
      job_id: "job_123",
      metadata: {},
    });

    const request = new Request("https://example.com/api/v1/applications", {
      method: "GET",
      headers: {
        Authorization: "Bearer user_123",
      },
    });

    const response = await handleListApplicationsRequest(request, {} as Env);

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { applications: Array<{ id: string }> };
    };
    expect(body.data.applications).toHaveLength(1);
  });
});
