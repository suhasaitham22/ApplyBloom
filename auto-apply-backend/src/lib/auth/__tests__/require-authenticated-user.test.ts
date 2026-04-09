import { describe, expect, it } from "vitest";
import { requireAuthenticatedUser } from "../require-authenticated-user";

describe("requireAuthenticatedUser", () => {
  it("uses the demo user id when no bearer token is present", async () => {
    const request = new Request("https://example.com", { method: "GET" });

    const result = await requireAuthenticatedUser(request, {
      DEV_DEMO_USER_ID: "demo_user_123",
      API_VERSION: "v1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe("demo_user_123");
    }
  });
});

