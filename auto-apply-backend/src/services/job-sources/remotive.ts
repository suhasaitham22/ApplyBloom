// Remotive adapter — aggregator of remote jobs, mostly non-ATS.
// Public, max 4 calls/day recommended.
// Docs: https://remotive.com/api-documentation

import type { JobSourceAdapter, NormalizedJob, SourceFetchOptions } from "./types";

interface RemotiveJob {
  id: number | string;
  url: string;
  title: string;
  company_name: string;
  category?: string;
  tags?: string[];
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
}

/**
 * Best-effort parse "$100k – $150k" / "100000 - 150000" salary ranges.
 * Returns [min, max] with nulls when nothing parseable.
 */
export function parseSalary(raw: string | undefined | null): { min: number | null; max: number | null } {
  if (!raw) return { min: null, max: null };
  const norm = raw.toLowerCase().replace(/,/g, "");
  const nums: number[] = [];
  const re = /(\d+(?:\.\d+)?)\s*([km])?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm)) !== null) {
    const n = parseFloat(m[1]);
    const suf = m[2];
    const mult = suf === "k" ? 1_000 : suf === "m" ? 1_000_000 : 1;
    nums.push(Math.round(n * mult));
  }
  if (nums.length === 0) return { min: null, max: null };
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: Math.min(nums[0], nums[1]), max: Math.max(nums[0], nums[1]) };
}

export const remotiveAdapter: JobSourceAdapter = {
  name: "remotive",
  async fetch(opts: SourceFetchOptions = {}): Promise<NormalizedJob[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const url = "https://remotive.com/api/remote-jobs";
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return [];
      const body = (await res.json()) as { jobs?: RemotiveJob[] };
      const jobs = body.jobs ?? [];
      const take = typeof opts.limit === "number" ? jobs.slice(0, opts.limit) : jobs;
      return take.map((j): NormalizedJob => {
        const salary = parseSalary(j.salary);
        return {
          source: "remotive",
          source_job_id: String(j.id),
          company: j.company_name ?? null,
          title: j.title,
          location: j.candidate_required_location ?? "Remote",
          description: j.description ?? null,
          apply_url: j.url,
          ats_provider: "generic",
          salary_min: salary.min,
          salary_max: salary.max,
          remote: true,
          tags: [j.category, ...(j.tags ?? [])].filter(Boolean) as string[],
          posted_at: j.publication_date ?? null,
        };
      });
    } finally {
      clearTimeout(timeout);
    }
  },
};
