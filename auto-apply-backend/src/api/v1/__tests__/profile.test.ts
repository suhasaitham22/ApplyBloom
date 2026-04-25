import { describe, it, expect, beforeEach } from "vitest";
import { handleProfileRequest } from "@/api/v1/profile";
import { __resetUserProfileStore } from "@/services/user-profile/store";

function makeKey(): string {
  const raw = new Uint8Array(32);
  for (let i = 0; i < 32; i++) raw[i] = (i * 31) % 256;
  let s = ""; for (const b of raw) s += String.fromCharCode(b);
  return btoa(s);
}

const env = {
  DEMO_MODE: "true",
  DEV_DEMO_USER_ID: "demo-user",
  CREDENTIALS_ENCRYPTION_KEY: makeKey(),
} as unknown as Env;

function req(method: string, body?: unknown): Request {
  return new Request("http://x/api/v1/profile", {
    method,
    headers: { Authorization: "Bearer demo-user", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => __resetUserProfileStore());

describe("profile API", () => {
  it("GET returns null when no profile exists", async () => {
    const r = await handleProfileRequest(req("GET"), env);
    expect(r.status).toBe(200);
    const env_ = await r.json() as { data: Record<string, unknown> }; const j = env_.data;
    expect(j.profile).toBeNull();
    expect(j.complete).toBe(false);
    expect(Array.isArray(j.required_fields)).toBe(true);
  });

  it("PUT creates and returns a redacted public profile", async () => {
    const r = await handleProfileRequest(req("PUT", {
      legal_first_name: "Suhas", email: "a@b.com",
    }), env);
    expect(r.status).toBe(200);
    const env_ = await r.json() as { data: { profile: Record<string, unknown>; complete: boolean } }; const j = env_.data;
    expect(j.profile.legal_first_name).toBe("Suhas");
    expect(j.profile.email).toBe("a@b.com");
    expect("eeo_gender_enc" in j.profile).toBe(false);
    expect(j.profile.has_eeo).toBe(false);
    expect(j.complete).toBe(false);
  });

  it("PUT rejects unknown work_authorization", async () => {
    const r = await handleProfileRequest(req("PUT", { work_authorization: "alien" }), env);
    expect(r.status).toBe(400);
  });

  it("PUT encrypts EEO plaintext to *_enc columns (never echoed back)", async () => {
    const r = await handleProfileRequest(req("PUT", {
      legal_first_name: "X", eeo_gender: "nonbinary",
    }), env);
    expect(r.status).toBe(200);
    const env_ = await r.json() as { data: { profile: Record<string, unknown> } }; const j = env_.data;
    expect(j.profile.has_eeo).toBe(true);
    // Plaintext must not appear anywhere in the public response.
    expect(JSON.stringify(j)).not.toContain("nonbinary");
  });

  it("complete flips to true when every required field is set", async () => {
    const r = await handleProfileRequest(req("PUT", {
      legal_first_name: "A", legal_last_name: "B",
      email: "a@b.com", phone: "+1", location: "SF",
      work_authorization: "citizen", relocation_ok: true,
    }), env);
    const env_ = await r.json() as { data: { complete: boolean } }; const j = env_.data;
    expect(j.complete).toBe(true);
  });

  it("rejects invalid JSON body", async () => {
    const r = new Request("http://x/api/v1/profile", {
      method: "PUT",
      headers: { Authorization: "Bearer demo-user", "Content-Type": "application/json" },
      body: "{not json",
    });
    const resp = await handleProfileRequest(r, env);
    expect(resp.status).toBe(400);
  });

  it("405 on unknown method", async () => {
    const r = await handleProfileRequest(req("DELETE"), env);
    expect(r.status).toBe(405);
  });
});
