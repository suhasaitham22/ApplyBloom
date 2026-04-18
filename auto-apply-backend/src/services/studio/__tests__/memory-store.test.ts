import { describe, it, expect, beforeEach } from "vitest";
import * as store from "../memory-store";

// Reset global store between tests
function resetStore() {
  const g = globalThis as unknown as { __applybloom_studio?: unknown };
  delete g.__applybloom_studio;
}

const USER = "user_1";
const USER2 = "user_2";

describe("memory-store", () => {
  beforeEach(() => resetStore());

  // ── Resumes ─────────────────────────────────────────────────────────
  describe("resumes", () => {
    it("createResume returns a resume with defaults", async () => {
      const r = await store.createResume(USER, { name: "My Resume" });
      expect(r.user_id).toBe(USER);
      expect(r.name).toBe("My Resume");
      expect(r.is_base).toBe(true);
      expect(r.raw_text).toBeNull();
      expect(r.parsed).toBeNull();
      expect(r.storage_path).toBeNull();
      expect(r.file_type).toBeNull();
      expect(r.version).toBe(1);
      expect(r.parent_id).toBeNull();
      expect(r.tailored_for_session_id).toBeNull();
      expect(r.id).toBeTruthy();
      expect(r.created_at).toBeTruthy();
    });

    it("second resume is not base", async () => {
      await store.createResume(USER, { name: "First" });
      const r2 = await store.createResume(USER, { name: "Second" });
      expect(r2.is_base).toBe(false);
    });

    it("createResume accepts optional fields", async () => {
      const r = await store.createResume(USER, {
        name: "X",
        raw_text: "hello",
        storage_path: "/a/b",
        file_type: "pdf",
        parent_id: "p1",
        tailored_for_session_id: "s1",
      });
      expect(r.raw_text).toBe("hello");
      expect(r.storage_path).toBe("/a/b");
      expect(r.file_type).toBe("pdf");
      expect(r.parent_id).toBe("p1");
      expect(r.tailored_for_session_id).toBe("s1");
    });

    it("listResumes returns user's resumes sorted newest first", async () => {
      const r1 = await store.createResume(USER, { name: "A" });
      const r2 = await store.createResume(USER, { name: "B" });
      await store.createResume(USER2, { name: "Other" });
      const list = await store.listResumes(USER);
      expect(list).toHaveLength(2);
      expect(list[0].id).toBe(r2.id);
      expect(list[1].id).toBe(r1.id);
    });

    it("getResume returns resume for correct user", async () => {
      const r = await store.createResume(USER, { name: "A" });
      expect(await store.getResume(USER, r.id)).toEqual(r);
      expect(await store.getResume(USER2, r.id)).toBeNull();
      expect(await store.getResume(USER, "nonexistent")).toBeNull();
    });

    it("updateResume patches fields", async () => {
      const r = await store.createResume(USER, { name: "A" });
      const updated = await store.updateResume(USER, r.id, { name: "B", parsed: { x: 1 } });
      expect(updated!.name).toBe("B");
      expect(updated!.parsed).toEqual({ x: 1 });
      expect(updated!.updated_at).toBeTruthy();
    });

    it("updateResume returns null for wrong user", async () => {
      const r = await store.createResume(USER, { name: "A" });
      expect(await store.updateResume(USER2, r.id, { name: "B" })).toBeNull();
    });

    it("deleteResume removes the resume", async () => {
      const r = await store.createResume(USER, { name: "A" });
      expect(await store.deleteResume(USER, r.id)).toBe(true);
      expect(await store.getResume(USER, r.id)).toBeNull();
    });

    it("deleteResume returns false for wrong user or missing", async () => {
      const r = await store.createResume(USER, { name: "A" });
      expect(await store.deleteResume(USER2, r.id)).toBe(false);
      expect(await store.deleteResume(USER, "nope")).toBe(false);
    });
  });

  // ── Sessions ────────────────────────────────────────────────────────
  describe("sessions", () => {
    it("createSession returns session with defaults", async () => {
      const s = await store.createSession(USER, {});
      expect(s.user_id).toBe(USER);
      expect(s.status).toBe("idle");
      expect(s.mode).toBe("single");
      expect(s.title).toBe("Untitled session");
      expect(s.daily_cap).toBe(10);
      expect(s.applications_today).toBe(0);
      expect(s.resume_id).toBeNull();
      expect(s.job).toBeNull();
    });

    it("createSession with options", async () => {
      const s = await store.createSession(USER, {
        resume_id: "r1",
        mode: "auto",
        title: "My Session",
        preferences: { experience_level: "senior" },
      });
      expect(s.resume_id).toBe("r1");
      expect(s.mode).toBe("auto");
      expect(s.title).toBe("My Session");
      expect(s.preferences.experience_level).toBe("senior");
    });

    it("createSession throws when another is running", async () => {
      const s = await store.createSession(USER, {});
      await store.startSession(USER, s.id);
      await expect(store.createSession(USER, {})).rejects.toThrow(store.StudioError);
    });

    it("hasActiveSession returns running session", async () => {
      const s = await store.createSession(USER, {});
      expect(await store.hasActiveSession(USER)).toBeNull();
      await store.startSession(USER, s.id);
      const active = await store.hasActiveSession(USER);
      expect(active!.id).toBe(s.id);
    });

    it("listSessions returns user's sessions", async () => {
      await store.createSession(USER, { title: "A" });
      await store.createSession(USER2, { title: "B" });
      const list = await store.listSessions(USER);
      expect(list).toHaveLength(1);
      expect(list[0].title).toBe("A");
    });

    it("getSession returns null for wrong user", async () => {
      const s = await store.createSession(USER, {});
      expect(await store.getSession(USER2, s.id)).toBeNull();
      expect(await store.getSession(USER, "nope")).toBeNull();
    });

    it("updateSession patches fields", async () => {
      const s = await store.createSession(USER, {});
      const updated = await store.updateSession(USER, s.id, { title: "New Title" });
      expect(updated!.title).toBe("New Title");
    });

    it("startSession transitions idle → running", async () => {
      const s = await store.createSession(USER, {});
      const started = await store.startSession(USER, s.id);
      expect(started!.status).toBe("running");
      expect(started!.locked_at).toBeTruthy();
    });

    it("startSession no-ops if already running", async () => {
      const s = await store.createSession(USER, {});
      await store.startSession(USER, s.id);
      const again = await store.startSession(USER, s.id);
      expect(again!.status).toBe("running");
    });

    it("startSession throws if completed", async () => {
      const s = await store.createSession(USER, {});
      await store.completeSession(USER, s.id);
      await expect(store.startSession(USER, s.id)).rejects.toThrow("already completed or cancelled");
    });

    it("startSession throws if another session is running", async () => {
      const s1 = await store.createSession(USER, { title: "First" });
      await store.startSession(USER, s1.id);
      // Need to create s2 via direct means since createSession blocks
      await store.pauseSession(USER, s1.id);
      const s2 = await store.createSession(USER, { title: "Second" });
      await store.resumeSession(USER, s1.id);
      await expect(store.startSession(USER, s2.id)).rejects.toThrow(store.StudioError);
    });

    it("pauseSession transitions running → paused", async () => {
      const s = await store.createSession(USER, {});
      await store.startSession(USER, s.id);
      const paused = await store.pauseSession(USER, s.id);
      expect(paused!.status).toBe("paused");
      expect(paused!.paused_at).toBeTruthy();
    });

    it("pauseSession throws if idle", async () => {
      const s = await store.createSession(USER, {});
      await expect(store.pauseSession(USER, s.id)).rejects.toThrow("Only running sessions");
    });

    it("resumeSession transitions paused → running", async () => {
      const s = await store.createSession(USER, {});
      await store.startSession(USER, s.id);
      await store.pauseSession(USER, s.id);
      const resumed = await store.resumeSession(USER, s.id);
      expect(resumed!.status).toBe("running");
      expect(resumed!.paused_at).toBeNull();
    });

    it("resumeSession throws if not paused", async () => {
      const s = await store.createSession(USER, {});
      await expect(store.resumeSession(USER, s.id)).rejects.toThrow("Only paused sessions");
    });

    it("resumeSession throws if another is running", async () => {
      const s1 = await store.createSession(USER, { title: "A" });
      await store.startSession(USER, s1.id);
      await store.pauseSession(USER, s1.id);
      const s2 = await store.createSession(USER, { title: "B" });
      await store.startSession(USER, s2.id);
      await expect(store.resumeSession(USER, s1.id)).rejects.toThrow(store.StudioError);
    });

    it("cancelSession transitions running → cancelled", async () => {
      const s = await store.createSession(USER, {});
      await store.startSession(USER, s.id);
      const cancelled = await store.cancelSession(USER, s.id);
      expect(cancelled!.status).toBe("cancelled");
      expect(cancelled!.cancelled_at).toBeTruthy();
    });

    it("cancelSession is idempotent for already cancelled/completed", async () => {
      const s = await store.createSession(USER, {});
      await store.completeSession(USER, s.id);
      const result = await store.cancelSession(USER, s.id);
      expect(result!.status).toBe("completed");
    });

    it("completeSession sets status and completed_at", async () => {
      const s = await store.createSession(USER, {});
      const done = await store.completeSession(USER, s.id);
      expect(done!.status).toBe("completed");
      expect(done!.completed_at).toBeTruthy();
    });

    it("startSession returns null for nonexistent", async () => {
      expect(await store.startSession(USER, "nope")).toBeNull();
    });

    it("pauseSession returns null for nonexistent", async () => {
      expect(await store.pauseSession(USER, "nope")).toBeNull();
    });

    it("resumeSession returns null for nonexistent", async () => {
      expect(await store.resumeSession(USER, "nope")).toBeNull();
    });

    it("cancelSession returns null for nonexistent", async () => {
      expect(await store.cancelSession(USER, "nope")).toBeNull();
    });
  });

  // ── Messages ────────────────────────────────────────────────────────
  describe("messages", () => {
    it("listMessages returns empty for new session", async () => {
      const s = await store.createSession(USER, {});
      expect(await store.listMessages(s.id)).toEqual([]);
    });

    it("appendMessage adds a message", async () => {
      const s = await store.createSession(USER, {});
      const m = await store.appendMessage(USER, s.id, { role: "user", content: "hello" });
      expect(m.role).toBe("user");
      expect(m.content).toBe("hello");
      expect(m.session_id).toBe(s.id);
      expect(m.user_id).toBe(USER);
      const list = await store.listMessages(s.id);
      expect(list).toHaveLength(1);
    });

    it("appendMessage fills defaults", async () => {
      const s = await store.createSession(USER, {});
      const m = await store.appendMessage(USER, s.id, { role: "assistant", content: "hi" });
      expect(m.thinking).toBeNull();
      expect(m.action_type).toBeNull();
      expect(m.action_payload).toBeNull();
      expect(m.model).toBeNull();
      expect(m.tokens_input).toBeNull();
    });

    it("appendMessage throws for nonexistent session", async () => {
      await expect(
        store.appendMessage(USER, "no_session", { role: "user", content: "hi" }),
      ).rejects.toThrow("Session not found");
    });

    it("appendMessage throws for closed session", async () => {
      const s = await store.createSession(USER, {});
      await store.completeSession(USER, s.id);
      await expect(
        store.appendMessage(USER, s.id, { role: "user", content: "hi" }),
      ).rejects.toThrow("session is closed");
    });

    it("appendMessage allows non-user roles on closed session", async () => {
      const s = await store.createSession(USER, {});
      await store.completeSession(USER, s.id);
      const m = await store.appendMessage(USER, s.id, { role: "assistant", content: "summary" });
      expect(m.role).toBe("assistant");
    });

    it("appendMessage with bypassLock allows user role on closed", async () => {
      const s = await store.createSession(USER, {});
      await store.cancelSession(USER, s.id);
      const m = await store.appendMessage(USER, s.id, { role: "user", content: "override" }, { bypassLock: true });
      expect(m.content).toBe("override");
    });
  });

  // ── Job Queue ───────────────────────────────────────────────────────
  describe("jobs", () => {
    it("enqueueJobs adds jobs and returns them", async () => {
      const s = await store.createSession(USER, {});
      const jobs = await store.enqueueJobs(USER, s.id, [
        { external_job_id: "j1", source: "linkedin", title: "SWE", company: "Acme", location: "Remote", remote: true, description: "desc", url: "https://x.com", score: 0.9 },
        { external_job_id: "j2", source: "indeed", title: "BE", company: "Foo", location: null, remote: false, description: null, url: null, score: null },
      ]);
      expect(jobs).toHaveLength(2);
      expect(jobs[0].status).toBe("pending");
      expect(jobs[0].title).toBe("SWE");
      expect(jobs[1].company).toBe("Foo");
    });

    it("listJobs returns jobs for session", async () => {
      const s = await store.createSession(USER, {});
      await store.enqueueJobs(USER, s.id, [
        { external_job_id: "j1", source: null, title: "A", company: "B", location: null, remote: null, description: null, url: null, score: null },
      ]);
      const list = await store.listJobs(s.id);
      expect(list).toHaveLength(1);
    });

    it("listJobs returns empty for unknown session", async () => {
      expect(await store.listJobs("nope")).toEqual([]);
    });

    it("updateJob patches a job", async () => {
      const s = await store.createSession(USER, {});
      const [j] = await store.enqueueJobs(USER, s.id, [
        { external_job_id: "j1", source: null, title: "A", company: "B", location: null, remote: null, description: null, url: null, score: null },
      ]);
      const updated = await store.updateJob(s.id, j.id, { status: "applied" });
      expect(updated!.status).toBe("applied");
    });

    it("updateJob returns null for unknown job", async () => {
      const s = await store.createSession(USER, {});
      expect(await store.updateJob(s.id, "nope", { status: "applied" })).toBeNull();
    });
  });

  // ── StudioError ─────────────────────────────────────────────────────
  describe("StudioError", () => {
    it("has status and code properties", () => {
      const err = new store.StudioError(409, "conflict", "oops");
      expect(err.status).toBe(409);
      expect(err.code).toBe("conflict");
      expect(err.message).toBe("oops");
      expect(err).toBeInstanceOf(Error);
    });
  });

  // ── Back-compat aliases ─────────────────────────────────────────────
  describe("aliases", () => {
    it("lockSession is startSession", () => {
      expect(store.lockSession).toBe(store.startSession);
    });
    it("hasRunningSession is hasActiveSession", () => {
      expect(store.hasRunningSession).toBe(store.hasActiveSession);
    });
  });
});
