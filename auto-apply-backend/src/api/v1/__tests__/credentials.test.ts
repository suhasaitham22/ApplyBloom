import { describe, it, expect, beforeEach } from "vitest";
import { handleCredentialsRequest } from "@/api/v1/credentials";

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

function req(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { Authorization: "Bearer demo-user", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("credentials API — redaction by default", () => {
  let credId = "";

  it("POST creates a credential (returns redacted)", async () => {
    const r = await handleCredentialsRequest(
      req("POST", "http://x/api/v1/credentials", {
        provider: "linkedin",
        label: "Main",
        username: "john.doe@example.com",
        password: "Str0ngP@ss!",
      }),
      env,
      { kind: "list", method: "POST" },
    );
    expect(r.status).toBe(201);
    const j = await r.json() as { data: { credential: Record<string, unknown> } };
    const c = j.data.credential;
    expect(c.provider).toBe("linkedin");
    expect(c.username_masked).toBe("j•••@example.com");
    expect(c.has_password).toBe(true);
    // Never leak plaintext
    expect(c.password).toBeUndefined();
    expect(c.username).toBeUndefined();
    credId = c.id as string;
  });

  it("rejects invalid provider", async () => {
    const r = await handleCredentialsRequest(
      req("POST", "http://x/api/v1/credentials", {
        provider: "bogus",
        username: "u",
        password: "p",
      }),
      env,
      { kind: "list", method: "POST" },
    );
    expect(r.status).toBe(400);
  });

  it("rejects missing username/password", async () => {
    const r = await handleCredentialsRequest(
      req("POST", "http://x/api/v1/credentials", { provider: "linkedin" }),
      env,
      { kind: "list", method: "POST" },
    );
    expect(r.status).toBe(400);
  });

  it("GET list returns redacted array", async () => {
    const r = await handleCredentialsRequest(
      req("GET", "http://x/api/v1/credentials"),
      env,
      { kind: "list", method: "GET" },
    );
    expect(r.status).toBe(200);
    const j = await r.json() as { data: { credentials: Array<Record<string, unknown>> } };
    for (const c of j.data.credentials) {
      expect(c.password).toBeUndefined();
      expect(c.username).toBeUndefined();
      expect(c.username_masked).toBeTruthy();
    }
  });

  it("GET detail (no reveal) returns redacted", async () => {
    const r = await handleCredentialsRequest(
      req("GET", `http://x/api/v1/credentials/${credId}`),
      env,
      { kind: "detail", method: "GET", id: credId },
    );
    expect(r.status).toBe(200);
    const j = await r.json() as { data: { credential: Record<string, unknown>; revealed?: boolean } };
    expect(j.data.credential.password).toBeUndefined();
    expect(j.data.revealed).toBeUndefined();
  });

  it("GET detail ?reveal=true returns plaintext + logs action", async () => {
    const r = await handleCredentialsRequest(
      req("GET", `http://x/api/v1/credentials/${credId}?reveal=true`),
      env,
      { kind: "detail", method: "GET", id: credId },
    );
    expect(r.status).toBe(200);
    const j = await r.json() as { data: { credential: Record<string, unknown>; revealed: boolean } };
    expect(j.data.revealed).toBe(true);
    expect(j.data.credential.password).toBe("Str0ngP@ss!");
    expect(j.data.credential.username).toBe("john.doe@example.com");
  });

  it("PATCH updates label without revealing secrets", async () => {
    const r = await handleCredentialsRequest(
      req("PATCH", `http://x/api/v1/credentials/${credId}`, { label: "Renamed" }),
      env,
      { kind: "detail", method: "PATCH", id: credId },
    );
    expect(r.status).toBe(200);
    const j = await r.json() as { data: { credential: Record<string, unknown> } };
    expect(j.data.credential.label).toBe("Renamed");
    expect(j.data.credential.password).toBeUndefined();
  });

  it("PATCH can rotate password without exposing it", async () => {
    const r = await handleCredentialsRequest(
      req("PATCH", `http://x/api/v1/credentials/${credId}`, { password: "NewP@ss123" }),
      env,
      { kind: "detail", method: "PATCH", id: credId },
    );
    expect(r.status).toBe(200);
    // Verify new password is used when revealed
    const r2 = await handleCredentialsRequest(
      req("GET", `http://x/api/v1/credentials/${credId}?reveal=true`),
      env,
      { kind: "detail", method: "GET", id: credId },
    );
    const j = await r2.json() as { data: { credential: { password: string } } };
    expect(j.data.credential.password).toBe("NewP@ss123");
  });

  it("GET detail 404 for missing id", async () => {
    const r = await handleCredentialsRequest(
      req("GET", "http://x/api/v1/credentials/missing"),
      env,
      { kind: "detail", method: "GET", id: "missing" },
    );
    expect(r.status).toBe(404);
  });

  it("DELETE removes the credential", async () => {
    const r = await handleCredentialsRequest(
      req("DELETE", `http://x/api/v1/credentials/${credId}`),
      env,
      { kind: "detail", method: "DELETE", id: credId },
    );
    expect(r.status).toBe(200);
    const r2 = await handleCredentialsRequest(
      req("GET", `http://x/api/v1/credentials/${credId}`),
      env,
      { kind: "detail", method: "GET", id: credId },
    );
    expect(r2.status).toBe(404);
  });

  it("returns 500 when encryption key missing", async () => {
    const r = await handleCredentialsRequest(
      req("GET", "http://x/api/v1/credentials"),
      { ...env, CREDENTIALS_ENCRYPTION_KEY: undefined } as unknown as Env,
      { kind: "list", method: "GET" },
    );
    expect(r.status).toBe(500);
  });
});
