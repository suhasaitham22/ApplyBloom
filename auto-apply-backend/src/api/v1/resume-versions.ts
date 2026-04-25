// GET  /api/v1/resumes/:id/versions           → list (most recent first)
// GET  /api/v1/resumes/:id/versions/:v        → detail
// POST /api/v1/resumes/:id/versions/:v/restore → restore (creates a NEW version marked 'user')
//
// All paths require an authenticated user. Returns 404 if the resume isn't owned.

import { ok, problem } from "@/lib/http/problem";
import { resolveUser } from "@/lib/auth/require-authenticated-user";
import { getResume, updateResume } from "@/services/studio/store";
import { listVersions, getVersion, createVersion } from "@/services/resume-versions/store";
import { diffResumes, summariseDiff } from "@/services/resume-versions/diff";
import type { StructuredResume } from "@/services/structure-resume";

export async function handleResumeVersionsRequest(
  request: Request,
  env: Env,
  match: { kind: "list" | "detail" | "restore"; resumeId: string; version?: number },
): Promise<Response> {
  const auth = await resolveUser(request, env);
  if (!auth) return problem({ title: "Unauthorized", status: 401, code: "auth_required" });
  const userId = auth.id;

  // Ownership check via resume
  const resume = await getResume(env, userId, match.resumeId);
  if (!resume) return problem({ title: "Resume not found", status: 404 });

  try {
    if (match.kind === "list") {
      const versions = await listVersions(env, userId, match.resumeId);
      // Augment each with a summary diff vs the previous version
      const enriched = versions.map((v, idx) => {
        const prev = versions[idx + 1];
        const d = prev ? diffResumes(prev.parsed as StructuredResume | null, v.parsed as StructuredResume | null) : [];
        return { ...v, diff: d, diff_summary: v.change_summary ?? summariseDiff(d) };
      });
      return ok({ versions: enriched });
    }

    if (match.kind === "detail" && match.version !== undefined) {
      const v = await getVersion(env, userId, match.resumeId, match.version);
      if (!v) return problem({ title: "Version not found", status: 404 });
      return ok({ version: v });
    }

    if (match.kind === "restore" && match.version !== undefined) {
      const target = await getVersion(env, userId, match.resumeId, match.version);
      if (!target) return problem({ title: "Version not found", status: 404 });
      const beforeParsed = resume.parsed as StructuredResume | null;
      const updated = await updateResume(env, userId, match.resumeId, {
        parsed: target.parsed as unknown,
        raw_text: target.raw_text ?? undefined,
      });
      if (!updated) return problem({ title: "Restore failed", status: 500 });
      const d = diffResumes(beforeParsed, target.parsed as StructuredResume | null);
      const newVersion = await createVersion(env, {
        resume_id: match.resumeId,
        user_id: userId,
        parsed: target.parsed,
        raw_text: target.raw_text,
        created_by: "user",
        change_summary: `Restored to v${target.version}`,
        ops: null,
        message_id: null,
      });
      return ok({ resume: updated, version: newVersion, diff: d });
    }

    return problem({ title: "Method not allowed", status: 405 });
  } catch (e) {
    return problem({ title: "Internal error", status: 500, detail: e instanceof Error ? e.message : String(e) });
  }
}
