import { ok, problem } from "@/lib/http/problem";
import { resolveUser } from "@/lib/auth/require-authenticated-user";
import { createResume, updateResume, StudioError } from "@/services/studio/store";
import { getResumeStorage } from "@/lib/storage/resume-storage";

// POST /api/v1/resumes/upload — multipart/form-data with "file" + optional "name" + optional "replace_resume_id"
export async function handleUploadResumeRequest(request: Request, env: Env): Promise<Response> {
  const auth = await resolveUser(request, env);
  if (!auth) return problem({ title: "Unauthorized", status: 401, code: "auth_required" });
  const userId = auth.id;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return problem({ title: "file field required", status: 400 });

    const name = (typeof form.get("name") === "string" && (form.get("name") as string).trim())
      ? (form.get("name") as string).trim()
      : file.name.replace(/\.[^.]+$/, "");
    const replaceResumeId = typeof form.get("replace_resume_id") === "string"
      ? (form.get("replace_resume_id") as string)
      : null;

    const bytes = await file.arrayBuffer();
    const storage = getResumeStorage(env);

    // If replacing, reuse the same resume id in storage path; otherwise create fresh.
    const targetId = replaceResumeId ?? `pending_${Date.now()}`;
    const stored = await storage.put({
      userId,
      resumeId: targetId,
      filename: file.name || "resume",
      contentType: file.type || "application/octet-stream",
      data: bytes,
    });

    if (replaceResumeId) {
      const r = await updateResume(env, userId, replaceResumeId, {
        name,
        storage_path: stored.storage_path,
        file_type: stored.file_type,
      });
      if (!r) return problem({ title: "Resume not found", status: 404 });
      return ok({ resume: r, storage: stored });
    }

    const r = await createResume(env, userId, {
      name,
      storage_path: stored.storage_path,
      file_type: stored.file_type,
    });
    return ok({ resume: r, storage: stored }, 201);
  } catch (e) {
    if (e instanceof StudioError) return problem({ title: e.message, status: e.status, code: e.code });
    return problem({ title: "Upload failed", status: 500, detail: e instanceof Error ? e.message : String(e) });
  }
}
