import { describe, it, expect, beforeEach } from "vitest";
import { handleSessionsRequest } from "@/api/v1/studio/sessions";
import { __resetUserProfileStore, upsertProfile } from "@/services/user-profile/store";

const env = { DEMO_MODE: "true" } as unknown as Env;

function req(method: string, url: string, body?: unknown, user = "u-1"): Request {
  return new Request(url, {
    method,
    headers: { Authorization: `Bearer ${user}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function createSession(mode: "single" | "auto", user: string): Promise<string> {
  const r = await handleSessionsRequest(
    req("POST", "http://x/api/v1/sessions", { mode, title: "t" }, user), env,
    { kind: "list", method: "POST" },
  );
  return ((await r.json()) as { data: { session: { id: string } } }).data.session.id;
}

beforeEach(() => __resetUserProfileStore());

describe("chat lock: session.status=running rejects free-form messages", () => {
  it("blocks POST messages with 409 when session running", async () => {
    const user = "lock-u-1";
    // Single mode doesn't need a profile
    const id = await createSession("single", user);
    await handleSessionsRequest(
      req("POST", `http://x/api/v1/sessions/${id}/start`, undefined, user), env,
      { kind: "start", method: "POST", id },
    );
    const r = await handleSessionsRequest(
      req("POST", `http://x/api/v1/sessions/${id}/messages`, { content: "hello" }, user), env,
      { kind: "messages", method: "POST", id },
    );
    expect(r.status).toBe(409);
    const body = await r.json() as { code?: string };
    expect(body.code).toBe("session_running");
  });

  it("allows messages when status != running", async () => {
    const user = "lock-u-2";
    const id = await createSession("single", user);
    const r = await handleSessionsRequest(
      req("POST", `http://x/api/v1/sessions/${id}/messages`, { content: "hello" }, user), env,
      { kind: "messages", method: "POST", id },
    );
    expect([200, 201]).toContain(r.status);
    expect(r.status).not.toBe(409);
  });

  it("mode=auto after profile complete — running still locks chat", async () => {
    const user = "lock-u-3";
    await upsertProfile(env, user, {
      legal_first_name: "A", legal_last_name: "B",
      email: "a@b.com", phone: "+1", location: "SF",
      work_authorization: "citizen", relocation_ok: true,
    });
    const id = await createSession("auto", user);
    await handleSessionsRequest(
      req("POST", `http://x/api/v1/sessions/${id}/start`, undefined, user), env,
      { kind: "start", method: "POST", id },
    );
    const r = await handleSessionsRequest(
      req("POST", `http://x/api/v1/sessions/${id}/messages`, { content: "hello" }, user), env,
      { kind: "messages", method: "POST", id },
    );
    expect(r.status).toBe(409);
  });
});
