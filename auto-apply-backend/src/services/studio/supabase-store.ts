// Supabase Postgres adapter for the studio store.
// Mirrors the interface of the in-memory store exactly — every public function
// is a drop-in replacement. Each call scopes by verified userId.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import {
  StudioError,
  type Resume,
  type ChatSession,
  type ChatMessage,
  type JobQueueEntry,
  type SessionMode,
  type AutoApplyPreferences,
} from "./memory-store";

type Env = { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string };

function sb(env: Env): SupabaseClient {
  return getSupabase(env);
}

// ── Resumes ────────────────────────────────────────────────────────────
export async function sbCreateResume(
  env: Env,
  userId: string,
  opts: {
    name: string;
    raw_text?: string | null;
    storage_path?: string | null;
    file_type?: Resume["file_type"];
    parent_id?: string | null;
    tailored_for_session_id?: string | null;
  },
): Promise<Resume> {
  // is_base = true when this is the first resume for the user
  const existing = await sb(env).from("resumes").select("id", { count: "exact", head: true }).eq("user_id", userId);
  const isFirst = (existing.count ?? 0) === 0;

  const { data, error } = await sb(env)
    .from("resumes")
    .insert({
      user_id: userId,
      name: opts.name,
      raw_text: opts.raw_text ?? null,
      storage_path: opts.storage_path ?? null,
      file_type: opts.file_type ?? null,
      parent_id: opts.parent_id ?? null,
      tailored_for_session_id: opts.tailored_for_session_id ?? null,
      is_base: isFirst,
      metadata: {},
    })
    .select()
    .single();

  if (error) throw new StudioError(500, "db_error", `createResume: ${error.message}`);
  return toResume(data);
}

export async function sbListResumes(env: Env, userId: string): Promise<Resume[]> {
  const { data, error } = await sb(env)
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new StudioError(500, "db_error", `listResumes: ${error.message}`);
  return (data ?? []).map(toResume);
}

export async function sbGetResume(env: Env, userId: string, resumeId: string): Promise<Resume | null> {
  const { data, error } = await sb(env)
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .eq("id", resumeId)
    .maybeSingle();
  if (error) throw new StudioError(500, "db_error", `getResume: ${error.message}`);
  return data ? toResume(data) : null;
}

export async function sbUpdateResume(
  env: Env,
  userId: string,
  resumeId: string,
  patch: Partial<Pick<Resume, "name" | "parsed" | "raw_text" | "is_base" | "storage_path" | "file_type" | "metadata">>,
): Promise<Resume | null> {
  const { data, error } = await sb(env)
    .from("resumes")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", resumeId)
    .select()
    .maybeSingle();
  if (error) throw new StudioError(500, "db_error", `updateResume: ${error.message}`);
  return data ? toResume(data) : null;
}

export async function sbDeleteResume(env: Env, userId: string, resumeId: string): Promise<boolean> {
  const { error, count } = await sb(env)
    .from("resumes")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("id", resumeId);
  if (error) throw new StudioError(500, "db_error", `deleteResume: ${error.message}`);
  return (count ?? 0) > 0;
}

// ── Sessions ───────────────────────────────────────────────────────────
export async function sbHasActiveSession(env: Env, userId: string): Promise<ChatSession | null> {
  const { data, error } = await sb(env)
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["running", "collecting"])
    .limit(1)
    .maybeSingle();
  if (error) throw new StudioError(500, "db_error", `hasActiveSession: ${error.message}`);
  return data ? toSession(data) : null;
}

export async function sbCreateSession(
  env: Env,
  userId: string,
  opts: {
    resume_id?: string | null;
    mode?: SessionMode;
    title?: string;
    preferences?: AutoApplyPreferences;
  },
): Promise<ChatSession> {
  // Global guard: the partial unique index in Postgres prevents two running/collecting
  // sessions per user — but we create in 'idle' so that never trips.
  const active = await sbHasActiveSession(env, userId);
  if (active) {
    throw new StudioError(
      409, "session_locked",
      `An ${active.mode} session is already ${active.status}. Pause or cancel "${active.title}" before starting a new one.`,
    );
  }

  // Idempotency: if the user already has an idle session created in the last 5s
  // with the same title+mode, return it instead of creating a duplicate.
  // Covers React StrictMode double-invoke and rapid double-clicks.
  const fiveSecAgo = new Date(Date.now() - 5000).toISOString();
  const { data: recent } = await sb(env)
    .from("sessions")
    .select()
    .eq("user_id", userId)
    .eq("status", "idle")
    .eq("title", opts.title ?? "Untitled session")
    .eq("mode", opts.mode ?? "single")
    .gte("created_at", fiveSecAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent) return toSession(recent);

  const { data, error } = await sb(env)
    .from("sessions")
    .insert({
      user_id: userId,
      title: opts.title ?? "Untitled session",
      mode: opts.mode ?? "single",
      status: "idle",
      resume_id: opts.resume_id ?? null,
      preferences: opts.preferences ?? {},
      daily_cap: 10,
      applications_today: 0,
      metadata: {},
    })
    .select()
    .single();
  if (error) throw new StudioError(500, "db_error", `createSession: ${error.message}`);
  return toSession(data);
}

export async function sbListSessions(env: Env, userId: string): Promise<ChatSession[]> {
  const { data, error } = await sb(env)
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new StudioError(500, "db_error", `listSessions: ${error.message}`);
  return (data ?? []).map(toSession);
}

export async function sbGetSession(env: Env, userId: string, sessionId: string): Promise<ChatSession | null> {
  const { data, error } = await sb(env)
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw new StudioError(500, "db_error", `getSession: ${error.message}`);
  return data ? toSession(data) : null;
}

export async function sbUpdateSession(
  env: Env,
  userId: string,
  sessionId: string,
  patch: Partial<ChatSession>,
): Promise<ChatSession | null> {
  // Drop undefined keys so we don't accidentally null-out fields
  const cleanPatch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) cleanPatch[k] = v;
  // Never try to update the primary key or user_id
  delete cleanPatch.id;
  delete cleanPatch.user_id;
  delete cleanPatch.created_at;

  const { data, error } = await sb(env)
    .from("sessions")
    .update(cleanPatch)
    .eq("user_id", userId)
    .eq("id", sessionId)
    .select()
    .maybeSingle();
  if (error) throw new StudioError(500, "db_error", `updateSession: ${error.message}`);
  return data ? toSession(data) : null;
}

export async function sbStartSession(env: Env, userId: string, sessionId: string): Promise<ChatSession | null> {
  const s = await sbGetSession(env, userId, sessionId);
  if (!s) return null;
  if (s.status === "running") return s;
  if (s.status === "completed" || s.status === "cancelled") {
    throw new StudioError(409, "already_closed", "This session is already completed or cancelled.");
  }
  const active = await sbHasActiveSession(env, userId);
  if (active && active.id !== sessionId) {
    throw new StudioError(409, "another_running", `"${active.title}" is ${active.status}. Pause or cancel it first.`);
  }
  return sbUpdateSession(env, userId, sessionId, { status: "running", locked_at: new Date().toISOString() } as Partial<ChatSession>);
}

export async function sbPauseSession(env: Env, userId: string, sessionId: string): Promise<ChatSession | null> {
  const s = await sbGetSession(env, userId, sessionId);
  if (!s) return null;
  if (s.status !== "running" && s.status !== "collecting") {
    throw new StudioError(409, "not_active", "Only running sessions can be paused.");
  }
  return sbUpdateSession(env, userId, sessionId, { status: "paused", paused_at: new Date().toISOString() } as Partial<ChatSession>);
}

export async function sbResumeSession(env: Env, userId: string, sessionId: string): Promise<ChatSession | null> {
  const s = await sbGetSession(env, userId, sessionId);
  if (!s) return null;
  if (s.status !== "paused") throw new StudioError(409, "not_paused", "Only paused sessions can be resumed.");
  const active = await sbHasActiveSession(env, userId);
  if (active) throw new StudioError(409, "another_running", `"${active.title}" is ${active.status}. Pause or cancel it first.`);
  return sbUpdateSession(env, userId, sessionId, { status: "running", paused_at: null, locked_at: new Date().toISOString() } as Partial<ChatSession>);
}

export async function sbCancelSession(env: Env, userId: string, sessionId: string): Promise<ChatSession | null> {
  const s = await sbGetSession(env, userId, sessionId);
  if (!s) return null;
  if (s.status === "completed" || s.status === "cancelled") return s;
  return sbUpdateSession(env, userId, sessionId, { status: "cancelled", cancelled_at: new Date().toISOString() } as Partial<ChatSession>);
}

export async function sbCompleteSession(env: Env, userId: string, sessionId: string): Promise<ChatSession | null> {
  return sbUpdateSession(env, userId, sessionId, { status: "completed", completed_at: new Date().toISOString() } as Partial<ChatSession>);
}

// ── Messages ───────────────────────────────────────────────────────────
export async function sbListMessages(env: Env, sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await sb(env)
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw new StudioError(500, "db_error", `listMessages: ${error.message}`);
  return (data ?? []).map(toMessage);
}

export async function sbAppendMessage(
  env: Env,
  userId: string,
  sessionId: string,
  msg: Partial<Omit<ChatMessage, "id" | "session_id" | "user_id" | "created_at">> & { role: ChatMessage["role"]; content: string },
  options: { bypassLock?: boolean } = {},
): Promise<ChatMessage> {
  const s = await sbGetSession(env, userId, sessionId);
  if (!s) throw new StudioError(404, "session_not_found", "Session not found.");
  if (!options.bypassLock && msg.role === "user" && (s.status === "completed" || s.status === "cancelled" || s.status === "failed")) {
    throw new StudioError(423, "session_closed", "This session is closed. Start a new one to continue.");
  }

  const { data, error } = await sb(env)
    .from("chat_messages")
    .insert({
      session_id: sessionId,
      user_id: userId,
      role: msg.role,
      content: msg.content,
      thinking: msg.thinking ?? null,
      action_type: msg.action_type ?? null,
      action_payload: msg.action_payload ?? null,
      model: msg.model ?? null,
      prompt_version: msg.prompt_version ?? null,
      tokens_input: msg.tokens_input ?? null,
      tokens_output: msg.tokens_output ?? null,
      latency_ms: msg.latency_ms ?? null,
      metadata: msg.metadata ?? {},
    })
    .select()
    .single();
  if (error) throw new StudioError(500, "db_error", `appendMessage: ${error.message}`);

  // Bump session.updated_at so the sidebar re-sorts
  await sb(env).from("sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId).eq("user_id", userId);

  return toMessage(data);
}

// ── Job queue ──────────────────────────────────────────────────────────
export async function sbEnqueueJobs(
  env: Env,
  userId: string,
  sessionId: string,
  jobs: Array<Omit<JobQueueEntry, "id" | "session_id" | "user_id" | "status" | "created_at" | "updated_at" | "metadata" | "tailored_resume_id" | "error_message">>,
): Promise<JobQueueEntry[]> {
  if (jobs.length === 0) return [];
  const rows = jobs.map((j) => ({
    session_id: sessionId,
    user_id: userId,
    status: "pending" as const,
    metadata: {},
    ...j,
  }));
  const { data, error } = await sb(env).from("job_queue").insert(rows).select();
  if (error) throw new StudioError(500, "db_error", `enqueueJobs: ${error.message}`);
  return (data ?? []).map(toJob);
}

export async function sbListJobs(env: Env, sessionId: string): Promise<JobQueueEntry[]> {
  const { data, error } = await sb(env)
    .from("job_queue")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw new StudioError(500, "db_error", `listJobs: ${error.message}`);
  return (data ?? []).map(toJob);
}

export async function sbUpdateJob(
  env: Env,
  sessionId: string,
  jobId: string,
  patch: Partial<JobQueueEntry>,
): Promise<JobQueueEntry | null> {
  const { data, error } = await sb(env)
    .from("job_queue")
    .update(patch)
    .eq("session_id", sessionId)
    .eq("id", jobId)
    .select()
    .maybeSingle();
  if (error) throw new StudioError(500, "db_error", `updateJob: ${error.message}`);
  return data ? toJob(data) : null;
}

// ── Row → object mappers ───────────────────────────────────────────────
function toResume(row: Record<string, unknown>): Resume {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    raw_text: (row.raw_text as string | null) ?? null,
    parsed: row.parsed ?? null,
    storage_path: (row.storage_path as string | null) ?? null,
    file_type: (row.file_type as Resume["file_type"]) ?? null,
    version: (row.version as number) ?? 1,
    is_base: Boolean(row.is_base),
    parent_id: (row.parent_id as string | null) ?? null,
    tailored_for_session_id: (row.tailored_for_session_id as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function toSession(row: Record<string, unknown>): ChatSession {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    title: row.title as string,
    mode: row.mode as SessionMode,
    status: row.status as ChatSession["status"],
    resume_id: (row.resume_id as string | null) ?? null,
    tailored_resume_id: (row.tailored_resume_id as string | null) ?? null,
    job: (row.job as ChatSession["job"]) ?? null,
    preferences: (row.preferences as AutoApplyPreferences) ?? {},
    daily_cap: (row.daily_cap as number) ?? 10,
    applications_today: (row.applications_today as number) ?? 0,
    application_id: (row.application_id as string | null) ?? null,
    locked_at: (row.locked_at as string | null) ?? null,
    completed_at: (row.completed_at as string | null) ?? null,
    cancelled_at: (row.cancelled_at as string | null) ?? null,
    paused_at: (row.paused_at as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function toMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    session_id: row.session_id as string,
    user_id: row.user_id as string,
    role: row.role as ChatMessage["role"],
    content: row.content as string,
    thinking: (row.thinking as string | null) ?? null,
    action_type: (row.action_type as string | null) ?? null,
    action_payload: row.action_payload ?? null,
    model: (row.model as string | null) ?? null,
    prompt_version: (row.prompt_version as string | null) ?? null,
    tokens_input: (row.tokens_input as number | null) ?? null,
    tokens_output: (row.tokens_output as number | null) ?? null,
    latency_ms: (row.latency_ms as number | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
  };
}

function toJob(row: Record<string, unknown>): JobQueueEntry {
  return {
    id: row.id as string,
    session_id: row.session_id as string,
    user_id: row.user_id as string,
    external_job_id: (row.external_job_id as string | null) ?? null,
    source: (row.source as string | null) ?? null,
    title: row.title as string,
    company: row.company as string,
    location: (row.location as string | null) ?? null,
    remote: (row.remote as boolean | null) ?? null,
    description: (row.description as string | null) ?? null,
    url: (row.url as string | null) ?? null,
    score: (row.score as number | null) ?? null,
    status: row.status as JobQueueEntry["status"],
    tailored_resume_id: (row.tailored_resume_id as string | null) ?? null,
    error_message: (row.error_message as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
