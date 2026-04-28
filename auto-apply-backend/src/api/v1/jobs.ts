// Jobs API — discover / list matches / save-reject / queue-apply.
//
//  GET  /api/v1/jobs                  list matches (?status=, ?min_score=, ?limit=)
//  POST /api/v1/jobs/refresh          trigger discovery + ranking for this user
//  PATCH /api/v1/jobs/:match_id       { status: "saved"|"rejected" }
//  POST  /api/v1/jobs/:match_id/apply enqueues into apply_queue, flips status to queued_apply

import { ok, problem } from "@/lib/http/problem";
import { resolveUser } from "@/lib/auth/require-authenticated-user";
import {
  listMatches, updateMatchStatus, upsertDiscoveredJobs, upsertJobMatches,
  type JobMatchStatus,
} from "@/services/jobs/store";
import { rankJobs } from "@/services/jobs/rank";
import { aggregateJobs } from "@/services/job-sources/aggregate";
import { getProfile } from "@/services/user-profile/store";
import { enqueueApply } from "@/services/apply-queue/store";
import { emitEvent } from "@/services/session-events/store";
import { getResume } from "@/services/studio/store";

export type JobsRoute =
  | { kind: "list"; method: "GET" }
  | { kind: "refresh"; method: "POST" }
  | { kind: "patch"; method: "PATCH"; id: string }
  | { kind: "apply"; method: "POST"; id: string };

async function safeJson(req: Request): Promise<Record<string, unknown> | null> {
  try { return (await req.json()) as Record<string, unknown>; } catch { return null; }
}

/**
 * Orchestration helper — run discovery + ranking for a user.
 * Exported so the cron handler can call it too.
 */
export async function runDiscoveryForUser(
  env: Env, userId: string,
  opts: { maxJobs?: number } = {},
): Promise<{ discovered: number; matched: number; skipped: boolean }> {
  const profile = await getProfile(env, userId);
  if (!profile) return { discovered: 0, matched: 0, skipped: true };

  const maxJobs = opts.maxJobs ?? 100;
  const agg = await aggregateJobs({
    perSourceOpts: {
      greenhouse: { limit: Math.floor(maxJobs * 0.4) },
      lever: { limit: Math.floor(maxJobs * 0.2) },
      remotive: { limit: Math.floor(maxJobs * 0.25) },
      arbeitnow: { limit: Math.floor(maxJobs * 0.15) },
    },
  });

  if (!agg.jobs.length) return { discovered: 0, matched: 0, skipped: false };
  const stored = await upsertDiscoveredJobs(env, agg.jobs);

  // Resume signal: pull base resume if set, else fall back to empty skills.
  const profileExt = profile as unknown as { default_resume_id?: string | null };
  const resumeRec = profileExt.default_resume_id
    ? await getResume(env, userId, profileExt.default_resume_id)
    : null;
  const parsed = (resumeRec?.parsed ?? null) as { skills?: string[]; headline?: string } | null;
  const resume = {
    skills: parsed?.skills ?? [],
    headline: parsed?.headline ?? null,
  };

  const rp = {
    legal_first_name: profile.legal_first_name,
    location: profile.location,
    relocation_ok: profile.relocation_ok,
    salary_min: profile.salary_min,
    visa_sponsorship_needed: profile.visa_sponsorship_needed,
  };
  const ranked = rankJobs(agg.jobs, rp, resume);

  // Match stored_job.id back to normalized by (source, source_job_id)
  const storedByKey = new Map<string, string>();
  for (const r of stored) storedByKey.set(`${r.source}:${r.source_job_id}`, r.id);

  const matches: Array<{ job_id: string; score: number; breakdown: Record<string, number> }> = [];
  for (const scored of ranked) {
    const key = `${scored.job.source}:${scored.job.source_job_id}`;
    const id = storedByKey.get(key);
    if (!id) continue;
    matches.push({ job_id: id, score: scored.score, breakdown: scored.breakdown as unknown as Record<string, number> });
  }
  await upsertJobMatches(env, userId, matches);
  return { discovered: stored.length, matched: matches.length, skipped: false };
}

export async function handleJobsRequest(
  request: Request, env: Env, route: JobsRoute,
): Promise<Response> {
  const auth = await resolveUser(request, env);
  if (!auth) return problem({ title: "Unauthorized", status: 401, code: "auth_required" });
  const userId = auth.id;

  try {
    if (route.kind === "list") {
      const url = new URL(request.url);
      const status = url.searchParams.get("status") as JobMatchStatus | null;
      const min_score = url.searchParams.get("min_score");
      const limit = url.searchParams.get("limit");
      const items = await listMatches(env, userId, {
        status: status ?? undefined,
        min_score: min_score ? Number(min_score) : undefined,
        limit: limit ? Number(limit) : 100,
      });
      return ok({ items });
    }

    if (route.kind === "refresh") {
      const result = await runDiscoveryForUser(env, userId);
      if (result.skipped) {
        return problem({
          title: "Profile not set", status: 409, code: "profile_missing",
          detail: "Complete onboarding before refreshing jobs.",
        });
      }
      return ok(result);
    }

    if (route.kind === "patch") {
      const body = await safeJson(request);
      const status = typeof body?.status === "string" ? body.status as JobMatchStatus : null;
      if (!status || !["saved", "rejected", "new", "queued_apply", "applied"].includes(status)) {
        return problem({ title: "status is required", status: 400, code: "bad_input" });
      }
      const r = await updateMatchStatus(env, userId, route.id, status);
      if (!r) return problem({ title: "Match not found", status: 404 });
      return ok({ item: r });
    }

    if (route.kind === "apply") {
      const matches = await listMatches(env, userId);
      const match = matches.find((m) => m.id === route.id);
      if (!match) return problem({ title: "Match not found", status: 404 });

      const apply = await enqueueApply(env, userId, {
        session_id: null,
        apply_url: match.job.apply_url,
        job_title: match.job.title,
        company: match.job.company ?? undefined,
        priority: 10,
      });
      await updateMatchStatus(env, userId, match.id, "queued_apply");
      await emitEvent(env, userId, {
        session_id: null, apply_id: apply.id, kind: "apply_queued",
        payload: { from_match: match.id, title: match.job.title },
      }).catch(() => { /* non-fatal */ });
      return ok({ apply });
    }

    return problem({ title: "Method not allowed", status: 405 });
  } catch (e) {
    return problem({
      title: "jobs error", status: 500,
      detail: e instanceof Error ? e.message : String(e),
    });
  }
}
