import { describe, it, expect, beforeEach } from "vitest";
import { upsertDiscoveredJobs, upsertJobMatches, listMatches, updateMatchStatus, __resetJobsStore } from "../store";
import type { NormalizedJob } from "../../job-sources/types";

const env = {} as unknown as Parameters<typeof upsertDiscoveredJobs>[0];
const USER = "u1";

function mkJob(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    source: "greenhouse", source_job_id: "1", company: "Co", title: "T",
    location: null, description: null, apply_url: "https://x/1", ats_provider: "greenhouse",
    salary_min: null, salary_max: null, remote: null, tags: [], posted_at: null,
    ...overrides,
  };
}

beforeEach(() => __resetJobsStore());

describe("jobs store", () => {
  it("upsertDiscoveredJobs dedupes by (source, source_job_id)", async () => {
    const r1 = await upsertDiscoveredJobs(env, [mkJob({ source_job_id: "a", title: "V1" })]);
    const r2 = await upsertDiscoveredJobs(env, [mkJob({ source_job_id: "a", title: "V2" })]);
    expect(r1[0].id).toBe(r2[0].id);
    expect(r2[0].title).toBe("V2");
  });

  it("upsertJobMatches updates score on re-upsert", async () => {
    const [j] = await upsertDiscoveredJobs(env, [mkJob({ source_job_id: "a" })]);
    await upsertJobMatches(env, USER, [{ job_id: j.id, score: 50, breakdown: {} }]);
    const [m2] = await upsertJobMatches(env, USER, [{ job_id: j.id, score: 80, breakdown: { total: 80 } }]);
    expect(m2.score).toBe(80);
  });

  it("listMatches returns scored matches sorted desc", async () => {
    const [j1] = await upsertDiscoveredJobs(env, [mkJob({ source_job_id: "a", apply_url: "https://x/1" })]);
    const [j2] = await upsertDiscoveredJobs(env, [mkJob({ source_job_id: "b", apply_url: "https://x/2" })]);
    await upsertJobMatches(env, USER, [
      { job_id: j1.id, score: 30, breakdown: {} },
      { job_id: j2.id, score: 75, breakdown: {} },
    ]);
    const list = await listMatches(env, USER);
    expect(list[0].job.source_job_id).toBe("b");
    expect(list[0].score).toBe(75);
  });

  it("listMatches filters by status + min_score + limit", async () => {
    const [j1] = await upsertDiscoveredJobs(env, [mkJob({ source_job_id: "a", apply_url: "https://x/1" })]);
    const [j2] = await upsertDiscoveredJobs(env, [mkJob({ source_job_id: "b", apply_url: "https://x/2" })]);
    const [m1] = await upsertJobMatches(env, USER, [{ job_id: j1.id, score: 30, breakdown: {} }]);
    await upsertJobMatches(env, USER, [{ job_id: j2.id, score: 75, breakdown: {} }]);
    await updateMatchStatus(env, USER, m1.id, "saved");

    const saved = await listMatches(env, USER, { status: "saved" });
    expect(saved).toHaveLength(1);

    const high = await listMatches(env, USER, { min_score: 50 });
    expect(high).toHaveLength(1);

    const capped = await listMatches(env, USER, { limit: 1 });
    expect(capped).toHaveLength(1);
  });

  it("updateMatchStatus scopes by user", async () => {
    const [j] = await upsertDiscoveredJobs(env, [mkJob()]);
    const [m] = await upsertJobMatches(env, "owner", [{ job_id: j.id, score: 1, breakdown: {} }]);
    const r = await updateMatchStatus(env, "intruder", m.id, "rejected");
    expect(r).toBeNull();
  });
});
