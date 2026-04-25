"use client";

// Thin client wrapping backend /api/v1/{resumes,sessions} endpoints.

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const BASE = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ?? "http://127.0.0.1:8787";
const DEMO_USER = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "local_demo_user";
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

async function getAuthToken(): Promise<string> {
  // In demo mode, keep the old behavior (bearer = demo user id, worker fallback accepts it).
  if (DEMO_MODE) return DEMO_USER;
  // Real auth: pull the current Supabase access token.
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return DEMO_USER;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

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
  mode: "single" | "auto";
  status: "idle" | "collecting" | "ready" | "running" | "paused" | "completed" | "cancelled" | "failed";
  title: string;
  job: { title?: string; company?: string; description?: string; url?: string } | null;
  tailored_resume_id: string | null;
  application_id: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data as { title?: string; detail?: string })?.detail ?? (data as { title?: string })?.title ?? `HTTP ${res.status}`);
  return (data as { data: T }).data;
}

// Resumes
export const listResumes = () => call<{ resumes: Resume[] }>("/api/v1/resumes");
export const createResume = (name: string, raw_text?: string) =>
  call<{ resume: Resume }>("/api/v1/resumes", { method: "POST", body: JSON.stringify({ name, raw_text }) });
export const updateResume = (id: string, patch: Partial<Pick<Resume, "name" | "parsed" | "raw_text" | "is_base">>) =>
  call<{ resume: Resume }>(`/api/v1/resumes/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
export const deleteResume = (id: string) => call<{ deleted: true }>(`/api/v1/resumes/${id}`, { method: "DELETE" });

// Sessions
export const listSessions = () => call<{ sessions: ChatSession[] }>("/api/v1/sessions");
export const createSession = (opts: { title?: string; mode?: "single" | "auto"; resume_id?: string | null }) =>
  call<{ session: ChatSession }>("/api/v1/sessions", { method: "POST", body: JSON.stringify(opts) });
export const getSession = (id: string) =>
  call<{ session: ChatSession; messages: ChatMessage[] }>(`/api/v1/sessions/${id}`);
export const updateSession = (id: string, patch: Partial<ChatSession>) =>
  call<{ session: ChatSession }>(`/api/v1/sessions/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
export const sendMessage = (id: string, content: string) =>
  call<{ messages: ChatMessage[] }>(`/api/v1/sessions/${id}/messages`, { method: "POST", body: JSON.stringify({ content }) });
export const parseResume = (sessionId: string, resume_text: string) =>
  call<unknown>(`/api/v1/sessions/${sessionId}/parse`, { method: "POST", body: JSON.stringify({ resume_text }) });
export const tailorResume = (sessionId: string, resume: unknown) =>
  call<unknown>(`/api/v1/sessions/${sessionId}/tailor`, { method: "POST", body: JSON.stringify({ resume }) });
export const applySession = (sessionId: string) =>
  call<{ submitted: true; session: ChatSession }>(`/api/v1/sessions/${sessionId}/apply`, { method: "POST" });
export const lockSession = (sessionId: string) =>
  call<{ session: ChatSession }>(`/api/v1/sessions/${sessionId}/lock`, { method: "POST" });

// ── Lifecycle ─────────────────────────────────────────────────────────
export const startSession = (sessionId: string) =>
  call<{ session: ChatSession }>(`/api/v1/sessions/${sessionId}/start`, { method: "POST" });
export const pauseSessionApi = (sessionId: string) =>
  call<{ session: ChatSession }>(`/api/v1/sessions/${sessionId}/pause`, { method: "POST" });
export const resumeSessionApi = (sessionId: string) =>
  call<{ session: ChatSession }>(`/api/v1/sessions/${sessionId}/resume`, { method: "POST" });
export const cancelSession = (sessionId: string) =>
  call<{ session: ChatSession }>(`/api/v1/sessions/${sessionId}/cancel`, { method: "POST" });

// ── Upload (multipart/form-data) ──────────────────────────────────────
export async function uploadResumeFile(opts: { file: File; name?: string; replaceResumeId?: string | null }): Promise<{ resume: Resume; storage: { storage_path: string; url: string; bytes: number; file_type: string } }> {
  const form = new FormData();
  form.append("file", opts.file);
  if (opts.name) form.append("name", opts.name);
  if (opts.replaceResumeId) form.append("replace_resume_id", opts.replaceResumeId);
  const token = await getAuthToken();
  const res = await fetch(`${BASE}/api/v1/resumes/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data as { title?: string; detail?: string })?.detail ?? (data as { title?: string })?.title ?? `HTTP ${res.status}`);
  return (data as { data: { resume: Resume; storage: { storage_path: string; url: string; bytes: number; file_type: string } } }).data;
}


// ── Credentials vault ─────────────────────────────────────────────────
export type CredentialProvider =
  | "linkedin" | "indeed" | "greenhouse" | "lever"
  | "workday" | "wellfound" | "generic" | "other";

export interface RedactedCredential {
  id: string;
  provider: CredentialProvider;
  label: string | null;
  username_masked: string;
  has_password: boolean;
  has_extra: boolean;
  last_used_at: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface FullCredential extends RedactedCredential {
  username: string;
  password: string;
  extra: Record<string, unknown> | null;
}

export const listCredentials = () =>
  call<{ credentials: RedactedCredential[] }>("/api/v1/credentials");

export const createCredential = (input: {
  provider: CredentialProvider;
  label?: string | null;
  username: string;
  password: string;
  extra?: Record<string, unknown> | null;
}) => call<{ credential: RedactedCredential }>("/api/v1/credentials", {
  method: "POST", body: JSON.stringify(input),
});

export const getCredential = (id: string) =>
  call<{ credential: RedactedCredential }>(`/api/v1/credentials/${id}`);

/** Reveals plaintext — AUDITED. Use only when user explicitly clicks "Reveal". */
export const revealCredential = (id: string) =>
  call<{ credential: FullCredential; revealed: true }>(`/api/v1/credentials/${id}?reveal=true`);

export const updateCredential = (id: string, patch: {
  label?: string | null;
  username?: string;
  password?: string;
  extra?: Record<string, unknown> | null;
}) => call<{ credential: RedactedCredential }>(`/api/v1/credentials/${id}`, {
  method: "PATCH", body: JSON.stringify(patch),
});

export const deleteCredential = (id: string) =>
  call<{ deleted: true }>(`/api/v1/credentials/${id}`, { method: "DELETE" });

// Resume versions
export interface ResumeVersion {
  id: string;
  resume_id: string;
  user_id: string;
  version: number;
  parsed: unknown;
  raw_text: string | null;
  created_at: string;
  created_by: "user" | "ai" | "import" | "system";
  change_summary: string | null;
  ops: unknown;
  message_id: string | null;
  diff?: ResumeDiff[];
  diff_summary?: string;
}

export type ResumeDiff =
  | { path: "full_name" | "headline" | "summary"; kind: "modified" | "added" | "removed"; before?: string; after?: string }
  | { path: "skills"; kind: "added" | "removed"; value: string }
  | { path: string; kind: "modified" | "added" | "removed"; heading: string; index: number; before?: string; after?: string };

export const listResumeVersions = (resumeId: string) =>
  call<{ versions: ResumeVersion[] }>(`/api/v1/resumes/${resumeId}/versions`);

export const getResumeVersion = (resumeId: string, version: number) =>
  call<{ version: ResumeVersion }>(`/api/v1/resumes/${resumeId}/versions/${version}`);

export const restoreResumeVersion = (resumeId: string, version: number) =>
  call<{ resume: Resume; version: ResumeVersion; diff: ResumeDiff[] }>(
    `/api/v1/resumes/${resumeId}/versions/${version}/restore`,
    { method: "POST" },
  );
