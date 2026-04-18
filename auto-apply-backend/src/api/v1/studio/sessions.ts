import { ok, problem } from "@/lib/http/problem";
import { resolveUser } from "@/lib/auth/require-authenticated-user";
import {
  createSession,
  getSession,
  listSessions,
  listMessages,
  appendMessage,
  startSession,
  pauseSession,
  resumeSession,
  cancelSession,
  completeSession,
  updateSession,
  getResume,
  updateResume,
  StudioError,
} from "@/services/studio/store";
import { structureResume, type StructuredResume } from "@/services/structure-resume";
import { tailorResumeForJob } from "@/services/tailor-resume-llm";
import { chatWithResume, applyOperations } from "@/services/chat-with-resume";

type Route =
  | { kind: "list"; method: "GET" | "POST" }
  | { kind: "detail"; method: "GET" | "PATCH"; id: string }
  | { kind: "messages"; method: "GET" | "POST"; id: string }
  | { kind: "lock"; method: "POST"; id: string }
  | { kind: "parse"; method: "POST"; id: string }
  | { kind: "tailor"; method: "POST"; id: string }
  | { kind: "apply"; method: "POST"; id: string }
  | { kind: "start"; method: "POST"; id: string }
  | { kind: "pause"; method: "POST"; id: string }
  | { kind: "resume"; method: "POST"; id: string }
  | { kind: "cancel"; method: "POST"; id: string };

export async function handleSessionsRequest(request: Request, env: Env, route: Route): Promise<Response> {
  const auth = await resolveUser(request, env);
  if (!auth) return problem({ title: "Unauthorized", status: 401, code: "auth_required" });
  const userId = auth.id;

  try {
    switch (route.kind) {
      case "list":
        if (route.method === "GET") {
          const sessions = await listSessions(env, userId);
          return ok({ sessions });
        }
        if (route.method === "POST") {
          const body = await safeJson(request);
          const s = await createSession(env, userId, {
            resume_id: typeof body?.resume_id === "string" ? body.resume_id : null,
            mode: body?.mode === "auto" ? "auto" : "single",
            title: typeof body?.title === "string" ? body.title : undefined,
          });
          return ok({ session: s }, 201);
        }
        break;

      case "detail": {
        const s = await getSession(env, userId, route.id);
        if (!s) return problem({ title: "Session not found", status: 404 });
        if (route.method === "GET") {
          const messages = await listMessages(env, route.id);
          return ok({ session: s, messages });
        }
        if (route.method === "PATCH") {
          const body = await safeJson(request);
          const updated = await updateSession(env, userId, route.id, {
            title: typeof body?.title === "string" ? body.title : undefined,
            resume_id: typeof body?.resume_id === "string" ? body.resume_id : undefined,
            mode: body?.mode === "auto" ? "auto" : body?.mode === "single" ? "single" : undefined,
            job: body && "job" in body ? (body.job as any) : undefined,
            status: typeof body?.status === "string" ? (body.status as any) : undefined,
          });
          return ok({ session: updated });
        }
        break;
      }

      case "messages": {
        if (route.method === "GET") {
          const messages = await listMessages(env, route.id);
          return ok({ messages });
        }
        if (route.method === "POST") {
          const body = await safeJson(request);
          const content = typeof body?.content === "string" ? body.content : "";
          if (!content.trim()) return problem({ title: "Content required", status: 400 });
          const m = await appendMessage(env, userId, route.id, { role: "user", content });

          const s = await getSession(env, userId, route.id);
          if (!s) return problem({ title: "Session not found", status: 404 });

          // Load attached resume (if any) to give the assistant real context
          let resume: StructuredResume | null = null;
          let resumeRecord = s.resume_id ? await getResume(env, userId, s.resume_id) : null;
          if (resumeRecord?.parsed) resume = resumeRecord.parsed as StructuredResume;

          // If no resume linked, reply with guidance only
          if (!resume) {
            const reply = noResumeReply(content, s);
            const assistantMsg = await appendMessage(env, userId, route.id, {
              role: "assistant",
              content: reply,
            });
            return ok({ messages: [m, assistantMsg] }, 201);
          }

          // Call chat-with-resume (LLM via AI SDK tools, or heuristic fallback)
          const history = (await listMessages(env, route.id))
            .filter((msg) => msg.role === "user" || msg.role === "assistant")
            .slice(-10)
            .map((msg) => ({ role: msg.role as "user" | "assistant", content: msg.content }));

          const chat = await chatWithResume(
            { resume, messages: history, instruction: content },
            env,
          );

          // Apply operations to the resume and persist
          const createdMsgs: Array<Awaited<ReturnType<typeof appendMessage>>> = [];
          if (chat.operations.length > 0 && resumeRecord) {
            const updated = applyOperations(resume, chat.operations);
            await updateResume(env, userId, resumeRecord.id, { parsed: updated });
            for (const op of chat.operations) {
              const actionMsg = await appendMessage(env, userId, route.id, {
                role: "action",
                content: describeOp(op),
                action_type: op.op,
                action_payload: op,
                model: chat.meta.model,
                prompt_version: chat.meta.prompt_version,
              });
              createdMsgs.push(actionMsg);
            }
          }

          const assistantMsg = await appendMessage(env, userId, route.id, {
            role: "assistant",
            content: chat.assistant_message,
            thinking: chat.thinking ?? null,
            model: chat.meta.model,
            prompt_version: chat.meta.prompt_version,
            tokens_input: chat.meta.tokens_input,
            tokens_output: chat.meta.tokens_output,
            latency_ms: chat.meta.latency_ms,
          });
          return ok({ messages: [m, ...createdMsgs, assistantMsg] }, 201);
        }
        break;
      }

      case "lock":
      case "start": {
        const s = await startSession(env, userId, route.id);
        if (!s) return problem({ title: "Session not found", status: 404 });
        return ok({ session: s });
      }
      case "pause": {
        const s = await pauseSession(env, userId, route.id);
        if (!s) return problem({ title: "Session not found", status: 404 });
        return ok({ session: s });
      }
      case "resume": {
        const s = await resumeSession(env, userId, route.id);
        if (!s) return problem({ title: "Session not found", status: 404 });
        return ok({ session: s });
      }
      case "cancel": {
        const s = await cancelSession(env, userId, route.id);
        if (!s) return problem({ title: "Session not found", status: 404 });
        return ok({ session: s });
      }

      case "parse": {
        const body = await safeJson(request);
        const text = typeof body?.resume_text === "string" ? body.resume_text : "";
        if (!text.trim()) return problem({ title: "resume_text required", status: 400 });
        const result = await structureResume(text, env);
        await appendMessage(env, userId, route.id, {
          role: "action",
          content: "Resume parsed",
          action_type: "resume_parsed",
          action_payload: result,
        });
        return ok(result);
      }

      case "tailor": {
        const s = await getSession(env, userId, route.id);
        if (!s || !s.job) return problem({ title: "Session has no job set", status: 400 });
        const body = await safeJson(request);
        const resume = body?.resume as StructuredResume | undefined;
        if (!resume) return problem({ title: "resume (structured) required", status: 400 });
        const tailored = await tailorResumeForJob(
          { resume, job: { title: s.job.title ?? "", company: s.job.company, description: s.job.description ?? "", url: s.job.url } },
          env,
        );
        await appendMessage(env, userId, route.id, {
          role: "action",
          content: "Resume tailored",
          action_type: "resume_tailored",
          action_payload: tailored,
        });
        return ok(tailored);
      }

      case "apply": {
        let s = await startSession(env, userId, route.id);
        if (!s) return problem({ title: "Session not found", status: 404 });
        await appendMessage(env, userId, route.id, {
          role: "action",
          content: "Application submitted",
          action_type: "application_submitted",
          action_payload: { job: s.job },
        }, { bypassLock: true });
        s = await completeSession(env, userId, route.id);
        return ok({ submitted: true, session: s });
      }
    }
    return problem({ title: "Method not allowed", status: 405 });
  } catch (e) {
    if (e instanceof StudioError) return problem({ title: e.message, status: e.status, code: e.code });
    return problem({ title: "Internal error", status: 500, detail: e instanceof Error ? e.message : String(e) });
  }
}

function noResumeReply(userMessage: string, session: { job: { title?: string } | null }): string {
  const lower = userMessage.toLowerCase();
  if (lower.includes("resume") || lower.includes("upload")) {
    return "Click \"Add resume\" at the top to upload a PDF, DOCX, or TXT — I parse it and then we can edit together.";
  }
  if (session.job?.title) {
    return `I see the job (${session.job.title}) but no resume yet. Click \"Add resume\" to upload one — then I can tailor it for this role.`;
  }
  return "Upload a resume first (click \"Add resume\" above), then I can help you edit it, improve ATS score, and tailor it to a job.";
}

function describeOp(op: { op: string; value?: unknown; heading?: string; index?: number }): string {
  switch (op.op) {
    case "replace_summary": return "Updated summary";
    case "replace_headline": return "Updated headline";
    case "set_skills": return `Set skills (${Array.isArray(op.value) ? (op.value as string[]).length : 0} total)`;
    case "add_skills": return `Added skills: ${Array.isArray(op.value) ? (op.value as string[]).join(", ") : ""}`;
    case "remove_skills": return `Removed skills: ${Array.isArray(op.value) ? (op.value as string[]).join(", ") : ""}`;
    case "rewrite_bullet": return `Rewrote bullet #${(op.index ?? 0) + 1} in "${op.heading ?? ""}"`;
    case "add_bullet": return `Added bullet to "${op.heading ?? ""}"`;
    default: return op.op;
  }
}

async function safeJson(request: Request): Promise<Record<string, unknown> | null> {
  try { return await request.json() as Record<string, unknown>; } catch { return null; }
}
