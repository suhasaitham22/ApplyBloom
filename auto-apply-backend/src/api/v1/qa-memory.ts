// Q&A memory API.
//  GET    /api/v1/qa-memory             — list
//  POST   /api/v1/qa-memory             — upsert (body: {question_text, answer, question_type?})
//  POST   /api/v1/qa-memory/match       — find a stored answer for a new question
//  DELETE /api/v1/qa-memory/:id         — remove

import { ok, problem } from "@/lib/http/problem";
import { resolveUser } from "@/lib/auth/require-authenticated-user";
import {
  listQA, upsertQA, deleteQA, findSimilarAnswer, markQAUsed,
  type QuestionType, type QASource,
} from "@/services/qa-memory/store";
import { embedQuestion } from "@/services/qa-memory/embed";

const QTYPES: QuestionType[] = [
  "short_text", "long_text", "single_choice", "multi_choice",
  "boolean", "number", "url", "date", "file",
];

export type QARoute =
  | { kind: "list"; method: "GET" | "POST" }
  | { kind: "match"; method: "POST" }
  | { kind: "detail"; method: "DELETE"; id: string };

async function safeJson(req: Request): Promise<Record<string, unknown> | null> {
  try { return (await req.json()) as Record<string, unknown>; } catch { return null; }
}

export async function handleQAMemoryRequest(
  request: Request, env: Env, route: QARoute,
): Promise<Response> {
  const auth = await resolveUser(request, env);
  if (!auth) return problem({ title: "Unauthorized", status: 401, code: "auth_required" });
  const userId = auth.id;

  if (route.kind === "list") {
    if (route.method === "GET") {
      const items = await listQA(env, userId);
      return ok({ items });
    }
    const body = await safeJson(request);
    if (!body) return problem({ title: "Invalid JSON", status: 400, code: "bad_input" });
    const question_text = typeof body.question_text === "string" ? body.question_text.trim() : "";
    const answer = typeof body.answer === "string" ? body.answer : "";
    if (!question_text || !answer) {
      return problem({ title: "question_text and answer are required", status: 400, code: "bad_input" });
    }
    const question_type = typeof body.question_type === "string" && QTYPES.includes(body.question_type as QuestionType)
      ? (body.question_type as QuestionType) : null;
    const source = typeof body.source === "string"
      ? (body.source as QASource) : "user";
    const question_embedding = await embedQuestion(env, question_text).catch(() => null);
    const rec = await upsertQA(env, userId, {
      question_text, answer, question_type, source, question_embedding,
    });
    return ok({ item: rec }, 201);
  }

  if (route.kind === "match") {
    const body = await safeJson(request);
    const question_text = typeof body?.question_text === "string" ? body.question_text.trim() : "";
    if (!question_text) {
      return problem({ title: "question_text is required", status: 400, code: "bad_input" });
    }
    const question_embedding = await embedQuestion(env, question_text).catch(() => null);
    const match = await findSimilarAnswer(env, userId, { question_text, question_embedding });
    if (match && match.verdict === "auto") {
      await markQAUsed(env, userId, match.record.id);
    }
    return ok({ match });
  }

  if (route.kind === "detail" && route.method === "DELETE") {
    const okDel = await deleteQA(env, userId, route.id);
    if (!okDel) return problem({ title: "Q&A entry not found", status: 404 });
    return ok({ deleted: true });
  }

  return problem({ title: "Method not allowed", status: 405 });
}
