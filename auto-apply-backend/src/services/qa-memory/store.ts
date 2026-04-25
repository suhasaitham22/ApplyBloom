// Q&A memory — reusable answers to per-application custom questions, keyed by
// normalized question text and (optionally) a 384-dim embedding for semantic match.

import { getSupabase } from "@/lib/supabase/client";
import type { SupabaseEnv } from "@/lib/supabase/client";

export type QuestionType =
  | "short_text" | "long_text" | "single_choice" | "multi_choice"
  | "boolean" | "number" | "url" | "date" | "file";

export type QASource = "user" | "inferred_from_profile" | "imported";

export interface QAMemoryRecord {
  id: string;
  user_id: string;
  question_text: string;
  question_normalized: string;
  question_embedding: number[] | null;
  answer: string;
  question_type: QuestionType | null;
  source: QASource | null;
  times_used: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QAMatch {
  record: QAMemoryRecord;
  similarity: number; // cosine, 0..1
  verdict: "auto" | "suggest" | "ask"; // per decisions.md thresholds
}

export const QA_AUTO_THRESHOLD = 0.92;
export const QA_SUGGEST_THRESHOLD = 0.75;

/** Normalize question text for exact/prefix matching: lowercase, strip punct, collapse spaces. */
export function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\p{M}]/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function classifyMatch(sim: number): "auto" | "suggest" | "ask" {
  if (sim >= QA_AUTO_THRESHOLD) return "auto";
  if (sim >= QA_SUGGEST_THRESHOLD) return "suggest";
  return "ask";
}

// ── In-memory store ──────────────────────────────────────────────────────
const memStore = new Map<string, QAMemoryRecord>(); // id -> record

function memList(userId: string): QAMemoryRecord[] {
  return [...memStore.values()]
    .filter((r) => r.user_id === userId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

// ── Dispatcher ───────────────────────────────────────────────────────────
type Env = SupabaseEnv & { DEMO_MODE?: string };

function useSupabase(env: Env): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function listQA(env: Env, userId: string): Promise<QAMemoryRecord[]> {
  if (useSupabase(env)) {
    const { data, error } = await getSupabase(env)
      .from("qa_memory")
      .select("*")
      .eq("user_id", userId)
      .order("last_used_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(`listQA: ${error.message}`);
    return (data ?? []) as QAMemoryRecord[];
  }
  return memList(userId);
}

export async function upsertQA(
  env: Env, userId: string,
  input: {
    question_text: string;
    answer: string;
    question_embedding?: number[] | null;
    question_type?: QuestionType | null;
    source?: QASource | null;
  },
): Promise<QAMemoryRecord> {
  const normalized = normalizeQuestion(input.question_text);
  const now = new Date().toISOString();

  if (useSupabase(env)) {
    const { data, error } = await getSupabase(env)
      .from("qa_memory")
      .upsert({
        user_id: userId,
        question_text: input.question_text,
        question_normalized: normalized,
        question_embedding: input.question_embedding ?? null,
        answer: input.answer,
        question_type: input.question_type ?? null,
        source: input.source ?? "user",
      }, { onConflict: "user_id,question_normalized" })
      .select().single();
    if (error) throw new Error(`upsertQA: ${error.message}`);
    return data as QAMemoryRecord;
  }

  const existing = [...memStore.values()].find(
    (r) => r.user_id === userId && r.question_normalized === normalized,
  );
  if (existing) {
    Object.assign(existing, {
      question_text: input.question_text,
      question_embedding: input.question_embedding ?? existing.question_embedding,
      answer: input.answer,
      question_type: input.question_type ?? existing.question_type,
      source: input.source ?? existing.source,
      updated_at: now,
    });
    return existing;
  }
  const rec: QAMemoryRecord = {
    id: crypto.randomUUID(),
    user_id: userId,
    question_text: input.question_text,
    question_normalized: normalized,
    question_embedding: input.question_embedding ?? null,
    answer: input.answer,
    question_type: input.question_type ?? null,
    source: input.source ?? "user",
    times_used: 0,
    last_used_at: null,
    created_at: now,
    updated_at: now,
  };
  memStore.set(rec.id, rec);
  return rec;
}

export async function markQAUsed(env: Env, userId: string, id: string): Promise<void> {
  const now = new Date().toISOString();
  if (useSupabase(env)) {
    const existing = (await getSupabase(env)
      .from("qa_memory").select("times_used").eq("user_id", userId).eq("id", id).maybeSingle()).data;
    const next = (existing?.times_used ?? 0) + 1;
    await getSupabase(env)
      .from("qa_memory")
      .update({ times_used: next, last_used_at: now })
      .eq("user_id", userId).eq("id", id);
    return;
  }
  const rec = memStore.get(id);
  if (rec && rec.user_id === userId) {
    rec.times_used += 1;
    rec.last_used_at = now;
  }
}

export async function deleteQA(env: Env, userId: string, id: string): Promise<boolean> {
  if (useSupabase(env)) {
    const { error } = await getSupabase(env)
      .from("qa_memory").delete().eq("user_id", userId).eq("id", id);
    if (error) throw new Error(`deleteQA: ${error.message}`);
    return true;
  }
  const rec = memStore.get(id);
  if (!rec || rec.user_id !== userId) return false;
  memStore.delete(id);
  return true;
}

/**
 * Find the closest-matching stored answer to a new question.
 *
 * Strategy:
 *  1. Exact normalized match → similarity 1.0
 *  2. Else if embedding provided, compute cosine against every candidate with an embedding
 *  3. Else return null
 */
export async function findSimilarAnswer(
  env: Env, userId: string,
  input: { question_text: string; question_embedding?: number[] | null },
): Promise<QAMatch | null> {
  const normalized = normalizeQuestion(input.question_text);
  const all = await listQA(env, userId);

  const exact = all.find((r) => r.question_normalized === normalized);
  if (exact) {
    return { record: exact, similarity: 1, verdict: "auto" };
  }

  if (!input.question_embedding?.length) return null;

  let best: QAMatch | null = null;
  for (const rec of all) {
    if (!rec.question_embedding?.length) continue;
    const sim = cosineSimilarity(input.question_embedding, rec.question_embedding);
    if (!best || sim > best.similarity) {
      best = { record: rec, similarity: sim, verdict: classifyMatch(sim) };
    }
  }
  return best;
}

/** Test helper — memory only. */
export function __resetQAMemoryStore(): void {
  memStore.clear();
}
