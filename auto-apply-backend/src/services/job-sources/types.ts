// Normalized job shape every source adapter returns.
// Keep flat + serializable so it maps cleanly to the discovered_jobs row.

export type JobSource = "greenhouse" | "lever" | "remotive" | "arbeitnow" | "other";

export interface NormalizedJob {
  source: JobSource;
  source_job_id: string;        // stable per (source, id)
  company: string | null;
  title: string;
  location: string | null;
  description: string | null;   // may contain HTML from source; caller strips for display
  apply_url: string;
  ats_provider: "greenhouse" | "lever" | "ashby" | "generic" | null;
  salary_min: number | null;
  salary_max: number | null;
  remote: boolean | null;
  tags: string[];
  posted_at: string | null;     // ISO
}

export interface SourceFetchOptions {
  // Optional cap per source (defaults vary). Used in tests + cron to limit volume.
  limit?: number;
  // Per-source config — Greenhouse/Lever require the board token.
  boardTokens?: string[];
}

export interface JobSourceAdapter {
  name: JobSource;
  fetch(opts?: SourceFetchOptions): Promise<NormalizedJob[]>;
}
