// Job match scoring — deterministic, lexical, no LLM calls.
// Signals: title+description keyword overlap, location, salary, visa penalty, remote match.

import type { NormalizedJob } from "../job-sources/types";

export interface RankProfile {
  legal_first_name: string | null;
  location: string | null;
  relocation_ok: boolean | null;
  salary_min: number | null;
  visa_sponsorship_needed: boolean | null;
}

export interface RankResume {
  skills: string[];
  headline: string | null;
}

export interface ScoreBreakdown {
  title_overlap: number;
  description_overlap: number;
  location: number;
  salary: number;
  visa_penalty: number;
  remote_match: number;
  total: number;
}

export interface ScoredJob {
  job: NormalizedJob;
  score: number;
  breakdown: ScoreBreakdown;
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "our", "you", "your", "are", "this", "from",
  "that", "will", "have", "has", "a", "an", "to", "of", "in", "on", "at", "by",
  "as", "is", "we", "be", "or", "it", "if", "its", "into", "up", "out", "over",
]);

export function tokenize(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/[^a-z0-9+#./ -]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function overlapScore(a: string[], b: string[], capAt: number): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  let hits = 0;
  const seenA = new Set<string>();
  for (const t of a) {
    if (seenA.has(t)) continue;
    seenA.add(t);
    if (setB.has(t)) hits += 1;
  }
  const denom = Math.min(seenA.size, setB.size) || 1;
  return Math.min(capAt, Math.round((hits / denom) * capAt));
}

export function scoreJob(
  job: NormalizedJob,
  profile: RankProfile,
  resume: RankResume,
): ScoredJob {
  const skillTokens = resume.skills.flatMap((s) => tokenize(s));
  const headlineTokens = tokenize(resume.headline);
  const profileTokens = [...skillTokens, ...headlineTokens];

  const title_overlap = overlapScore(tokenize(job.title), profileTokens, 40);
  const description_overlap = overlapScore(tokenize(job.description), skillTokens, 20);

  let location = 0;
  if (job.remote === true) location = 15;
  else if (profile.location && job.location) {
    const city = profile.location.toLowerCase().split(",")[0].trim();
    if (city && job.location.toLowerCase().includes(city)) location = 15;
    else if (profile.relocation_ok) location = 7;
  } else if (profile.relocation_ok === true) location = 7;

  let salary = 0;
  if (profile.salary_min && job.salary_min) {
    salary = job.salary_min >= profile.salary_min ? 15 : 0;
  } else if (!profile.salary_min) {
    salary = 5;
  }

  let visa_penalty = 0;
  const desc = (job.description ?? "").toLowerCase();
  if (profile.visa_sponsorship_needed === true) {
    if (/\b(us citizen|citizenship required|no sponsorship|cannot sponsor|unable to sponsor)\b/.test(desc)) {
      visa_penalty = -10;
    }
  }

  let remote_match = 0;
  if (job.remote === true) remote_match = 10;

  const total = title_overlap + description_overlap + location + salary + visa_penalty + remote_match;
  return {
    job,
    score: Math.max(0, total),
    breakdown: { title_overlap, description_overlap, location, salary, visa_penalty, remote_match, total },
  };
}

export function rankJobs(
  jobs: NormalizedJob[], profile: RankProfile, resume: RankResume,
): ScoredJob[] {
  return jobs
    .map((j) => scoreJob(j, profile, resume))
    .sort((a, b) => b.score - a.score);
}
