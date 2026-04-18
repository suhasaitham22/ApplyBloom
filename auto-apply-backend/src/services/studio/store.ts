// In-memory studio store. Keyed by user_id so each "demo" session is isolated.
// In production this swaps for a Supabase Postgres adapter — same interface.

export type SessionStatus = "idle" | "collecting" | "ready" | "running" | "completed" | "failed";
export type SessionMode = "single" | "auto";

export interface Resume {
  id: string;
  user_id: string;
  name: string;
  parsed: unknown | null;
  raw_text: string | null;
  created_at: string;
  is_base: boolean;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system" | "action";
  content: string;
  action_type?: string;
  action_payload?: unknown;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  resume_id: string | null;
  mode: SessionMode;
  status: SessionStatus;
  title: string;
  job: { title?: string; company?: string; description?: string; url?: string } | null;
  tailored_resume_id: string | null;
  application_id: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Store {
  resumes: Map<string, Resume>;
  sessions: Map<string, ChatSession>;
  messages: Map<string, ChatMessage[]>; // keyed by session_id
}

const g = globalThis as unknown as { __applybloom_studio?: Store };

function getStore(): Store {
  if (!g.__applybloom_studio) {
    g.__applybloom_studio = {
      resumes: new Map(),
      sessions: new Map(),
      messages: new Map(),
    };
  }
  return g.__applybloom_studio;
}

function id() {
  return `id_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function now() { return new Date().toISOString(); }

// ── Resumes ──────────────────────────────────────────────────────────────

export async function createResume(userId: string, name: string, rawText: string | null = null): Promise<Resume> {
  const store = getStore();
  const existing = [...store.resumes.values()].filter((r) => r.user_id === userId);
  const r: Resume = {
    id: id(),
    user_id: userId,
    name,
    parsed: null,
    raw_text: rawText,
    created_at: now(),
    is_base: existing.length === 0,
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

export async function updateResume(userId: string, resumeId: string, patch: Partial<Pick<Resume, "name" | "parsed" | "raw_text" | "is_base">>): Promise<Resume | null> {
  const store = getStore();
  const r = store.resumes.get(resumeId);
  if (!r || r.user_id !== userId) return null;
  Object.assign(r, patch);
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

// ── Sessions ─────────────────────────────────────────────────────────────

export async function hasRunningSession(userId: string): Promise<boolean> {
  const store = getStore();
  for (const s of store.sessions.values()) {
    if (s.user_id === userId && s.status === "running") return true;
  }
  return false;
}

export async function createSession(userId: string, opts: { resume_id?: string | null; mode?: SessionMode; title?: string }): Promise<ChatSession> {
  const store = getStore();
  if (await hasRunningSession(userId)) {
    throw new StudioError(409, "session_locked", "Another session is currently running an automation. Wait for it to complete before starting a new one.");
  }
  const s: ChatSession = {
    id: id(),
    user_id: userId,
    resume_id: opts.resume_id ?? null,
    mode: opts.mode ?? "single",
    status: "idle",
    title: opts.title ?? "Untitled session",
    job: null,
    tailored_resume_id: null,
    application_id: null,
    locked_at: null,
    created_at: now(),
    updated_at: now(),
  };
  store.sessions.set(s.id, s);
  store.messages.set(s.id, []);
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

export async function lockSession(userId: string, sessionId: string): Promise<ChatSession | null> {
  const s = await getSession(userId, sessionId);
  if (!s) return null;
  if (s.status === "running" || s.status === "completed") {
    throw new StudioError(409, "already_locked", "This session is already running or completed.");
  }
  return await updateSession(userId, sessionId, { status: "running", locked_at: now() });
}

// ── Messages ─────────────────────────────────────────────────────────────

export async function listMessages(sessionId: string): Promise<ChatMessage[]> {
  const store = getStore();
  return store.messages.get(sessionId) ?? [];
}

export async function appendMessage(
  userId: string,
  sessionId: string,
  msg: Omit<ChatMessage, "id" | "session_id" | "created_at">,
  options: { bypassLock?: boolean } = {},
): Promise<ChatMessage> {
  const s = await getSession(userId, sessionId);
  if (!s) throw new StudioError(404, "session_not_found", "Session not found.");
  if (!options.bypassLock && (s.status === "running" || s.status === "completed" || s.status === "failed")) {
    throw new StudioError(423, "session_locked", "This session cannot accept new messages. Start a new session to continue.");
  }
  const store = getStore();
  const m: ChatMessage = { id: id(), session_id: sessionId, created_at: now(), ...msg };
  const arr = store.messages.get(sessionId) ?? [];
  arr.push(m);
  store.messages.set(sessionId, arr);
  await updateSession(userId, sessionId, {});
  return m;
}

// ── Errors ───────────────────────────────────────────────────────────────

export class StudioError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
