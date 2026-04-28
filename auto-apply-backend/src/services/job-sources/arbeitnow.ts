// Arbeitnow adapter — remote/EU jobs aggregator.
// Public, no auth.

import type { JobSourceAdapter, NormalizedJob, SourceFetchOptions } from "./types";

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description?: string;
  remote?: boolean;
  url?: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number;
}

export const arbeitnowAdapter: JobSourceAdapter = {
  name: "arbeitnow",
  async fetch(opts: SourceFetchOptions = {}): Promise<NormalizedJob[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch("https://arbeitnow.com/api/job-board-api", { signal: controller.signal });
      if (!res.ok) return [];
      const body = (await res.json()) as { data?: ArbeitnowJob[] };
      const jobs = body.data ?? [];
      const take = typeof opts.limit === "number" ? jobs.slice(0, opts.limit) : jobs;
      return take.map((j): NormalizedJob => ({
        source: "arbeitnow",
        source_job_id: j.slug,
        company: j.company_name,
        title: j.title,
        location: j.location ?? null,
        description: j.description ?? null,
        apply_url: j.url ?? `https://arbeitnow.com/jobs/${j.slug}`,
        ats_provider: "generic",
        salary_min: null,
        salary_max: null,
        remote: Boolean(j.remote),
        tags: [...(j.tags ?? []), ...(j.job_types ?? [])],
        posted_at: j.created_at ? new Date(j.created_at * 1000).toISOString() : null,
      }));
    } finally {
      clearTimeout(timeout);
    }
  },
};
