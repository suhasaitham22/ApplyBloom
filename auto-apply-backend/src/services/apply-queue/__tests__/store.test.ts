import { describe, it, expect, beforeEach } from "vitest";
import {
  enqueueApply, listApplies, getApply, claimNext, updateApply,
  appendAttemptLog, appendScreenshotUrl, __resetApplyQueueStore,
} from "../store";

const env = {} as unknown as Parameters<typeof enqueueApply>[0];
const USER = "user-1";

beforeEach(() => __resetApplyQueueStore());

describe("apply-queue store (memory)", () => {
  it("enqueueApply creates with derived ats + job_key", async () => {
    const r = await enqueueApply(env, USER, {
      session_id: null,
      apply_url: "https://boards.greenhouse.io/stripe/jobs/12345",
      job_title: "SWE", company: "Stripe",
    });
    expect(r.ats_provider).toBe("greenhouse");
    expect(r.job_key).toBe("greenhouse:12345");
    expect(r.status).toBe("queued");
  });

  it("enqueue is idempotent by (user, job_key)", async () => {
    const a = await enqueueApply(env, USER, {
      session_id: null, apply_url: "https://boards.greenhouse.io/stripe/jobs/12345",
    });
    const b = await enqueueApply(env, USER, {
      session_id: null, apply_url: "https://boards.greenhouse.io/stripe/jobs/12345",
    });
    expect(a.id).toBe(b.id);
  });

  it("listApplies filters by status + session, scopes by user", async () => {
    await enqueueApply(env, USER, { session_id: "s1", apply_url: "https://boards.greenhouse.io/x/jobs/1" });
    await enqueueApply(env, USER, { session_id: "s2", apply_url: "https://boards.greenhouse.io/x/jobs/2" });
    await enqueueApply(env, "other", { session_id: null, apply_url: "https://boards.greenhouse.io/x/jobs/3" });
    expect(await listApplies(env, USER)).toHaveLength(2);
    expect(await listApplies(env, USER, { session_id: "s1" })).toHaveLength(1);
  });

  it("priority ordering: higher priority first, then FIFO", async () => {
    const a = await enqueueApply(env, USER, { session_id: null, apply_url: "https://jobs.lever.co/a/1", priority: 0 });
    const b = await enqueueApply(env, USER, { session_id: null, apply_url: "https://jobs.lever.co/b/2", priority: 10 });
    const first = await claimNext(env, USER, "dev-1");
    expect(first?.id).toBe(b.id);
    const second = await claimNext(env, USER, "dev-1");
    expect(second?.id).toBe(a.id);
  });

  it("claimNext returns null when nothing queued", async () => {
    expect(await claimNext(env, USER, "dev-1")).toBeNull();
  });

  it("claimNext flips status to claimed + stamps deviceId", async () => {
    await enqueueApply(env, USER, { session_id: null, apply_url: "https://jobs.lever.co/a/1" });
    const r = await claimNext(env, USER, "dev-42");
    expect(r?.status).toBe("claimed");
    expect(r?.claimed_by).toBe("dev-42");
    expect(r?.claimed_at).not.toBeNull();
  });

  it("updateApply patches + touches updated_at", async () => {
    const r = await enqueueApply(env, USER, { session_id: null, apply_url: "https://jobs.lever.co/a/1" });
    const before = r.updated_at;
    await new Promise((r) => setTimeout(r, 5));
    const u = await updateApply(env, USER, r.id, { status: "submitted" });
    expect(u?.status).toBe("submitted");
    expect(u?.updated_at).not.toBe(before);
  });

  it("appendAttemptLog appends ordered entries", async () => {
    const r = await enqueueApply(env, USER, { session_id: null, apply_url: "https://jobs.lever.co/a/1" });
    await appendAttemptLog(env, USER, r.id, "opened_page");
    await appendAttemptLog(env, USER, r.id, "filled_name", "Suhas A");
    const final = await getApply(env, USER, r.id);
    expect(final?.attempt_log).toHaveLength(2);
    expect(final?.attempt_log[0].step).toBe("opened_page");
    expect(final?.attempt_log[1].note).toBe("Suhas A");
  });

  it("appendScreenshotUrl appends urls", async () => {
    const r = await enqueueApply(env, USER, { session_id: null, apply_url: "https://jobs.lever.co/a/1" });
    await appendScreenshotUrl(env, USER, r.id, "https://sb.co/s1.png");
    await appendScreenshotUrl(env, USER, r.id, "https://sb.co/s2.png");
    const final = await getApply(env, USER, r.id);
    expect(final?.screenshot_urls).toEqual(["https://sb.co/s1.png", "https://sb.co/s2.png"]);
  });

  it("cross-user isolation: USER cannot access another user's apply", async () => {
    const r = await enqueueApply(env, "other", { session_id: null, apply_url: "https://jobs.lever.co/a/1" });
    expect(await getApply(env, USER, r.id)).toBeNull();
    expect(await updateApply(env, USER, r.id, { status: "cancelled" })).toBeNull();
  });
});
