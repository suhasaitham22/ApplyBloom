import { describe, expect, it } from "vitest";
import { dedupeJobs, discoverJobs, runSourceAdapters, type DiscoveredJob } from "../discover-jobs";

describe("discoverJobs", () => {
  it("returns matching jobs from the built-in catalog", async () => {
    const jobs = await discoverJobs("backend");

    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0].title).toContain("Backend");
  });

  it("returns an empty list for unrelated queries", async () => {
    const jobs = await discoverJobs("medical billing specialist");

    expect(jobs).toEqual([]);
  });
});

describe("dedupeJobs", () => {
  it("deduplicates jobs using source and source job id", () => {
    const jobs: DiscoveredJob[] = [
      {
        id: "source-a:1",
        source: "source-a",
        source_job_id: "1",
        title: "A",
        company: "One",
        location: "Remote",
        remote: true,
        description: "",
        apply_url: "",
        posted_at: "2026-01-01T00:00:00Z",
        raw_payload: {},
      },
      {
        id: "source-a:1-duplicate",
        source: "source-a",
        source_job_id: "1",
        title: "A duplicate",
        company: "One",
        location: "Remote",
        remote: true,
        description: "",
        apply_url: "",
        posted_at: "2026-01-01T00:00:00Z",
        raw_payload: {},
      },
    ];

    expect(dedupeJobs(jobs)).toHaveLength(1);
  });
});

describe("runSourceAdapters", () => {
  it("swallows adapter failures and keeps successful results", async () => {
    const jobs = await runSourceAdapters("backend", [
      {
        name: "failing",
        async search() {
          throw new Error("boom");
        },
      },
      {
        name: "working",
        async search() {
          return [
            {
              id: "working:1",
              source: "working",
              source_job_id: "1",
              title: "Backend Engineer",
              company: "Example",
              location: "Remote",
              remote: true,
              description: "",
              apply_url: "",
              posted_at: "2026-01-01T00:00:00Z",
              raw_payload: {},
            },
          ];
        },
      },
    ]);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].source).toBe("working");
  });
});
