import { describe, it, expect, beforeEach } from "vitest";
import * as store from "../store";

function resetStore() {
  const g = globalThis as unknown as { __applybloom_studio?: unknown };
  delete g.__applybloom_studio;
}

const env = { DEMO_MODE: "true" } as any; // no supabase → memory store
const USER = "user_store_test";

describe("store dispatcher (memory mode)", () => {
  beforeEach(() => resetStore());

  it("createResume and listResumes", async () => {
    const r = await store.createResume(env, USER, { name: "Test" });
    expect(r.name).toBe("Test");
    const list = await store.listResumes(env, USER);
    expect(list).toHaveLength(1);
  });

  it("getResume and updateResume", async () => {
    const r = await store.createResume(env, USER, { name: "A" });
    const got = await store.getResume(env, USER, r.id);
    expect(got!.id).toBe(r.id);
    const updated = await store.updateResume(env, USER, r.id, { name: "B" });
    expect(updated!.name).toBe("B");
  });

  it("deleteResume", async () => {
    const r = await store.createResume(env, USER, { name: "A" });
    expect(await store.deleteResume(env, USER, r.id)).toBe(true);
    expect(await store.getResume(env, USER, r.id)).toBeNull();
  });

  it("session lifecycle", async () => {
    const s = await store.createSession(env, USER, { title: "S" });
    expect(s.status).toBe("idle");

    const started = await store.startSession(env, USER, s.id);
    expect(started!.status).toBe("running");

    const paused = await store.pauseSession(env, USER, s.id);
    expect(paused!.status).toBe("paused");

    const resumed = await store.resumeSession(env, USER, s.id);
    expect(resumed!.status).toBe("running");

    const cancelled = await store.cancelSession(env, USER, s.id);
    expect(cancelled!.status).toBe("cancelled");
  });

  it("hasActiveSession and listSessions", async () => {
    expect(await store.hasActiveSession(env, USER)).toBeNull();
    const s = await store.createSession(env, USER, {});
    await store.startSession(env, USER, s.id);
    const active = await store.hasActiveSession(env, USER);
    expect(active!.id).toBe(s.id);
    const list = await store.listSessions(env, USER);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it("completeSession", async () => {
    const s = await store.createSession(env, USER, {});
    const done = await store.completeSession(env, USER, s.id);
    expect(done!.status).toBe("completed");
  });

  it("messages", async () => {
    const s = await store.createSession(env, USER, {});
    const msgs = await store.listMessages(env, s.id);
    expect(msgs).toEqual([]);
    const m = await store.appendMessage(env, USER, s.id, { role: "user", content: "hi" });
    expect(m.content).toBe("hi");
    const msgs2 = await store.listMessages(env, s.id);
    expect(msgs2).toHaveLength(1);
  });

  it("jobs", async () => {
    const s = await store.createSession(env, USER, {});
    const jobs = await store.enqueueJobs(env, USER, s.id, [
      { external_job_id: "j1", source: null, title: "A", company: "B", location: null, remote: null, description: null, url: null, score: null },
    ]);
    expect(jobs).toHaveLength(1);
    const list = await store.listJobs(env, s.id);
    expect(list).toHaveLength(1);
    const updated = await store.updateJob(env, s.id, jobs[0].id, { status: "applied" });
    expect(updated!.status).toBe("applied");
  });

  it("lockSession is startSession alias", () => {
    expect(store.lockSession).toBe(store.startSession);
  });

  it("hasRunningSession is hasActiveSession alias", () => {
    expect(store.hasRunningSession).toBe(store.hasActiveSession);
  });

  it("re-exports types", () => {
    const err = new store.StudioError(400, "test", "msg");
    expect(err).toBeInstanceOf(Error);
  });
});
