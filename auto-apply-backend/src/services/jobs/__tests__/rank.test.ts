import { describe, it, expect } from "vitest";
import { tokenize, overlapScore, scoreJob, rankJobs, type RankProfile, type RankResume } from "../rank";
import type { NormalizedJob } from "../../job-sources/types";

function mkJob(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    source: "greenhouse", source_job_id: "1",
    company: "Co", title: "Senior TypeScript Engineer",
    location: "San Francisco, CA", description: "Work on distributed systems",
    apply_url: "https://boards.greenhouse.io/x/jobs/1", ats_provider: "greenhouse",
    salary_min: null, salary_max: null, remote: null, tags: [], posted_at: null,
    ...overrides,
  };
}

const defaultProfile: RankProfile = {
  legal_first_name: "Suhas", location: "San Francisco, CA",
  relocation_ok: true, salary_min: 150_000, visa_sponsorship_needed: false,
};
const defaultResume: RankResume = {
  skills: ["typescript", "node", "postgres", "cloudflare"],
  headline: "Senior TypeScript Engineer",
};

describe("tokenize", () => {
  it("splits lowercases, strips HTML and punctuation", () => {
    expect(tokenize("<p>Building <b>TypeScript</b> systems!!!</p>")).toEqual(["building", "typescript", "systems"]);
  });
  it("drops stopwords + tiny tokens", () => {
    expect(tokenize("We are the best")).toEqual(["best"]);
  });
  it("handles null/undefined", () => {
    expect(tokenize(null)).toEqual([]);
    expect(tokenize(undefined)).toEqual([]);
  });
});

describe("overlapScore", () => {
  it("perfect overlap caps at capAt", () => {
    expect(overlapScore(["a", "b"], ["a", "b"], 40)).toBe(40);
  });
  it("no overlap = 0", () => {
    expect(overlapScore(["a"], ["b"], 40)).toBe(0);
  });
  it("empty inputs = 0", () => {
    expect(overlapScore([], ["a"], 40)).toBe(0);
    expect(overlapScore(["a"], [], 40)).toBe(0);
  });
});

describe("scoreJob", () => {
  it("matches title + location + remote flag", () => {
    const r = scoreJob(
      mkJob({ remote: true, salary_min: 200_000 }),
      defaultProfile, defaultResume,
    );
    expect(r.breakdown.title_overlap).toBeGreaterThan(0);
    expect(r.breakdown.location).toBe(15);       // remote → 15
    expect(r.breakdown.remote_match).toBe(10);
    expect(r.breakdown.salary).toBe(15);
    expect(r.score).toBeGreaterThan(40);
  });

  it("penalizes when sponsorship needed and desc rejects it", () => {
    const r = scoreJob(
      mkJob({ description: "US citizen required, we cannot sponsor visas." }),
      { ...defaultProfile, visa_sponsorship_needed: true },
      defaultResume,
    );
    expect(r.breakdown.visa_penalty).toBe(-10);
  });

  it("no visa penalty when user doesn't need sponsorship", () => {
    const r = scoreJob(
      mkJob({ description: "US citizen required." }),
      { ...defaultProfile, visa_sponsorship_needed: false },
      defaultResume,
    );
    expect(r.breakdown.visa_penalty).toBe(0);
  });

  it("salary score zero when floor not met", () => {
    const r = scoreJob(
      mkJob({ salary_min: 80_000 }),
      { ...defaultProfile, salary_min: 150_000 },
      defaultResume,
    );
    expect(r.breakdown.salary).toBe(0);
  });

  it("location gets partial credit when relocation_ok", () => {
    const r = scoreJob(
      mkJob({ location: "New York, NY", remote: null }),
      defaultProfile, defaultResume,
    );
    expect(r.breakdown.location).toBe(7);
  });

  it("score never negative", () => {
    const r = scoreJob(
      mkJob({ title: "nothing", description: "cannot sponsor" }),
      { ...defaultProfile, visa_sponsorship_needed: true },
      { skills: [], headline: null },
    );
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});

describe("rankJobs", () => {
  it("sorts by score descending", () => {
    const perfect = mkJob({ source_job_id: "p", title: "TypeScript Engineer", remote: true, salary_min: 200_000 });
    const poor = mkJob({ source_job_id: "q", title: "Unrelated Finance Role", remote: false, location: "Chicago" });
    const r = rankJobs([poor, perfect], defaultProfile, defaultResume);
    expect(r[0].job.source_job_id).toBe("p");
  });
});
