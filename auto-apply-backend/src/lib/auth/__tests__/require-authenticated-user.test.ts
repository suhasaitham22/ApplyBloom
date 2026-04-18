import { describe, expect, it } from "vitest";
import { requireAuthenticatedUser, resolveUser } from "../require-authenticated-user";

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

  it("uses bearer token as user id when no JWT secret", async () => {
    const request = new Request("https://example.com", {
      method: "GET",
      headers: { Authorization: "Bearer custom_user" },
    });

    const result = await requireAuthenticatedUser(request, {} as any);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe("custom_user");
      expect(result.user.verified).toBe(false);
    }
  });

  it("rejects when no bearer and no DEV_DEMO_USER_ID and no JWT secret", async () => {
    const request = new Request("https://example.com", { method: "GET" });

    const result = await requireAuthenticatedUser(request, {} as any);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("DEMO_MODE returns demo user even without bearer", async () => {
    const request = new Request("https://example.com", { method: "GET" });

    const result = await requireAuthenticatedUser(request, { DEMO_MODE: "true" } as any);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe("demo_user");
      expect(result.user.email).toBe("demo_user@demo.local");
      expect(result.user.verified).toBe(false);
    }
  });

  it("DEMO_MODE uses bearer as user id", async () => {
    const request = new Request("https://example.com", {
      method: "GET",
      headers: { Authorization: "Bearer my_id" },
    });

    const result = await requireAuthenticatedUser(request, { DEMO_MODE: "true" } as any);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe("my_id");
    }
  });

  it("DEMO_MODE uses DEV_DEMO_USER_ID when no bearer", async () => {
    const request = new Request("https://example.com", { method: "GET" });

    const result = await requireAuthenticatedUser(request, {
      DEMO_MODE: "true",
      DEV_DEMO_USER_ID: "configured_demo",
    } as any);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe("configured_demo");
    }
  });

  it("rejects with JWT secret but invalid token", async () => {
    const request = new Request("https://example.com", {
      method: "GET",
      headers: { Authorization: "Bearer invalid_jwt_token" },
    });

    const result = await requireAuthenticatedUser(request, {
      SUPABASE_JWT_SECRET: "super-secret-key-at-least-256-bits-long-for-hs256-xxxxxx",
    } as any);
    expect(result.ok).toBe(false);
  });

  it("rejects when JWT secret set but no bearer token", async () => {
    const request = new Request("https://example.com", { method: "GET" });

    const result = await requireAuthenticatedUser(request, {
      SUPABASE_JWT_SECRET: "super-secret-key-at-least-256-bits-long-for-hs256-xxxxxx",
    } as any);
    expect(result.ok).toBe(false);
  });
});

describe("resolveUser", () => {
  it("returns user object in demo mode", async () => {
    const request = new Request("https://example.com", {
      headers: { Authorization: "Bearer test_user" },
    });
    const user = await resolveUser(request, { DEMO_MODE: "true" } as any);
    expect(user).not.toBeNull();
    expect(user!.id).toBe("test_user");
  });

  it("returns null on auth failure", async () => {
    const request = new Request("https://example.com");
    const user = await resolveUser(request, {
      SUPABASE_JWT_SECRET: "secret-key-long-enough-for-hs256-xxxxxxxxxxxxxxxxx",
    } as any);
    expect(user).toBeNull();
  });
});
