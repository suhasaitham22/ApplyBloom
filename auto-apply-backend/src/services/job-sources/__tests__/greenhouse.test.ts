import { describe, it, expect, vi, beforeEach } from "vitest";
import { greenhouseAdapter, DEFAULT_GREENHOUSE_BOARDS } from "../greenhouse";

const GH_FIXTURE = {
  jobs: [
    {
      id: 1111,
      title: "Senior Engineer",
      updated_at: "2025-01-01T00:00:00Z",
      location: { name: "Remote · SF" },
      absolute_url: "https://boards.greenhouse.io/stripe/jobs/1111",
      content: "<p>Build stuff</p>",
      departments: [{ name: "Engineering" }],
    },
  ],
};

beforeEach(() => { vi.restoreAllMocks(); });

describe("greenhouseAdapter", () => {
  it("fetches each board and normalizes", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(GH_FIXTURE), { status: 200 }));
    const jobs = await greenhouseAdapter.fetch({ boardTokens: ["stripe"], limit: 10 });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      source: "greenhouse",
      source_job_id: "1111",
      ats_provider: "greenhouse",
      title: "Senior Engineer",
      apply_url: "https://boards.greenhouse.io/stripe/jobs/1111",
      remote: true,
    });
    expect(jobs[0].tags).toContain("Engineering");
  });

  it("uses default boards when none provided", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ jobs: [] }), { status: 200 }));
    await greenhouseAdapter.fetch({ limit: 1 });
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalled();
    const firstUrl = fetchMock.mock.calls[0][0] as string;
    expect(DEFAULT_GREENHOUSE_BOARDS.some((b) => firstUrl.includes(`/boards/${b}/`))).toBe(true);
  });

  it("survives a board 500 (returns partial)", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("boom", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(GH_FIXTURE), { status: 200 }));
    global.fetch = fetchMock;
    const jobs = await greenhouseAdapter.fetch({ boardTokens: ["failboard", "stripe"] });
    expect(jobs).toHaveLength(1);
  });

  it("honors overall limit across boards (per-board share + slice)", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      jobs: Array.from({ length: 50 }, (_, i) => ({
        id: i, title: `J${i}`, updated_at: "", location: null, absolute_url: `u/${i}`,
      })),
    }), { status: 200 }));
    // limit=6 across 2 boards → 3 per board → 6 total, never more.
    const jobs = await greenhouseAdapter.fetch({ boardTokens: ["a", "b"], limit: 6 });
    expect(jobs.length).toBeLessThanOrEqual(6);
    expect(jobs.length).toBeGreaterThan(0);
  });
});
