import { describe, it, expect, vi, beforeEach } from "vitest";
import { remotiveAdapter, parseSalary } from "../remotive";

beforeEach(() => { vi.restoreAllMocks(); });

describe("parseSalary", () => {
  it("parses $Xk – $Yk", () => {
    expect(parseSalary("$120k – $180k")).toEqual({ min: 120_000, max: 180_000 });
  });
  it("parses 120000-180000", () => {
    expect(parseSalary("120000-180000 USD")).toEqual({ min: 120_000, max: 180_000 });
  });
  it("parses single number", () => {
    expect(parseSalary("$150k")).toEqual({ min: 150_000, max: 150_000 });
  });
  it("returns nulls for empty / nonsense", () => {
    expect(parseSalary(null)).toEqual({ min: null, max: null });
    expect(parseSalary("competitive")).toEqual({ min: null, max: null });
  });
});

describe("remotiveAdapter", () => {
  it("normalizes a remote job", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      jobs: [{
        id: 99, url: "https://remotive.com/jobs/99",
        title: "Backend Dev", company_name: "AcmeCo",
        category: "Software Dev", tags: ["typescript", "cloudflare"],
        candidate_required_location: "Worldwide",
        salary: "$90k – $130k",
        publication_date: "2025-01-02",
      }],
    }), { status: 200 }));
    const jobs = await remotiveAdapter.fetch({ limit: 5 });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      source: "remotive", remote: true,
      salary_min: 90_000, salary_max: 130_000,
      ats_provider: "generic",
    });
    expect(jobs[0].tags).toContain("typescript");
  });

  it("respects limit", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      jobs: Array.from({ length: 20 }, (_, i) => ({
        id: i, url: `https://r/${i}`, title: `T${i}`, company_name: "Co",
      })),
    }), { status: 200 }));
    const jobs = await remotiveAdapter.fetch({ limit: 3 });
    expect(jobs).toHaveLength(3);
  });
});
