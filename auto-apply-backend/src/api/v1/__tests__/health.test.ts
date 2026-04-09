import { describe, expect, it } from "vitest";
import { handleHealthRequest } from "../health";

describe("handleHealthRequest", () => {
  it("returns ok health response", async () => {
    const request = new Request("https://example.com/api/v1/health", {
      method: "GET",
      headers: {
        "X-Request-Id": "req_123",
      },
    });

    const response = await handleHealthRequest(request, {} as Env);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        status: "ok",
      },
      meta: {
        request_id: "req_123",
      },
    });
  });
});

