// qa_pending store — novel Q&A questions surfaced by the extension during an apply.
// When at least one qa_pending row is open for an apply, the apply's status flips to
// 'needs_input' until the user answers (from chat or dashboard).

import { getSupabase } from "@/lib/supabase/client";
import type { SupabaseEnv } from "@/lib/supabase/client";

export type QAPendingType =
  | "short_text" | "long_text" | "single_choice" | "multi_choice"
  | "boolean" | "number" | "url" | "date" | "file";

export type QAPendingVerdict = "auto" | "suggest" | "ask";

export interface QAPendingRecord {
  id: string;
  user_id: string;
  apply_id: string;
  session_id: string | null;
  question_text: string;
  question_type: QAPendingType | null;
  options: { value: string; label: string }[] | null;
  suggested_answer: string | null;
  suggested_verdict: QAPendingVerdict | null;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

export interface CreateQAPendingInput {
  apply_id: string;
  session_id: string | null;
  question_text: string;
  question_type?: QAPendingType | null;
  options?: { value: string; label: string }[] | null;
  suggested_answer?: string | null;
  suggested_verdict?: QAPendingVerdict | null;
}

const mem = new Map<string, QAPendingRecord>();

type Env = SupabaseEnv & { DEMO_MODE?: string };
function useSupabase(env: Env): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function createQAPending(
  env: Env, userId: string, input: CreateQAPendingInput,
): Promise<QAPendingRecord> {
  const now = new Date().toISOString();
  if (useSupabase(env)) {
    const { data, error } = await getSupabase(env).from("qa_pending").insert({
      user_id: userId,
      apply_id: input.apply_id,
      session_id: input.session_id,
      question_text: input.question_text,
      question_type: input.question_type ?? null,
      options: input.options ?? null,
      suggested_answer: input.suggested_answer ?? null,
      suggested_verdict: input.suggested_verdict ?? null,
    }).select().single();
    if (error) throw new Error(`createQAPending: ${error.message}`);
    return data as QAPendingRecord;
  }
  const rec: QAPendingRecord = {
    id: crypto.randomUUID(),
    user_id: userId,
    apply_id: input.apply_id,
    session_id: input.session_id,
    question_text: input.question_text,
    question_type: input.question_type ?? null,
    options: input.options ?? null,
    suggested_answer: input.suggested_answer ?? null,
    suggested_verdict: input.suggested_verdict ?? null,
    answer: null,
    answered_at: null,
    created_at: now,
  };
  mem.set(rec.id, rec);
  return rec;
}

export async function listOpenQAPending(
  env: Env, userId: string, applyId?: string,
): Promise<QAPendingRecord[]> {
  if (useSupabase(env)) {
    let q = getSupabase(env).from("qa_pending").select("*")
      .eq("user_id", userId).is("answered_at", null);
    if (applyId) q = q.eq("apply_id", applyId);
    const { data, error } = await q.order("created_at", { ascending: true });
    if (error) throw new Error(`listOpenQAPending: ${error.message}`);
    return (data ?? []) as QAPendingRecord[];
  }
  return [...mem.values()]
    .filter((r) => r.user_id === userId && r.answered_at === null && (!applyId || r.apply_id === applyId))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function answerQAPending(
  env: Env, userId: string, id: string, answer: string,
): Promise<QAPendingRecord | null> {
  const now = new Date().toISOString();
  if (useSupabase(env)) {
    const { data, error } = await getSupabase(env).from("qa_pending")
      .update({ answer, answered_at: now })
      .eq("user_id", userId).eq("id", id).select().maybeSingle();
    if (error) throw new Error(`answerQAPending: ${error.message}`);
    return data as QAPendingRecord | null;
  }
  const r = mem.get(id);
  if (!r || r.user_id !== userId) return null;
  r.answer = answer;
  r.answered_at = now;
  return r;
}

export function __resetQAPendingStore(): void { mem.clear(); }
