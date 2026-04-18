import { ok, problem } from "@/lib/http/problem";
import { resolveUser } from "@/lib/auth/require-authenticated-user";
import {
  createResume,
  deleteResume,
  getResume,
  listResumes,
  updateResume,
  StudioError,
} from "@/services/studio/store";

export async function handleResumesRequest(request: Request, env: Env, match: { method: string; id?: string }): Promise<Response> {
  const auth = await resolveUser(request, env);
  if (!auth) return problem({ title: "Unauthorized", status: 401, code: "auth_required" });
  const userId = auth.id;

  try {
    if (match.method === "GET" && !match.id) {
      const resumes = await listResumes(userId);
      return ok({ resumes });
    }
    if (match.method === "GET" && match.id) {
      const r = await getResume(userId, match.id);
      if (!r) return problem({ title: "Resume not found", status: 404 });
      return ok({ resume: r });
    }
    if (match.method === "POST" && !match.id) {
      const body = await safeJson(request);
      const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "Untitled resume";
      const raw = typeof body?.raw_text === "string" ? body.raw_text : null;
      const r = await createResume(userId, name, raw);
      return ok({ resume: r }, 201);
    }
    if (match.method === "PATCH" && match.id) {
      const body = await safeJson(request);
      const r = await updateResume(userId, match.id, {
        name: typeof body?.name === "string" ? body.name : undefined,
        parsed: body && "parsed" in body ? body.parsed : undefined,
        raw_text: typeof body?.raw_text === "string" ? body.raw_text : undefined,
        is_base: typeof body?.is_base === "boolean" ? body.is_base : undefined,
      });
      if (!r) return problem({ title: "Resume not found", status: 404 });
      return ok({ resume: r });
    }
    if (match.method === "DELETE" && match.id) {
      const ok2 = await deleteResume(userId, match.id);
      if (!ok2) return problem({ title: "Resume not found", status: 404 });
      return ok({ deleted: true });
    }
    return problem({ title: "Method not allowed", status: 405 });
  } catch (e) {
    if (e instanceof StudioError) return problem({ title: e.message, status: e.status, code: e.code });
    return problem({ title: "Internal error", status: 500, detail: e instanceof Error ? e.message : String(e) });
  }
}

async function safeJson(request: Request): Promise<Record<string, unknown> | null> {
  try { return await request.json() as Record<string, unknown>; } catch { return null; }
}
