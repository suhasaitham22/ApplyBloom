import { describe, it, expect, beforeEach } from "vitest";
import { createVersion, listVersions, getVersion, _memoryReset } from "../store";

const env = { DEMO_MODE: "true" };
const USER = "u1";
const RESUME = "r1";

describe("resume-versions store (memory)", () => {
  beforeEach(() => _memoryReset());

  it("creates version with monotonic numbering", async () => {
    const v1 = await createVersion(env, { resume_id: RESUME, user_id: USER, parsed: { a: 1 }, created_by: "user" });
    const v2 = await createVersion(env, { resume_id: RESUME, user_id: USER, parsed: { a: 2 }, created_by: "ai" });
    const v3 = await createVersion(env, { resume_id: RESUME, user_id: USER, parsed: { a: 3 }, created_by: "ai" });
    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(v3.version).toBe(3);
  });

  it("separates versions per resume", async () => {
    await createVersion(env, { resume_id: "rA", user_id: USER, parsed: {}, created_by: "user" });
    await createVersion(env, { resume_id: "rA", user_id: USER, parsed: {}, created_by: "user" });
    const v1OfB = await createVersion(env, { resume_id: "rB", user_id: USER, parsed: {}, created_by: "user" });
    expect(v1OfB.version).toBe(1);
  });

  it("lists most-recent-first, filtered by user", async () => {
    await createVersion(env, { resume_id: RESUME, user_id: USER, parsed: { a: 1 }, created_by: "user" });
    await createVersion(env, { resume_id: RESUME, user_id: USER, parsed: { a: 2 }, created_by: "ai" });
    await createVersion(env, { resume_id: RESUME, user_id: "other", parsed: { a: 3 }, created_by: "user" });
    const list = await listVersions(env, USER, RESUME);
    expect(list.length).toBe(2);
    expect(list[0].version).toBe(2);
    expect(list[1].version).toBe(1);
  });

  it("getVersion finds a specific version", async () => {
    await createVersion(env, { resume_id: RESUME, user_id: USER, parsed: { a: 1 }, created_by: "user" });
    await createVersion(env, { resume_id: RESUME, user_id: USER, parsed: { a: 2 }, created_by: "ai" });
    const v = await getVersion(env, USER, RESUME, 1);
    expect(v?.parsed).toEqual({ a: 1 });
  });

  it("getVersion returns null for wrong user", async () => {
    await createVersion(env, { resume_id: RESUME, user_id: USER, parsed: { a: 1 }, created_by: "user" });
    expect(await getVersion(env, "other", RESUME, 1)).toBeNull();
  });

  it("preserves ops + change_summary + message_id + created_by", async () => {
    const v = await createVersion(env, {
      resume_id: RESUME, user_id: USER,
      parsed: { a: 1 }, created_by: "ai",
      ops: [{ op: "replace_summary", value: "New summary" }],
      change_summary: "AI updated summary",
      message_id: "msg-1",
    });
    expect(v.ops).toEqual([{ op: "replace_summary", value: "New summary" }]);
    expect(v.change_summary).toBe("AI updated summary");
    expect(v.message_id).toBe("msg-1");
    expect(v.created_by).toBe("ai");
  });
});
