// discovered_jobs + job_matches store.

import { getSupabase } from "@/lib/supabase/client";
import type { SupabaseEnv } from "@/lib/supabase/client";
import type { NormalizedJob, JobSource } from "../job-sources/types";

export interface DiscoveredJobRecord {
  id: string;
  source: JobSource;
  source_job_id: string;
  company: string | null;
  title: string;
  location: string | null;
  description: string | null;
  apply_url: string;
  ats_provider: "greenhouse" | "lever" | "ashby" | "generic" | null;
  salary_min: number | null;
  salary_max: number | null;
  remote: boolean | null;
  tags: string[];
  posted_at: string | null;
  fetched_at: string;
  created_at: string;
  updated_at: string;
}

export type JobMatchStatus = "new" | "saved" | "rejected" | "queued_apply" | "applied";

export interface JobMatchRecord {
  id: string;
  user_id: string;
  job_id: string;
  score: number;
  score_breakdown: Record<string, number>;
  status: JobMatchStatus;
  matched_at: string;
  created_at: string;
  updated_at: string;
}

export interface ScoredMatch extends JobMatchRecord {
  job: DiscoveredJobRecord;
}

const memJobs = new Map<string, DiscoveredJobRecord>();
const memMatches = new Map<string, JobMatchRecord>();

type Env = SupabaseEnv & { DEMO_MODE?: string };

function useSupabase(env: Env): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function upsertDiscoveredJobs(
  env: Env, jobs: NormalizedJob[],
): Promise<DiscoveredJobRecord[]> {
  if (!jobs.length) return [];
  const now = new Date().toISOString();

  if (useSupabase(env)) {
    const rows = jobs.map((j) => ({
      source: j.source,
      source_job_id: j.source_job_id,
      company: j.company,
      title: j.title,
      location: j.location,
      description: j.description,
      apply_url: j.apply_url,
      ats_provider: j.ats_provider,
      salary_min: j.salary_min,
      salary_max: j.salary_max,
      remote: j.remote,
      tags: j.tags,
      posted_at: j.posted_at,
      fetched_at: now,
    }));
    const { data, error } = await getSupabase(env).from("discovered_jobs")
      .upsert(rows, { onConflict: "source,source_job_id" })
      .select();
    if (error) throw new Error(`upsertDiscoveredJobs: ${error.message}`);
    return (data ?? []) as DiscoveredJobRecord[];
  }

  const out: DiscoveredJobRecord[] = [];
  for (const j of jobs) {
    const key = `${j.source}:${j.source_job_id}`;
    const existing = [...memJobs.values()].find((r) => `${r.source}:${r.source_job_id}` === key);
    if (existing) {
      Object.assign(existing, {
        company: j.company, title: j.title, location: j.location, description: j.description,
        apply_url: j.apply_url, ats_provider: j.ats_provider, salary_min: j.salary_min,
        salary_max: j.salary_max, remote: j.remote, tags: j.tags, posted_at: j.posted_at,
        fetched_at: now, updated_at: now,
      });
      out.push(existing);
    } else {
      const rec: DiscoveredJobRecord = {
        id: crypto.randomUUID(),
        source: j.source, source_job_id: j.source_job_id,
        company: j.company, title: j.title, location: j.location, description: j.description,
        apply_url: j.apply_url, ats_provider: j.ats_provider,
        salary_min: j.salary_min, salary_max: j.salary_max, remote: j.remote, tags: j.tags,
        posted_at: j.posted_at, fetched_at: now, created_at: now, updated_at: now,
      };
      memJobs.set(rec.id, rec);
      out.push(rec);
    }
  }
  return out;
}

export async function upsertJobMatches(
  env: Env, userId: string,
  input: Array<{ job_id: string; score: number; breakdown: Record<string, number> }>,
): Promise<JobMatchRecord[]> {
  if (!input.length) return [];
  const now = new Date().toISOString();
  if (useSupabase(env)) {
    const rows = input.map((m) => ({
      user_id: userId, job_id: m.job_id, score: m.score, score_breakdown: m.breakdown,
    }));
    const { data, error } = await getSupabase(env).from("job_matches")
      .upsert(rows, { onConflict: "user_id,job_id" })
      .select();
    if (error) throw new Error(`upsertJobMatches: ${error.message}`);
    return (data ?? []) as JobMatchRecord[];
  }
  const out: JobMatchRecord[] = [];
  for (const m of input) {
    const key = `${userId}:${m.job_id}`;
    const existing = [...memMatches.values()].find((r) => `${r.user_id}:${r.job_id}` === key);
    if (existing) {
      Object.assign(existing, {
        score: m.score, score_breakdown: m.breakdown, matched_at: now, updated_at: now,
      });
      out.push(existing);
    } else {
      const rec: JobMatchRecord = {
        id: crypto.randomUUID(),
        user_id: userId, job_id: m.job_id,
        score: m.score, score_breakdown: m.breakdown,
        status: "new", matched_at: now, created_at: now, updated_at: now,
      };
      memMatches.set(rec.id, rec);
      out.push(rec);
    }
  }
  return out;
}

export async function listMatches(
  env: Env, userId: string,
  filter: { status?: JobMatchStatus; min_score?: number; limit?: number } = {},
): Promise<ScoredMatch[]> {
  if (useSupabase(env)) {
    let q = getSupabase(env)
      .from("job_matches")
      .select("*, job:discovered_jobs!job_id(*)")
      .eq("user_id", userId)
      .order("score", { ascending: false });
    if (filter.status) q = q.eq("status", filter.status);
    if (filter.min_score) q = q.gte("score", filter.min_score);
    if (filter.limit) q = q.limit(filter.limit);
    const { data, error } = await q;
    if (error) throw new Error(`listMatches: ${error.message}`);
    return (data ?? []) as unknown as ScoredMatch[];
  }
  const matches = [...memMatches.values()]
    .filter((r) => r.user_id === userId)
    .filter((r) => !filter.status || r.status === filter.status)
    .filter((r) => !filter.min_score || r.score >= filter.min_score)
    .sort((a, b) => b.score - a.score);
  const sliced = filter.limit ? matches.slice(0, filter.limit) : matches;
  return sliced.map((m): ScoredMatch => ({ ...m, job: memJobs.get(m.job_id) as DiscoveredJobRecord }));
}

export async function updateMatchStatus(
  env: Env, userId: string, matchId: string, status: JobMatchStatus,
): Promise<JobMatchRecord | null> {
  if (useSupabase(env)) {
    const { data, error } = await getSupabase(env).from("job_matches")
      .update({ status }).eq("user_id", userId).eq("id", matchId).select().maybeSingle();
    if (error) throw new Error(`updateMatchStatus: ${error.message}`);
    return data as JobMatchRecord | null;
  }
  const r = memMatches.get(matchId);
  if (!r || r.user_id !== userId) return null;
  r.status = status; r.updated_at = new Date().toISOString();
  return r;
}

export function __resetJobsStore(): void {
  memJobs.clear(); memMatches.clear();
}
