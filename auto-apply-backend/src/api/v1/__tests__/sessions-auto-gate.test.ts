import { describe, it, expect, beforeEach } from "vitest";
import { handleSessionsRequest } from "@/api/v1/studio/sessions";
import { __resetUserProfileStore, upsertProfile } from "@/services/user-profile/store";

const env = { DEMO_MODE: "true" } as unknown as Env;

function req(method: string, url: string, body?: unknown, user: string = "u"): Request {
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
  const j = await r.json() as { data: { session: { id: string } } };
  return j.data.session.id;
}

beforeEach(() => __resetUserProfileStore());

describe("sessions start gate (mode=auto requires complete profile)", () => {
  it("blocks start when profile incomplete (409)", async () => {
    const u = "u-1"; const id = await createSession("auto", u);
    const r = await handleSessionsRequest(
      req("POST", `http://x/api/v1/sessions/${id}/start`, undefined, u), env,
      { kind: "start", method: "POST", id },
    );
    expect(r.status).toBe(409);
    const body = await r.json() as { code?: string; title?: string };
    expect(body.code).toBe("profile_incomplete");
  });

  it("allows start for mode=single regardless of profile", async () => {
    const u = "u-2"; const id = await createSession("single", u);
    const r = await handleSessionsRequest(
      req("POST", `http://x/api/v1/sessions/${id}/start`, undefined, u), env,
      { kind: "start", method: "POST", id },
    );
    expect([200, 404]).toContain(r.status); // not 409
    expect(r.status).not.toBe(409);
  });

  it("allows start for mode=auto once profile complete", async () => {
    const u = "u-3";
    await upsertProfile(env, u, {
      legal_first_name: "X", legal_last_name: "Y",
      email: "x@y.com", phone: "+1", location: "SF",
      work_authorization: "citizen", relocation_ok: true,
    });
    const id = await createSession("auto", u);
    const r = await handleSessionsRequest(
      req("POST", `http://x/api/v1/sessions/${id}/start`, undefined, u), env,
      { kind: "start", method: "POST", id },
    );
    expect(r.status).not.toBe(409);
  });
});
