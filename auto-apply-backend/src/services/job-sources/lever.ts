// Lever Postings API adapter.
// Public, no auth. One board per site name.
// Docs: https://github.com/lever/postings-api

import type { JobSourceAdapter, NormalizedJob, SourceFetchOptions } from "./types";

export const DEFAULT_LEVER_BOARDS = [
  "leverdemo", "ramp", "mixpanel", "hugginface", "sanity",
];

interface LeverJob {
  id: string;
  text: string;                   // title
  categories?: { team?: string; location?: string; commitment?: string };
  descriptionPlain?: string;
  description?: string;
  additionalPlain?: string;
  applyUrl?: string;
  hostedUrl?: string;
  createdAt?: number;             // ms
  salaryRange?: { min?: number; max?: number; currency?: string };
  workplaceType?: "remote" | "hybrid" | "on-site";
}

async function fetchBoard(site: string, limit?: number, signal?: AbortSignal): Promise<NormalizedJob[]> {
  const url = `https://api.lever.co/v0/postings/${site}?mode=json${limit ? `&limit=${limit}` : ""}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const raw = await res.json().catch(() => null);
  const jobs = Array.isArray(raw) ? (raw as LeverJob[]) : [];
  return jobs.map((j): NormalizedJob => ({
    source: "lever",
    source_job_id: `${site}:${j.id}`,
    company: capitalize(site),
    title: j.text,
    location: j.categories?.location ?? null,
    description: j.descriptionPlain ?? j.description ?? j.additionalPlain ?? null,
    apply_url: j.applyUrl ?? j.hostedUrl ?? `https://jobs.lever.co/${site}/${j.id}`,
    ats_provider: "lever",
    salary_min: j.salaryRange?.min ?? null,
    salary_max: j.salaryRange?.max ?? null,
    remote: j.workplaceType === "remote" ? true : j.workplaceType ? false : null,
    tags: [j.categories?.team].filter(Boolean) as string[],
    posted_at: j.createdAt ? new Date(j.createdAt).toISOString() : null,
  }));
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export const leverAdapter: JobSourceAdapter = {
  name: "lever",
  async fetch(opts: SourceFetchOptions = {}): Promise<NormalizedJob[]> {
    const tokens = opts.boardTokens?.length ? opts.boardTokens : DEFAULT_LEVER_BOARDS;
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
