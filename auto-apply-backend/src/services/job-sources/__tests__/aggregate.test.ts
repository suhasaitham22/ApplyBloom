import { describe, it, expect, vi, beforeEach } from "vitest";
import { aggregateJobs } from "../aggregate";
import type { JobSourceAdapter, NormalizedJob } from "../types";

function mkJob(overrides: Partial<NormalizedJob>): NormalizedJob {
  return {
    source: "greenhouse", source_job_id: "1", company: "Co", title: "T",
    location: null, description: null, apply_url: "https://x/1", ats_provider: "greenhouse",
    salary_min: null, salary_max: null, remote: null, tags: [], posted_at: null,
    ...overrides,
  };
}

function fakeAdapter(name: string, jobs: NormalizedJob[]): JobSourceAdapter {
  return { name: name as JobSourceAdapter["name"], async fetch() { return jobs; } };
}

function throwingAdapter(name: string): JobSourceAdapter {
  return { name: name as JobSourceAdapter["name"], async fetch() { throw new Error("boom"); } };
}

beforeEach(() => { vi.restoreAllMocks(); });

describe("aggregateJobs", () => {
  it("dedupes by apply_url across sources (case-insensitive)", async () => {
    const adapters = [
      fakeAdapter("greenhouse", [mkJob({ apply_url: "https://boards.greenhouse.io/X" })]),
      fakeAdapter("lever", [mkJob({ source: "lever", apply_url: "https://BOARDS.GREENHOUSE.IO/X" })]),
      fakeAdapter("remotive", [mkJob({ source: "remotive", apply_url: "https://remotive.com/2" })]),
    ];
    const r = await aggregateJobs({ adapters });
    expect(r.jobs).toHaveLength(2);
    expect(r.perSource).toEqual({ greenhouse: 1, lever: 1, remotive: 1 });
  });

  it("captures per-source errors without failing the whole run", async () => {
    const adapters = [
      fakeAdapter("greenhouse", [mkJob({ apply_url: "u1" })]),
      throwingAdapter("lever"),
    ];
    const r = await aggregateJobs({ adapters });
    expect(r.jobs).toHaveLength(1);
    expect(r.errors.lever).toBe("boom");
    expect(r.perSource.lever).toBe(0);
  });

  it("passes perSourceOpts to adapters", async () => {
    const spy = vi.fn().mockResolvedValue([]);
    const adapters: JobSourceAdapter[] = [
      { name: "greenhouse", fetch: spy },
    ];
    await aggregateJobs({ adapters, perSourceOpts: { greenhouse: { limit: 7 } } });
    expect(spy).toHaveBeenCalledWith({ limit: 7 });
  });
});
