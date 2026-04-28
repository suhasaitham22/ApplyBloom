// Greenhouse Job Board API adapter.
// Public, no auth. Multiple boards → call sequentially, dedupe at aggregate level.
// Docs: https://developers.greenhouse.io/job-board.html

import type { JobSourceAdapter, NormalizedJob, SourceFetchOptions } from "./types";

// Curated default boards to bootstrap job discovery. Expand over time based on demand.
// Only actually-hiring companies known to use Greenhouse as of 2026.
export const DEFAULT_GREENHOUSE_BOARDS = [
  "stripe", "airbnb", "coinbase", "doordash", "robinhood",
  "instacart", "dropbox", "pinterest", "squareup", "lyft",
];

interface GhJob {
  id: number;
  title: string;
  updated_at: string;
  location: { name?: string } | null;
  absolute_url: string;
  content?: string;
  company_name?: string;
  departments?: { name: string }[];
  offices?: { name: string; location?: string }[];
}

async function fetchBoard(boardToken: string, limit?: number, signal?: AbortSignal): Promise<NormalizedJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const body = (await res.json()) as { jobs?: GhJob[] };
  const jobs = body.jobs ?? [];
  const take = typeof limit === "number" ? jobs.slice(0, limit) : jobs;
  return take.map((j): NormalizedJob => ({
    source: "greenhouse",
    source_job_id: String(j.id),
    company: j.company_name ?? capitalize(boardToken),
    title: j.title,
    location: j.location?.name ?? j.offices?.[0]?.location ?? null,
    description: j.content ?? null,
    apply_url: j.absolute_url,
    ats_provider: "greenhouse",
    salary_min: null,
    salary_max: null,
    remote: (j.location?.name ?? "").toLowerCase().includes("remote") || null,
    tags: (j.departments ?? []).map((d) => d.name),
    posted_at: j.updated_at ?? null,
  }));
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export const greenhouseAdapter: JobSourceAdapter = {
  name: "greenhouse",
  async fetch(opts: SourceFetchOptions = {}): Promise<NormalizedJob[]> {
    const tokens = opts.boardTokens?.length ? opts.boardTokens : DEFAULT_GREENHOUSE_BOARDS;
    const out: NormalizedJob[] = [];
    const perBoard = typeof opts.limit === "number" ? Math.max(1, Math.floor(opts.limit / tokens.length)) : undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      for (const t of tokens) {
        const rows = await fetchBoard(t, perBoard, controller.signal).catch(() => []);
        out.push(...rows);
        if (opts.limit && out.length >= opts.limit) break;
      }
    } finally {
      clearTimeout(timeout);
    }
    return typeof opts.limit === "number" ? out.slice(0, opts.limit) : out;
  },
};
