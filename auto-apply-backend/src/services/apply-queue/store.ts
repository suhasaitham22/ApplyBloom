// apply_queue store — dual adapter (Supabase + in-memory).
// Extension long-polls via `claimNext()` which atomically flips status queued→claimed.

import { getSupabase } from "@/lib/supabase/client";
import type { SupabaseEnv } from "@/lib/supabase/client";
import { detectAtsProvider, extractJobKey, type AtsProvider } from "./ats-detect";

export type ApplyStatus =
  | "queued" | "claimed" | "running" | "needs_input"
  | "submitted" | "failed" | "cancelled" | "paused";

export interface ApplyRecord {
  id: string;
  user_id: string;
  session_id: string | null;
  job_key: string;
  ats_provider: AtsProvider;
  apply_url: string;
  job_title: string | null;
  company: string | null;
  resume_id: string | null;
  credential_id: string | null;
  dry_run: boolean;
  status: ApplyStatus;
  priority: number;
  error: string | null;
  screenshot_urls: string[];
  attempt_log: Array<{ at: string; step: string; note?: string }>;
  claimed_by: string | null;
  claimed_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnqueueInput {
  session_id: string | null;
  apply_url: string;
  job_title?: string;
  company?: string;
  resume_id?: string | null;
  credential_id?: string | null;
  dry_run?: boolean;
  priority?: number;
}

// ── Memory store ─────────────────────────────────────────────────────────
const memStore = new Map<string, ApplyRecord>();

function memList(userId: string, filter?: { status?: ApplyStatus[]; session_id?: string }): ApplyRecord[] {
  const all = [...memStore.values()].filter((r) => r.user_id === userId);
  return all
    .filter((r) => !filter?.status || filter.status.includes(r.status))
    .filter((r) => !filter?.session_id || r.session_id === filter.session_id)
    .sort((a, b) => (a.priority !== b.priority ? b.priority - a.priority : a.created_at < b.created_at ? -1 : 1));
}

// ── Dispatcher ───────────────────────────────────────────────────────────
type Env = SupabaseEnv & { DEMO_MODE?: string };

function useSupabase(env: Env): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function enqueueApply(
  env: Env, userId: string, input: EnqueueInput,
): Promise<ApplyRecord> {
  const ats = detectAtsProvider(input.apply_url);
  const job_key = extractJobKey(input.apply_url, ats);
  const now = new Date().toISOString();

  if (useSupabase(env)) {
    // Idempotent upsert: if (user_id, job_key) already exists, return it.
    const existing = await getSupabase(env)
      .from("apply_queue").select("*")
      .eq("user_id", userId).eq("job_key", job_key).maybeSingle();
    if (existing.data) return existing.data as ApplyRecord;

    const { data, error } = await getSupabase(env).from("apply_queue").insert({
      user_id: userId,
      session_id: input.session_id,
      job_key,
      ats_provider: ats,
      apply_url: input.apply_url,
      job_title: input.job_title ?? null,
      company: input.company ?? null,
      resume_id: input.resume_id ?? null,
      credential_id: input.credential_id ?? null,
      dry_run: input.dry_run ?? false,
      priority: input.priority ?? 0,
    }).select().single();
    if (error) throw new Error(`enqueueApply: ${error.message}`);
    return data as ApplyRecord;
  }

  // Memory: dedupe by (user_id, job_key)
  const dupe = [...memStore.values()].find((r) => r.user_id === userId && r.job_key === job_key);
  if (dupe) return dupe;
  const rec: ApplyRecord = {
    id: crypto.randomUUID(),
    user_id: userId,
    session_id: input.session_id,
    job_key,
    ats_provider: ats,
    apply_url: input.apply_url,
    job_title: input.job_title ?? null,
    company: input.company ?? null,
    resume_id: input.resume_id ?? null,
    credential_id: input.credential_id ?? null,
    dry_run: input.dry_run ?? false,
    status: "queued",
    priority: input.priority ?? 0,
    error: null,
    screenshot_urls: [],
    attempt_log: [],
    claimed_by: null,
    claimed_at: null,
    started_at: null,
    finished_at: null,
    created_at: now,
    updated_at: now,
  };
  memStore.set(rec.id, rec);
  return rec;
}

export async function listApplies(
  env: Env, userId: string, filter?: { status?: ApplyStatus[]; session_id?: string },
): Promise<ApplyRecord[]> {
  if (useSupabase(env)) {
    let q = getSupabase(env).from("apply_queue").select("*").eq("user_id", userId);
    if (filter?.status?.length) q = q.in("status", filter.status);
    if (filter?.session_id) q = q.eq("session_id", filter.session_id);
    const { data, error } = await q.order("priority", { ascending: false }).order("created_at", { ascending: true });
    if (error) throw new Error(`listApplies: ${error.message}`);
    return (data ?? []) as ApplyRecord[];
  }
  return memList(userId, filter);
}

export async function getApply(env: Env, userId: string, id: string): Promise<ApplyRecord | null> {
  if (useSupabase(env)) {
    const { data, error } = await getSupabase(env)
      .from("apply_queue").select("*").eq("user_id", userId).eq("id", id).maybeSingle();
    if (error) throw new Error(`getApply: ${error.message}`);
    return data as ApplyRecord | null;
  }
  const r = memStore.get(id);
  return r && r.user_id === userId ? r : null;
}

/**
 * Atomically claim the next queued apply for this user.
 * Returns null if nothing to do. Sets status=claimed, claimed_by, claimed_at.
 */
export async function claimNext(
  env: Env, userId: string, deviceId: string,
): Promise<ApplyRecord | null> {
  const now = new Date().toISOString();
  if (useSupabase(env)) {
    // SELECT FOR UPDATE would be nicer but Supabase JS doesn't expose it cleanly.
    // Compromise: pick the top row, then UPDATE with a status='queued' predicate for atomicity.
    const pick = await getSupabase(env)
      .from("apply_queue").select("*")
      .eq("user_id", userId).eq("status", "queued")
      .order("priority", { ascending: false }).order("created_at", { ascending: true })
      .limit(1).maybeSingle();
    if (!pick.data) return null;
    const row = pick.data as ApplyRecord;
    const { data, error } = await getSupabase(env)
      .from("apply_queue")
      .update({ status: "claimed", claimed_by: deviceId, claimed_at: now })
      .eq("id", row.id).eq("status", "queued")
      .select().maybeSingle();
    if (error) throw new Error(`claimNext: ${error.message}`);
    return (data as ApplyRecord | null) ?? null; // null => someone else claimed it first
  }
  const candidates = memList(userId, { status: ["queued"] });
  const next = candidates[0];
  if (!next) return null;
  next.status = "claimed";
  next.claimed_by = deviceId;
  next.claimed_at = now;
  next.updated_at = now;
  return next;
}

export async function updateApply(
  env: Env, userId: string, id: string, patch: Partial<ApplyRecord>,
): Promise<ApplyRecord | null> {
  if (useSupabase(env)) {
    const { data, error } = await getSupabase(env)
      .from("apply_queue").update(patch).eq("user_id", userId).eq("id", id)
      .select().maybeSingle();
    if (error) throw new Error(`updateApply: ${error.message}`);
    return data as ApplyRecord | null;
  }
  const r = memStore.get(id);
  if (!r || r.user_id !== userId) return null;
  Object.assign(r, patch, { updated_at: new Date().toISOString() });
  return r;
}

export async function appendAttemptLog(
  env: Env, userId: string, id: string, step: string, note?: string,
): Promise<void> {
  const rec = await getApply(env, userId, id);
  if (!rec) return;
  const entry = { at: new Date().toISOString(), step, note };
  await updateApply(env, userId, id, {
    attempt_log: [...rec.attempt_log, entry],
  });
}

export async function appendScreenshotUrl(
  env: Env, userId: string, id: string, url: string,
): Promise<void> {
  const rec = await getApply(env, userId, id);
  if (!rec) return;
  await updateApply(env, userId, id, {
    screenshot_urls: [...rec.screenshot_urls, url],
  });
}

/** Test helper. */
export function __resetApplyQueueStore(): void {
  memStore.clear();
}
