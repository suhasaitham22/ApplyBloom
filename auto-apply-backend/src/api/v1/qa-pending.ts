// qa_pending API.
//  GET  /api/v1/qa-pending                     — list all open (user)
//  GET  /api/v1/qa-pending?apply_id=:id        — list open for an apply
//  POST /api/v1/qa-pending/:id/answer          — record user's answer,
//                                                 also saves to qa_memory for future matches

import { ok, problem } from "@/lib/http/problem";
import { resolveUser } from "@/lib/auth/require-authenticated-user";
import {
  createQAPending, listOpenQAPending, answerQAPending,
  type CreateQAPendingInput,
} from "@/services/qa-pending/store";
import { upsertQA } from "@/services/qa-memory/store";
import { embedQuestion } from "@/services/qa-memory/embed";
import { updateApply, getApply } from "@/services/apply-queue/store";
import { emitEvent } from "@/services/session-events/store";
import { listOpenQAPending as listOpen } from "@/services/qa-pending/store";

export type QAPendingRoute =
  | { kind: "list"; method: "GET" | "POST" }
  | { kind: "answer"; method: "POST"; id: string };

async function safeJson(req: Request): Promise<Record<string, unknown> | null> {
  try { return (await req.json()) as Record<string, unknown>; } catch { return null; }
}

export async function handleQAPendingRequest(
  request: Request, env: Env, route: QAPendingRoute,
): Promise<Response> {
  const auth = await resolveUser(request, env);
  if (!auth) return problem({ title: "Unauthorized", status: 401, code: "auth_required" });
  const userId = auth.id;

  try {
    if (route.kind === "list") {
      if (route.method === "GET") {
        const url = new URL(request.url);
        const applyId = url.searchParams.get("apply_id") ?? undefined;
        const items = await listOpenQAPending(env, userId, applyId);
        return ok({ items });
      }
      // POST = create (primarily used by the extension when it hits a novel question)
      const body = await safeJson(request);
      const apply_id = typeof body?.apply_id === "string" ? body.apply_id : "";
      const question_text = typeof body?.question_text === "string" ? body.question_text.trim() : "";
      if (!apply_id || !question_text) {
        return problem({ title: "apply_id and question_text required", status: 400, code: "bad_input" });
      }
      const apply = await getApply(env, userId, apply_id);
      if (!apply) return problem({ title: "Apply not found", status: 404 });

      const input: CreateQAPendingInput = {
        apply_id,
        session_id: apply.session_id,
        question_text,
        question_type: body?.question_type as CreateQAPendingInput["question_type"] ?? null,
        options: body?.options as CreateQAPendingInput["options"] ?? null,
        suggested_answer: typeof body?.suggested_answer === "string" ? body.suggested_answer : null,
        suggested_verdict: body?.suggested_verdict as CreateQAPendingInput["suggested_verdict"] ?? null,
      };
      const rec = await createQAPending(env, userId, input);
      await updateApply(env, userId, apply_id, { status: "needs_input" });
      await emitEvent(env, userId, {
        session_id: apply.session_id, apply_id, kind: "qa_asked",
        payload: { question_text, qa_pending_id: rec.id },
      });
      return ok({ item: rec }, 201);
    }

    if (route.kind === "answer") {
      const body = await safeJson(request);
      const answer = typeof body?.answer === "string" ? body.answer : "";
      if (!answer.trim()) return problem({ title: "answer is required", status: 400, code: "bad_input" });
      const rec = await answerQAPending(env, userId, route.id, answer);
      if (!rec) return problem({ title: "Pending Q&A not found", status: 404 });

      // Persist to qa_memory so future forms get auto-answered.
      try {
        const embedding = await embedQuestion(env, rec.question_text);
        await upsertQA(env, userId, {
          question_text: rec.question_text,
          answer,
          question_type: rec.question_type,
          source: "user",
          question_embedding: embedding,
        });
      } catch {
        // Non-fatal: the answer is saved on qa_pending, we just missed the memory write.
      }

      // If this was the last open question for the apply, flip it back to running.
      const stillOpen = await listOpen(env, userId, rec.apply_id);
      if (stillOpen.length === 0) {
        await updateApply(env, userId, rec.apply_id, { status: "running" });
      }

      await emitEvent(env, userId, {
        session_id: rec.session_id, apply_id: rec.apply_id, kind: "qa_answered",
        payload: { qa_pending_id: rec.id, answer },
      });

      return ok({ item: rec });
    }

    return problem({ title: "Method not allowed", status: 405 });
  } catch (e) {
    return problem({
      title: "qa-pending error", status: 500,
      detail: e instanceof Error ? e.message : String(e),
    });
  }
}
