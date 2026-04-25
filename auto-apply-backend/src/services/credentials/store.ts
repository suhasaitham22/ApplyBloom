// Credentials vault store — dual adapter (Supabase + in-memory).
// All secrets are encrypted *before* hitting storage. The store itself
// never sees plaintext.

import { getSupabase } from "@/lib/supabase/client";
import type { SupabaseEnv } from "@/lib/supabase/client";

export type CredentialProvider =
  | "greenhouse" | "lever" | "workday"
  | "linkedin" | "indeed" | "wellfound"
  | "generic" | "other";

export interface CredentialRecord {
  id: string;
  user_id: string;
  provider: CredentialProvider;
  label: string | null;
  username_enc: string;
  password_enc: string;
  extra_enc: string | null;
  last_used_at: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

/** Redacted shape sent to the frontend — NEVER includes plaintext. */
export interface CredentialRedacted {
  id: string;
  provider: CredentialProvider;
  label: string | null;
  username_masked: string;      // e.g. "j•••@gmail.com"
  has_password: boolean;
  has_extra: boolean;
  last_used_at: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CredentialFull extends CredentialRedacted {
  username: string;
  password: string;
  extra: Record<string, unknown> | null;
}

function maskUsername(s: string): string {
  if (!s) return "";
  if (s.includes("@")) {
    const [local, domain] = s.split("@");
    if (local.length <= 1) return `•@${domain}`;
    return `${local[0]}•••@${domain}`;
  }
  if (s.length <= 2) return "•".repeat(s.length);
  return `${s[0]}${"•".repeat(Math.max(3, s.length - 2))}${s[s.length - 1]}`;
}

export function toRedacted(r: CredentialRecord, username?: string): CredentialRedacted {
  return {
    id: r.id,
    provider: r.provider,
    label: r.label,
    username_masked: username ? maskUsername(username) : "••••••••",
    has_password: Boolean(r.password_enc),
    has_extra: Boolean(r.extra_enc),
    last_used_at: r.last_used_at,
    usage_count: r.usage_count,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

// ── In-memory store (demo / tests) ────────────────────────────────────────
const memStore = new Map<string, CredentialRecord>();

function memList(userId: string): CredentialRecord[] {
  return [...memStore.values()]
    .filter((c) => c.user_id === userId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

function memInsert(rec: CredentialRecord): CredentialRecord {
  memStore.set(rec.id, rec);
  return rec;
}

function memGet(userId: string, id: string): CredentialRecord | null {
  const r = memStore.get(id);
  return r && r.user_id === userId ? r : null;
}

function memUpdate(userId: string, id: string, patch: Partial<CredentialRecord>): CredentialRecord | null {
  const r = memGet(userId, id);
  if (!r) return null;
  Object.assign(r, patch, { updated_at: new Date().toISOString() });
  memStore.set(r.id, r);
  return r;
}

function memDelete(userId: string, id: string): boolean {
  const r = memGet(userId, id);
  if (!r) return false;
  memStore.delete(id);
  return true;
}

// ── Dispatcher ────────────────────────────────────────────────────────────
type Env = SupabaseEnv & { DEMO_MODE?: string };

function useSupabase(env: Env): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function createCredential(
  env: Env, userId: string,
  input: { provider: CredentialProvider; label?: string | null; username_enc: string; password_enc: string; extra_enc?: string | null },
): Promise<CredentialRecord> {
  if (useSupabase(env)) {
    const { data, error } = await getSupabase(env)
      .from("provider_credentials")
      .insert({
        user_id: userId,
        provider: input.provider,
        label: input.label ?? null,
        username_enc: input.username_enc,
        password_enc: input.password_enc,
        extra_enc: input.extra_enc ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(`createCredential: ${error.message}`);
    return data as CredentialRecord;
  }
  const now = new Date().toISOString();
  const rec: CredentialRecord = {
    id: crypto.randomUUID(),
    user_id: userId,
    provider: input.provider,
    label: input.label ?? null,
    username_enc: input.username_enc,
    password_enc: input.password_enc,
    extra_enc: input.extra_enc ?? null,
    last_used_at: null,
    usage_count: 0,
    created_at: now,
    updated_at: now,
  };
  return memInsert(rec);
}

export async function listCredentials(env: Env, userId: string): Promise<CredentialRecord[]> {
  if (useSupabase(env)) {
    const { data, error } = await getSupabase(env)
      .from("provider_credentials")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`listCredentials: ${error.message}`);
    return (data ?? []) as CredentialRecord[];
  }
  return memList(userId);
}

export async function getCredential(env: Env, userId: string, id: string): Promise<CredentialRecord | null> {
  if (useSupabase(env)) {
    const { data, error } = await getSupabase(env)
      .from("provider_credentials")
      .select("*")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`getCredential: ${error.message}`);
    return data as CredentialRecord | null;
  }
  return memGet(userId, id);
}

export async function updateCredential(
  env: Env, userId: string, id: string,
  patch: Partial<Pick<CredentialRecord, "label" | "username_enc" | "password_enc" | "extra_enc" | "last_used_at" | "usage_count">>,
): Promise<CredentialRecord | null> {
  if (useSupabase(env)) {
    const { data, error } = await getSupabase(env)
      .from("provider_credentials")
      .update(patch)
      .eq("user_id", userId)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`updateCredential: ${error.message}`);
    return data as CredentialRecord | null;
  }
  return memUpdate(userId, id, patch);
}

export async function deleteCredential(env: Env, userId: string, id: string): Promise<boolean> {
  if (useSupabase(env)) {
    const { error } = await getSupabase(env)
      .from("provider_credentials")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);
    if (error) throw new Error(`deleteCredential: ${error.message}`);
    return true;
  }
  return memDelete(userId, id);
}

export async function logAccess(
  env: Env, userId: string, credentialId: string,
  action: "reveal" | "use_for_apply" | "update" | "delete",
  ctx: { requestId?: string; ip?: string; ua?: string } = {},
): Promise<void> {
  if (useSupabase(env)) {
    await getSupabase(env).from("credential_access_log").insert({
      user_id: userId,
      credential_id: credentialId,
      action,
      request_id: ctx.requestId ?? null,
      ip: ctx.ip ?? null,
      user_agent: ctx.ua ?? null,
    });
  }
  // memory mode: no log (deliberately)
}
