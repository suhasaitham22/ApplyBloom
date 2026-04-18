// In-memory studio store — mirrors the Supabase schema in migrations/001_studio_core.sql
// Swap for a Supabase Postgres adapter in production without changing any call sites.

export type SessionStatus = "idle" | "collecting" | "ready" | "running" | "paused" | "completed" | "cancelled" | "failed";
export type SessionMode = "single" | "auto";
export type ChatRole = "user" | "assistant" | "system" | "action" | "thinking" | "error";
export type JobStatus = "pending" | "tailoring" | "applying" | "applied" | "skipped" | "failed";

export interface Resume {
  id: string;
  user_id: string;
  name: string;
  raw_text: string | null;
  parsed: unknown | null;
  storage_path: string | null;
  file_type: "pdf" | "docx" | "txt" | "text" | "other" | null;
  version: number;
  is_base: boolean;
  parent_id: string | null;
  tailored_for_session_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AutoApplyPreferences {
  experience_level?: "intern" | "entry" | "mid" | "senior" | "staff" | "principal";
  locations?: string[];
  remote?: "remote" | "hybrid" | "onsite" | "any";
  salary_min?: number;
  keywords_include?: string[];
  keywords_exclude?: string[];
  industries_exclude?: string[];
  max_daily?: number;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  mode: SessionMode;
  status: SessionStatus;
  resume_id: string | null;
  tailored_resume_id: string | null;
  job: { title?: string; company?: string; description?: string; url?: string; source?: string } | null;
  preferences: AutoApplyPreferences;
  daily_cap: number;
  applications_today: number;
  application_id: string | null;
  locked_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  paused_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  thinking: string | null;
  action_type: string | null;
  action_payload: unknown;
  model: string | null;
  prompt_version: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  latency_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface JobQueueEntry {
  id: string;
  session_id: string;
  user_id: string;
  external_job_id: string | null;
  source: string | null;
  title: string;
  company: string;
  location: string | null;
  remote: boolean | null;
  description: string | null;
  url: string | null;
  score: number | null;
  status: JobStatus;
  tailored_resume_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface Store {
  resumes: Map<string, Resume>;
  sessions: Map<string, ChatSession>;
  messages: Map<string, ChatMessage[]>; // keyed by session_id
  jobs: Map<string, JobQueueEntry[]>;   // keyed by session_id
}

const g = globalThis as unknown as { __applybloom_studio?: Store };

function getStore(): Store {
  if (!g.__applybloom_studio) {
    g.__applybloom_studio = {
      resumes: new Map(),
      sessions: new Map(),
      messages: new Map(),
      jobs: new Map(),
    };
  }
  return g.__applybloom_studio;
}

function id() { return `id_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`; }
function now() { return new Date().toISOString(); }

// ── Resumes ─────────────────────────────────────────────────────────────
export async function createResume(userId: string, opts: {
  name: string;
  raw_text?: string | null;
  storage_path?: string | null;
  file_type?: Resume["file_type"];
  parent_id?: string | null;
  tailored_for_session_id?: string | null;
}): Promise<Resume> {
  const store = getStore();
  const existing = [...store.resumes.values()].filter((r) => r.user_id === userId);
  const r: Resume = {
    id: id(),
    user_id: userId,
    name: opts.name,
    raw_text: opts.raw_text ?? null,
    parsed: null,
    storage_path: opts.storage_path ?? null,
    file_type: opts.file_type ?? null,
    version: 1,
    is_base: existing.length === 0,
    parent_id: opts.parent_id ?? null,
    tailored_for_session_id: opts.tailored_for_session_id ?? null,
    metadata: {},
    created_at: now(),
    updated_at: now(),
  };
  store.resumes.set(r.id, r);
  return r;
}

export async function listResumes(userId: string): Promise<Resume[]> {
  const store = getStore();
  return [...store.resumes.values()]
    .filter((r) => r.user_id === userId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function getResume(userId: string, resumeId: string): Promise<Resume | null> {
  const store = getStore();
  const r = store.resumes.get(resumeId);
  if (!r || r.user_id !== userId) return null;
  return r;
}

export async function updateResume(
  userId: string,
  resumeId: string,
  patch: Partial<Pick<Resume, "name" | "parsed" | "raw_text" | "is_base" | "storage_path" | "file_type" | "metadata">>,
): Promise<Resume | null> {
  const store = getStore();
  const r = store.resumes.get(resumeId);
  if (!r || r.user_id !== userId) return null;
  Object.assign(r, patch, { updated_at: now() });
  store.resumes.set(r.id, r);
  return r;
}

export async function deleteResume(userId: string, resumeId: string): Promise<boolean> {
  const store = getStore();
  const r = store.resumes.get(resumeId);
  if (!r || r.user_id !== userId) return false;
  store.resumes.delete(resumeId);
  return true;
}

// ── Sessions ────────────────────────────────────────────────────────────
export async function hasActiveSession(userId: string): Promise<ChatSession | null> {
  // Returns the session if any is currently running/collecting (blocking a new one).
  const store = getStore();
  for (const s of store.sessions.values()) {
    if (s.user_id === userId && (s.status === "running" || s.status === "collecting")) return s;
  }
  return null;
}

export async function createSession(userId: string, opts: {
  resume_id?: string | null;
  mode?: SessionMode;
  title?: string;
  preferences?: AutoApplyPreferences;
}): Promise<ChatSession> {
  const active = await hasActiveSession(userId);
  if (active) {
    throw new StudioError(
      409, "session_locked",
      `An ${active.mode} session is already ${active.status}. Pause or cancel "${active.title}" before starting a new one.`,
    );
  }
  const store = getStore();
  const s: ChatSession = {
    id: id(),
    user_id: userId,
    title: opts.title ?? "Untitled session",
    mode: opts.mode ?? "single",
    status: "idle",
    resume_id: opts.resume_id ?? null,
    tailored_resume_id: null,
    job: null,
    preferences: opts.preferences ?? {},
    daily_cap: 10,
    applications_today: 0,
    application_id: null,
    locked_at: null,
    completed_at: null,
    cancelled_at: null,
    paused_at: null,
    metadata: {},
    created_at: now(),
    updated_at: now(),
  };
  store.sessions.set(s.id, s);
  store.messages.set(s.id, []);
  store.jobs.set(s.id, []);
  return s;
}

export async function listSessions(userId: string): Promise<ChatSession[]> {
  const store = getStore();
  return [...store.sessions.values()]
    .filter((s) => s.user_id === userId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function getSession(userId: string, sessionId: string): Promise<ChatSession | null> {
  const store = getStore();
  const s = store.sessions.get(sessionId);
  if (!s || s.user_id !== userId) return null;
  return s;
}

export async function updateSession(userId: string, sessionId: string, patch: Partial<ChatSession>): Promise<ChatSession | null> {
  const store = getStore();
  const s = store.sessions.get(sessionId);
  if (!s || s.user_id !== userId) return null;
  Object.assign(s, patch, { updated_at: now() });
  store.sessions.set(s.id, s);
  return s;
}

export async function startSession(userId: string, sessionId: string): Promise<ChatSession | null> {
  const s = await getSession(userId, sessionId);
  if (!s) return null;
  if (s.status === "running") return s;
  if (s.status === "completed" || s.status === "cancelled") {
    throw new StudioError(409, "already_closed", "This session is already completed or cancelled.");
  }
  // Global check: another running/collecting session blocks this one
  const active = await hasActiveSession(userId);
  if (active && active.id !== sessionId) {
    throw new StudioError(409, "another_running", `"${active.title}" is ${active.status}. Pause or cancel it first.`);
  }
  return await updateSession(userId, sessionId, { status: "running", locked_at: now() });
}

export async function pauseSession(userId: string, sessionId: string): Promise<ChatSession | null> {
  const s = await getSession(userId, sessionId);
  if (!s) return null;
  if (s.status !== "running" && s.status !== "collecting") {
    throw new StudioError(409, "not_active", "Only running sessions can be paused.");
  }
  return await updateSession(userId, sessionId, { status: "paused", paused_at: now() });
}

export async function resumeSession(userId: string, sessionId: string): Promise<ChatSession | null> {
  const s = await getSession(userId, sessionId);
  if (!s) return null;
  if (s.status !== "paused") throw new StudioError(409, "not_paused", "Only paused sessions can be resumed.");
  const active = await hasActiveSession(userId);
  if (active) throw new StudioError(409, "another_running", `"${active.title}" is ${active.status}. Pause or cancel it first.`);
  return await updateSession(userId, sessionId, { status: "running", paused_at: null, locked_at: now() });
}

export async function cancelSession(userId: string, sessionId: string): Promise<ChatSession | null> {
  const s = await getSession(userId, sessionId);
  if (!s) return null;
  if (s.status === "completed" || s.status === "cancelled") return s;
  return await updateSession(userId, sessionId, { status: "cancelled", cancelled_at: now() });
}

export async function completeSession(userId: string, sessionId: string): Promise<ChatSession | null> {
  return await updateSession(userId, sessionId, { status: "completed", completed_at: now() });
}

// ── Messages ────────────────────────────────────────────────────────────
export async function listMessages(sessionId: string): Promise<ChatMessage[]> {
  const store = getStore();
  return store.messages.get(sessionId) ?? [];
}

export async function appendMessage(
  userId: string,
  sessionId: string,
  msg: Partial<Omit<ChatMessage, "id" | "session_id" | "user_id" | "created_at">> & { role: ChatRole; content: string },
  options: { bypassLock?: boolean } = {},
): Promise<ChatMessage> {
  const s = await getSession(userId, sessionId);
  if (!s) throw new StudioError(404, "session_not_found", "Session not found.");
  // For auto-apply we still want the system to log into the chat even when running.
  // So only block end-user-initiated user messages when session is completed/cancelled.
  if (!options.bypassLock && msg.role === "user" && (s.status === "completed" || s.status === "cancelled" || s.status === "failed")) {
    throw new StudioError(423, "session_closed", "This session is closed. Start a new one to continue.");
  }
  const store = getStore();
  const m: ChatMessage = {
    id: id(),
    session_id: sessionId,
    user_id: userId,
    created_at: now(),
    thinking: null,
    action_type: null,
    action_payload: null,
    model: null,
    prompt_version: null,
    tokens_input: null,
    tokens_output: null,
    latency_ms: null,
    metadata: {},
    ...msg,
  };
  const arr = store.messages.get(sessionId) ?? [];
  arr.push(m);
  store.messages.set(sessionId, arr);
  await updateSession(userId, sessionId, {});
  return m;
}

// ── Job queue (auto apply) ──────────────────────────────────────────────
export async function enqueueJobs(userId: string, sessionId: string, jobs: Array<Omit<JobQueueEntry, "id" | "session_id" | "user_id" | "status" | "created_at" | "updated_at" | "metadata" | "tailored_resume_id" | "error_message">>): Promise<JobQueueEntry[]> {
  const store = getStore();
  const arr = store.jobs.get(sessionId) ?? [];
  const created: JobQueueEntry[] = [];
  for (const j of jobs) {
    const entry: JobQueueEntry = {
      id: id(),
      session_id: sessionId,
      user_id: userId,
      status: "pending",
      tailored_resume_id: null,
      error_message: null,
      metadata: {},
      created_at: now(),
      updated_at: now(),
      ...j,
    };
    arr.push(entry);
    created.push(entry);
  }
  store.jobs.set(sessionId, arr);
  return created;
}

export async function listJobs(sessionId: string): Promise<JobQueueEntry[]> {
  const store = getStore();
  return store.jobs.get(sessionId) ?? [];
}

export async function updateJob(sessionId: string, jobId: string, patch: Partial<JobQueueEntry>): Promise<JobQueueEntry | null> {
  const store = getStore();
  const arr = store.jobs.get(sessionId) ?? [];
  const idx = arr.findIndex((j) => j.id === jobId);
  if (idx < 0) return null;
  Object.assign(arr[idx], patch, { updated_at: now() });
  store.jobs.set(sessionId, arr);
  return arr[idx];
}

// ── Errors ──────────────────────────────────────────────────────────────
export class StudioError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Back-compat exports for existing imports
export const lockSession = startSession;
export const hasRunningSession = hasActiveSession;
