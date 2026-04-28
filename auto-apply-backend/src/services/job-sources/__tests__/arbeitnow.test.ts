import { describe, it, expect, vi, beforeEach } from "vitest";
import { arbeitnowAdapter } from "../arbeitnow";

beforeEach(() => { vi.restoreAllMocks(); });

describe("arbeitnowAdapter", () => {
  it("normalizes a posting", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{
        slug: "abc-123", company_name: "BerlinCo", title: "Full-stack Eng",
        description: "", remote: true, url: "https://arbeitnow.com/jobs/abc-123",
        tags: ["javascript"], job_types: ["full_time"], location: "Berlin",
        created_at: 1_700_000_000,
      }],
    }), { status: 200 }));
    const jobs = await arbeitnowAdapter.fetch();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      source: "arbeitnow", source_job_id: "abc-123",
      remote: true, ats_provider: "generic",
    });
    expect(jobs[0].tags).toContain("javascript");
    expect(jobs[0].tags).toContain("full_time");
  });

  it("returns [] on non-200", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("oops", { status: 500 }));
    const jobs = await arbeitnowAdapter.fetch();
    expect(jobs).toHaveLength(0);
  });
});
