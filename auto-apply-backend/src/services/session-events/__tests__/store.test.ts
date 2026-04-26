import { describe, it, expect, beforeEach } from "vitest";
import { emitEvent, listEventsSince, __resetSessionEventsStore } from "../store";

const env = {} as unknown as Parameters<typeof emitEvent>[0];
const USER = "u1";

beforeEach(() => __resetSessionEventsStore());

describe("session-events store", () => {
  it("emit + list chronological", async () => {
    await emitEvent(env, USER, { session_id: "s1", apply_id: null, kind: "apply_queued" });
    await emitEvent(env, USER, { session_id: "s1", apply_id: "a1", kind: "apply_claimed" });
    await emitEvent(env, USER, { session_id: "s1", apply_id: "a1", kind: "apply_submitted" });
    const all = await listEventsSince(env, USER, { session_id: "s1" });
    expect(all.map((e) => e.kind)).toEqual(["apply_queued", "apply_claimed", "apply_submitted"]);
  });

  it("filters by since", async () => {
    await emitEvent(env, USER, { session_id: "s1", apply_id: null, kind: "apply_queued" });
    const mid = new Date().toISOString();
    await new Promise((r) => setTimeout(r, 2));
    await emitEvent(env, USER, { session_id: "s1", apply_id: null, kind: "apply_submitted" });
    const after = await listEventsSince(env, USER, { session_id: "s1", since: mid });
    expect(after).toHaveLength(1);
    expect(after[0].kind).toBe("apply_submitted");
  });

  it("filters by apply_id + scopes by user", async () => {
    await emitEvent(env, USER, { session_id: "s1", apply_id: "a1", kind: "apply_step", payload: { step: "fill_name" } });
    await emitEvent(env, USER, { session_id: "s1", apply_id: "a2", kind: "apply_step", payload: { step: "fill_name" } });
    await emitEvent(env, "other", { session_id: "s1", apply_id: "a1", kind: "apply_step" });
    const a1 = await listEventsSince(env, USER, { apply_id: "a1" });
    expect(a1).toHaveLength(1);
    expect(a1[0].payload).toEqual({ step: "fill_name" });
  });

  it("honors limit", async () => {
    for (let i = 0; i < 5; i++) await emitEvent(env, USER, { session_id: "s1", apply_id: null, kind: "apply_step" });
    const got = await listEventsSince(env, USER, { session_id: "s1", limit: 3 });
    expect(got.length).toBeLessThanOrEqual(3);
  });
});
