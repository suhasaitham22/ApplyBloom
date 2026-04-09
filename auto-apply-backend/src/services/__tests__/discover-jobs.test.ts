import { describe, expect, it, vi } from "vitest";
import {
  buildJobSourceAdapters,
  createGreenhouseBoardAdapter,
  createLeverBoardAdapter,
  dedupeJobs,
  discoverJobs,
  runSourceAdapters,
  type DiscoveredJob,
} from "../discover-jobs";

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

  it("filters by remote-only and location preferences", async () => {
    const remoteJobs = await discoverJobs("", { remoteOnly: true });
    expect(remoteJobs.every((job) => job.remote)).toBe(true);

    const locationJobs = await discoverJobs("", { location: "San Francisco" });
    expect(locationJobs.some((job) => job.location.includes("San Francisco"))).toBe(true);
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

describe("buildJobSourceAdapters", () => {
  it("always includes the internal catalog and adds external adapters when configured", () => {
    const adapters = buildJobSourceAdapters({
      greenhouseBoardTokens: ["acme"],
      leverCompanyTokens: ["beta"],
      fetchImpl: vi.fn() as unknown as typeof fetch,
    });

    expect(adapters.map((adapter) => adapter.name)).toEqual(
      expect.arrayContaining(["internal-catalog", "greenhouse", "lever"]),
    );
  });
});

describe("Greenhouse adapter", () => {
  it("normalizes greenhouse jobs into the internal schema", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          jobs: [
            {
              id: 123,
              title: "Platform Engineer",
              absolute_url: "https://example.com/greenhouse/123",
              content: "Work remotely with Postgres and TypeScript.",
              location: { name: "Remote" },
              updated_at: "2026-01-01T00:00:00Z",
              metadata: { department: "Platform" },
            },
          ],
        }),
      ),
    );

    const adapter = createGreenhouseBoardAdapter({
      boardTokens: ["acme"],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const jobs = await adapter.search("platform");

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      source: "greenhouse",
      title: "Platform Engineer",
      company: "acme",
      remote: true,
    });
  });
});

describe("Lever adapter", () => {
  it("normalizes lever jobs into the internal schema", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: "abc123",
            text: "Backend Engineer",
            company: "Acme",
            location: "San Francisco, CA",
            description: "Build backend systems.",
            hostedUrl: "https://example.com/lever/abc123",
            createdAt: 1710000000000,
          },
        ]),
      ),
    );

    const adapter = createLeverBoardAdapter({
      companyTokens: ["acme"],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const jobs = await adapter.search("backend");

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      source: "lever",
      title: "Backend Engineer",
      company: "Acme",
      remote: false,
    });
  });
});
