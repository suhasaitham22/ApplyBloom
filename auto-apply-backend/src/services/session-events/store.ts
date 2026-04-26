// session_events — append-only log that feeds the SSE stream.
// Chat messages stay in chat_messages; this is just automation status.

import { getSupabase } from "@/lib/supabase/client";
import type { SupabaseEnv } from "@/lib/supabase/client";

export type SessionEventKind =
  | "apply_queued" | "apply_claimed" | "apply_running" | "apply_step"
  | "apply_screenshot" | "apply_needs_input" | "apply_submitted"
  | "apply_failed" | "apply_cancelled"
  | "qa_asked" | "qa_answered";

export interface SessionEvent {
  id: string;
  user_id: string;
  session_id: string | null;
  apply_id: string | null;
  kind: SessionEventKind;
  payload: Record<string, unknown>;
  created_at: string;
}

const mem: SessionEvent[] = [];

type Env = SupabaseEnv & { DEMO_MODE?: string };
function useSupabase(env: Env): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function emitEvent(
  env: Env, userId: string, input: {
    session_id: string | null;
    apply_id: string | null;
    kind: SessionEventKind;
    payload?: Record<string, unknown>;
  },
): Promise<SessionEvent> {
  const now = new Date().toISOString();
  if (useSupabase(env)) {
    const { data, error } = await getSupabase(env).from("session_events").insert({
      user_id: userId,
      session_id: input.session_id,
      apply_id: input.apply_id,
      kind: input.kind,
      payload: input.payload ?? {},
    }).select().single();
    if (error) throw new Error(`emitEvent: ${error.message}`);
    return data as SessionEvent;
  }
  const rec: SessionEvent = {
    id: crypto.randomUUID(),
    user_id: userId,
    session_id: input.session_id,
    apply_id: input.apply_id,
    kind: input.kind,
    payload: input.payload ?? {},
    created_at: now,
  };
  mem.push(rec);
  return rec;
}

/**
 * List events for a session newer than `since` (ISO timestamp).
 * Used by the SSE endpoint to replay any events the client missed while disconnected.
 */
export async function listEventsSince(
  env: Env, userId: string,
  filter: { session_id?: string; apply_id?: string; since?: string; limit?: number },
): Promise<SessionEvent[]> {
  const limit = filter.limit ?? 200;
  if (useSupabase(env)) {
    let q = getSupabase(env).from("session_events").select("*").eq("user_id", userId);
    if (filter.session_id) q = q.eq("session_id", filter.session_id);
    if (filter.apply_id) q = q.eq("apply_id", filter.apply_id);
    if (filter.since) q = q.gt("created_at", filter.since);
    const { data, error } = await q.order("created_at", { ascending: true }).limit(limit);
    if (error) throw new Error(`listEventsSince: ${error.message}`);
    return (data ?? []) as SessionEvent[];
  }
  return mem
    .filter((e) => e.user_id === userId)
    .filter((e) => !filter.session_id || e.session_id === filter.session_id)
    .filter((e) => !filter.apply_id || e.apply_id === filter.apply_id)
    .filter((e) => !filter.since || e.created_at > filter.since)
    .slice(-limit);
}

export function __resetSessionEventsStore(): void { mem.length = 0; }
