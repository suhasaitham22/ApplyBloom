import { ok, problem } from "@/lib/http/problem";
import { resolveUser } from "@/lib/auth/require-authenticated-user";
import {
  createSession,
  getSession,
  listSessions,
  listMessages,
  appendMessage,
  lockSession,
  updateSession,
  StudioError,
} from "@/services/studio/store";
import { structureResume, type StructuredResume } from "@/services/structure-resume";
import { tailorResumeForJob } from "@/services/tailor-resume-llm";
import { chatWithResume } from "@/services/chat-with-resume";

type Route =
  | { kind: "list"; method: "GET" | "POST" }
  | { kind: "detail"; method: "GET" | "PATCH"; id: string }
  | { kind: "messages"; method: "GET" | "POST"; id: string }
  | { kind: "lock"; method: "POST"; id: string }
  | { kind: "parse"; method: "POST"; id: string }
  | { kind: "tailor"; method: "POST"; id: string }
  | { kind: "apply"; method: "POST"; id: string };

export async function handleSessionsRequest(request: Request, env: Env, route: Route): Promise<Response> {
  const auth = await resolveUser(request, env);
  if (!auth) return problem({ title: "Unauthorized", status: 401, code: "auth_required" });
  const userId = auth.id;

  try {
    switch (route.kind) {
      case "list":
        if (route.method === "GET") {
          const sessions = await listSessions(userId);
          return ok({ sessions });
        }
        if (route.method === "POST") {
          const body = await safeJson(request);
          const s = await createSession(userId, {
            resume_id: typeof body?.resume_id === "string" ? body.resume_id : null,
            mode: body?.mode === "auto" ? "auto" : "single",
            title: typeof body?.title === "string" ? body.title : undefined,
          });
          return ok({ session: s }, 201);
        }
        break;

      case "detail": {
        const s = await getSession(userId, route.id);
        if (!s) return problem({ title: "Session not found", status: 404 });
        if (route.method === "GET") {
          const messages = await listMessages(route.id);
          return ok({ session: s, messages });
        }
        if (route.method === "PATCH") {
          const body = await safeJson(request);
          const updated = await updateSession(userId, route.id, {
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
          const messages = await listMessages(route.id);
          return ok({ messages });
        }
        if (route.method === "POST") {
          const body = await safeJson(request);
          const content = typeof body?.content === "string" ? body.content : "";
          if (!content.trim()) return problem({ title: "Content required", status: 400 });
          const m = await appendMessage(userId, route.id, {
            role: "user",
            content,
          });
          // Fire assistant reply synchronously (in-memory, deterministic for demo mode)
          const s = await getSession(userId, route.id);
          if (!s) return problem({ title: "Session not found", status: 404 });
          const reply = await assistantReply(env, content, s);
          const assistantMsg = await appendMessage(userId, route.id, {
            role: "assistant",
            content: reply.content,
            action_type: reply.action_type,
            action_payload: reply.action_payload,
          });
          return ok({ messages: [m, assistantMsg] }, 201);
        }
        break;
      }

      case "lock": {
        const s = await lockSession(userId, route.id);
        if (!s) return problem({ title: "Session not found", status: 404 });
        return ok({ session: s });
      }

      case "parse": {
        const body = await safeJson(request);
        const text = typeof body?.resume_text === "string" ? body.resume_text : "";
        if (!text.trim()) return problem({ title: "resume_text required", status: 400 });
        const result = await structureResume(text, env);
        await appendMessage(userId, route.id, {
          role: "action",
          content: "Resume parsed",
          action_type: "resume_parsed",
          action_payload: result,
        });
        return ok(result);
      }

      case "tailor": {
        const s = await getSession(userId, route.id);
        if (!s || !s.job) return problem({ title: "Session has no job set", status: 400 });
        const body = await safeJson(request);
        const resume = body?.resume as StructuredResume | undefined;
        if (!resume) return problem({ title: "resume (structured) required", status: 400 });
        const tailored = await tailorResumeForJob(
          { resume, job: { title: s.job.title ?? "", company: s.job.company, description: s.job.description ?? "", url: s.job.url } },
          env,
        );
        await appendMessage(userId, route.id, {
          role: "action",
          content: "Resume tailored",
          action_type: "resume_tailored",
          action_payload: tailored,
        });
        return ok(tailored);
      }

      case "apply": {
        const s = await lockSession(userId, route.id);
        if (!s) return problem({ title: "Session not found", status: 404 });
        await appendMessage(userId, route.id, {
          role: "action",
          content: "Application submitted",
          action_type: "application_submitted",
          action_payload: { job: s.job },
        }, { bypassLock: true });
        await updateSession(userId, route.id, { status: "completed" });
        return ok({ submitted: true, session: await getSession(userId, route.id) });
      }
    }
    return problem({ title: "Method not allowed", status: 405 });
  } catch (e) {
    if (e instanceof StudioError) return problem({ title: e.message, status: e.status, code: e.code });
    return problem({ title: "Internal error", status: 500, detail: e instanceof Error ? e.message : String(e) });
  }
}

async function assistantReply(_env: Env, userMessage: string, session: { job: { description?: string; title?: string } | null }) {
  const lower = userMessage.toLowerCase();
  if (lower.includes("tailor")) {
    return { content: "Sure — paste the job description in the Job tab or here, then hit Tailor.", action_type: undefined as string | undefined, action_payload: undefined };
  }
  if (lower.includes("apply")) {
    return { content: "Once your resume and job are ready, click Apply. This locks the session.", action_type: undefined as string | undefined, action_payload: undefined };
  }
  if (session.job?.title) {
    return { content: `Got it. Working on "${session.job.title}" — what would you like to emphasise?`, action_type: undefined, action_payload: undefined };
  }
  return { content: "Got it. Upload a resume or paste a job description to get started.", action_type: undefined, action_payload: undefined };
}

async function safeJson(request: Request): Promise<Record<string, unknown> | null> {
  try { return await request.json() as Record<string, unknown>; } catch { return null; }
}
