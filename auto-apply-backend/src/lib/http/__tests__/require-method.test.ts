import { describe, expect, it } from "vitest";
import { requireMethod } from "../require-method";

describe("requireMethod", () => {
  it("returns null when the method matches", () => {
    const request = new Request("https://example.com", { method: "POST" });
    expect(requireMethod(request, "POST")).toBeNull();
  });

  it("returns an error response when the method does not match", async () => {
    const request = new Request("https://example.com", { method: "GET" });
    const response = requireMethod(request, "POST");

    expect(response).not.toBeNull();
    expect(response?.status).toBe(405);
    expect(await response?.json()).toEqual({
      error: {
        code: "validation_error",
        message: "Expected POST request method",
        details: {
          expected_method: "POST",
          received_method: "GET",
        },
      },
      meta: {
        request_id: "unknown",
      },
    });
  });
});

