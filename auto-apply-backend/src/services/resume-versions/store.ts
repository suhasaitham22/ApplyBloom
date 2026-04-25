// Resume version history store.
// Every time a resume's `parsed` (or raw_text) changes we write a snapshot here.
// Supabase adapter in prod, in-memory fallback for dev / tests.

import { supabaseEnabled } from "@/lib/supabase/client";

export type CreatedBy = "user" | "ai" | "import" | "system";

export interface ResumeVersion {
  id: string;
  resume_id: string;
  user_id: string;
  version: number;
  parsed: unknown;
  raw_text: string | null;
  created_at: string;
  created_by: CreatedBy;
  change_summary: string | null;
  ops: unknown;
  message_id: string | null;
}

export interface CreateVersionInput {
  resume_id: string;
  user_id: string;
  parsed: unknown;
  raw_text?: string | null;
  created_by: CreatedBy;
  change_summary?: string | null;
  ops?: unknown;
  message_id?: string | null;
}

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  DEMO_MODE?: string;
}

// ── In-memory store ─────────────────────────────────────────────────
const memStore = new Map<string, ResumeVersion[]>();

export function _memoryReset() { memStore.clear(); }

async function memCreate(input: CreateVersionInput): Promise<ResumeVersion> {
  const list = memStore.get(input.resume_id) ?? [];
  const nextVersion = (list[0]?.version ?? 0) + 1;
  const rec: ResumeVersion = {
    id: crypto.randomUUID(),
    resume_id: input.resume_id,
    user_id: input.user_id,
    version: nextVersion,
    parsed: input.parsed ?? null,
    raw_text: input.raw_text ?? null,
    created_at: new Date().toISOString(),
    created_by: input.created_by,
    change_summary: input.change_summary ?? null,
    ops: input.ops ?? null,
    message_id: input.message_id ?? null,
  };
  memStore.set(input.resume_id, [rec, ...list]);
  return rec;
}

async function memList(userId: string, resumeId: string, limit = 50): Promise<ResumeVersion[]> {
  const all = memStore.get(resumeId) ?? [];
  return all.filter((v) => v.user_id === userId).slice(0, limit);
}

async function memGet(userId: string, resumeId: string, version: number): Promise<ResumeVersion | null> {
  const all = memStore.get(resumeId) ?? [];
  return all.find((v) => v.version === version && v.user_id === userId) ?? null;
}

// ── Supabase store ──────────────────────────────────────────────────
function sbHeaders(env: Env) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

async function sbCreate(env: Env, input: CreateVersionInput): Promise<ResumeVersion> {
  // Atomically compute next version via a read-then-write.
  // Safe enough: single writer per resume (owner). For stronger guarantees a DB
  // trigger / sequence could be added later.
  const listUrl = `${env.SUPABASE_URL}/rest/v1/resume_versions?resume_id=eq.${input.resume_id}&select=version&order=version.desc&limit=1`;
  const listRes = await fetch(listUrl, { headers: sbHeaders(env) });
  const listBody = (await listRes.json()) as Array<{ version: number }>;
  const nextVersion = (listBody[0]?.version ?? 0) + 1;

  const insertUrl = `${env.SUPABASE_URL}/rest/v1/resume_versions`;
  const row = {
    resume_id: input.resume_id,
    user_id: input.user_id,
    version: nextVersion,
    parsed: input.parsed ?? null,
    raw_text: input.raw_text ?? null,
    created_by: input.created_by,
    change_summary: input.change_summary ?? null,
    ops: input.ops ?? null,
    message_id: input.message_id ?? null,
  };
  const res = await fetch(insertUrl, { method: "POST", headers: sbHeaders(env), body: JSON.stringify(row) });
  if (!res.ok) throw new Error(`resume_versions insert failed: ${res.status} ${await res.text()}`);
  const [created] = (await res.json()) as ResumeVersion[];
  return created;
}

async function sbList(env: Env, userId: string, resumeId: string, limit = 50): Promise<ResumeVersion[]> {
  const url = `${env.SUPABASE_URL}/rest/v1/resume_versions?resume_id=eq.${resumeId}&user_id=eq.${userId}&order=version.desc&limit=${limit}`;
  const res = await fetch(url, { headers: sbHeaders(env) });
  if (!res.ok) throw new Error(`resume_versions list failed: ${res.status}`);
  return (await res.json()) as ResumeVersion[];
}

async function sbGet(env: Env, userId: string, resumeId: string, version: number): Promise<ResumeVersion | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/resume_versions?resume_id=eq.${resumeId}&user_id=eq.${userId}&version=eq.${version}&limit=1`;
  const res = await fetch(url, { headers: sbHeaders(env) });
  if (!res.ok) return null;
  const body = (await res.json()) as ResumeVersion[];
  return body[0] ?? null;
}

// ── Dispatcher ──────────────────────────────────────────────────────
const useSb = (env: Env) => supabaseEnabled(env);

export async function createVersion(env: Env, input: CreateVersionInput): Promise<ResumeVersion> {
  return useSb(env) ? sbCreate(env, input) : memCreate(input);
}

export async function listVersions(env: Env, userId: string, resumeId: string, limit = 50): Promise<ResumeVersion[]> {
  return useSb(env) ? sbList(env, userId, resumeId, limit) : memList(userId, resumeId, limit);
}

export async function getVersion(env: Env, userId: string, resumeId: string, version: number): Promise<ResumeVersion | null> {
  return useSb(env) ? sbGet(env, userId, resumeId, version) : memGet(userId, resumeId, version);
}
