import { describe, it, expect, vi, beforeEach } from "vitest";
import { leverAdapter } from "../lever";

beforeEach(() => { vi.restoreAllMocks(); });

const LEVER_FIXTURE = [
  {
    id: "abc-def",
    text: "Senior PM",
    categories: { team: "Product", location: "Remote — US", commitment: "Full-time" },
    descriptionPlain: "Lead product stuff",
    applyUrl: "https://jobs.lever.co/ramp/abc-def/apply",
    hostedUrl: "https://jobs.lever.co/ramp/abc-def",
    createdAt: 1_700_000_000_000,
    workplaceType: "remote",
    salaryRange: { min: 120_000, max: 180_000 },
  },
];

describe("leverAdapter", () => {
  it("normalizes a posting", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(LEVER_FIXTURE), { status: 200 }));
    const jobs = await leverAdapter.fetch({ boardTokens: ["ramp"], limit: 5 });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      source: "lever",
      source_job_id: "ramp:abc-def",
      company: "Ramp",
      ats_provider: "lever",
      remote: true,
      salary_min: 120_000,
      salary_max: 180_000,
    });
  });

  it("falls back to hostedUrl + synthesised apply URL when missing", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { id: "xx", text: "Eng", categories: {}, workplaceType: "on-site" },
    ]), { status: 200 }));
    const jobs = await leverAdapter.fetch({ boardTokens: ["ramp"] });
    expect(jobs[0].apply_url).toBe("https://jobs.lever.co/ramp/xx");
    expect(jobs[0].remote).toBe(false);
  });

  it("returns [] on non-200", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("nope", { status: 404 }));
    const jobs = await leverAdapter.fetch({ boardTokens: ["missing"] });
    expect(jobs).toHaveLength(0);
  });

  it("handles non-array body gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false }), { status: 200 }));
    const jobs = await leverAdapter.fetch({ boardTokens: ["x"] });
    expect(jobs).toHaveLength(0);
  });
});
