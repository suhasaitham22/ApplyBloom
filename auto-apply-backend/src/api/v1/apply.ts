// Apply queue API.
//
// User-facing (frontend + chat):
//   POST   /api/v1/apply                     enqueue one
//   GET    /api/v1/apply                     list (filter by status, session_id)
//   GET    /api/v1/apply/:id                 detail
//   POST   /api/v1/apply/:id/pause
//   POST   /api/v1/apply/:id/cancel
//
// Extension-facing (long-poll + report):
//   POST   /api/v1/apply/claim               atomically claim one queued row
//   POST   /api/v1/apply/:id/report          step / screenshot / status report

import { ok, problem } from "@/lib/http/problem";
import { resolveUser } from "@/lib/auth/require-authenticated-user";
import {
  enqueueApply, listApplies, getApply, claimNext, updateApply,
  appendAttemptLog, appendScreenshotUrl,
  type ApplyStatus, type ApplyRecord,
} from "@/services/apply-queue/store";
import { emitEvent, type SessionEventKind } from "@/services/session-events/store";

export type ApplyRoute =
  | { kind: "list"; method: "GET" | "POST" }
  | { kind: "claim"; method: "POST" }
  | { kind: "detail"; method: "GET"; id: string }
  | { kind: "pause" | "cancel" | "report"; method: "POST"; id: string };

async function safeJson(req: Request): Promise<Record<string, unknown> | null> {
  try { return (await req.json()) as Record<string, unknown>; } catch { return null; }
}

function stringOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

async function emitForApply(
  env: Env, userId: string, apply: ApplyRecord, kind: SessionEventKind,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    await emitEvent(env, userId, {
      session_id: apply.session_id,
      apply_id: apply.id,
      kind,
      payload: { apply_url: apply.apply_url, job_title: apply.job_title, company: apply.company, ...payload },
    });
  } catch {
    // Non-fatal — SSE is a nice-to-have, persistent state is in apply_queue.
  }
}

export async function handleApplyRequest(
  request: Request, env: Env, route: ApplyRoute,
): Promise<Response> {
  const auth = await resolveUser(request, env);
  if (!auth) return problem({ title: "Unauthorized", status: 401, code: "auth_required" });
  const userId = auth.id;

  try {
    if (route.kind === "list") {
      if (route.method === "GET") {
        const url = new URL(request.url);
        const statusParam = url.searchParams.getAll("status");
        const sessionId = url.searchParams.get("session_id") ?? undefined;
        const status = statusParam.length ? (statusParam as ApplyStatus[]) : undefined;
        const items = await listApplies(env, userId, { status, session_id: sessionId });
        return ok({ items });
      }
      // POST = enqueue
      const body = await safeJson(request);
      const apply_url = stringOrNull(body?.apply_url);
      if (!apply_url) return problem({ title: "apply_url is required", status: 400, code: "bad_input" });
      const rec = await enqueueApply(env, userId, {
        session_id: stringOrNull(body?.session_id),
        apply_url,
        job_title: stringOrNull(body?.job_title) ?? undefined,
        company: stringOrNull(body?.company) ?? undefined,
        resume_id: stringOrNull(body?.resume_id),
        credential_id: stringOrNull(body?.credential_id),
        dry_run: Boolean(body?.dry_run),
        priority: typeof body?.priority === "number" ? body.priority : 0,
      });
      await emitForApply(env, userId, rec, "apply_queued");
      return ok({ item: rec }, 201);
    }

    if (route.kind === "claim") {
      const body = await safeJson(request);
      const deviceId = stringOrNull(body?.device_id) ?? "unknown";
      const rec = await claimNext(env, userId, deviceId);
      if (!rec) return ok({ item: null });
      await emitForApply(env, userId, rec, "apply_claimed", { device_id: deviceId });
      return ok({ item: rec });
    }

    if (route.kind === "detail") {
      const rec = await getApply(env, userId, route.id);
      if (!rec) return problem({ title: "Apply not found", status: 404 });
      return ok({ item: rec });
    }

    if (route.kind === "pause") {
      const rec = await getApply(env, userId, route.id);
      if (!rec) return problem({ title: "Apply not found", status: 404 });
      const updated = await updateApply(env, userId, route.id, { status: "paused" });
      if (updated) await emitForApply(env, userId, updated, "apply_cancelled", { reason: "user_paused" });
      return ok({ item: updated });
    }

    if (route.kind === "cancel") {
      const rec = await getApply(env, userId, route.id);
      if (!rec) return problem({ title: "Apply not found", status: 404 });
      const updated = await updateApply(env, userId, route.id, {
        status: "cancelled", finished_at: new Date().toISOString(),
      });
      if (updated) await emitForApply(env, userId, updated, "apply_cancelled", { reason: "user_cancelled" });
      return ok({ item: updated });
    }

    if (route.kind === "report") {
      const body = await safeJson(request);
      const rec = await getApply(env, userId, route.id);
      if (!rec) return problem({ title: "Apply not found", status: 404 });

      const kind = stringOrNull(body?.kind);
      if (!kind) return problem({ title: "report kind is required", status: 400, code: "bad_input" });

      switch (kind) {
        case "step": {
          const step = stringOrNull(body?.step) ?? "unknown";
          const note = stringOrNull(body?.note) ?? undefined;
          await appendAttemptLog(env, userId, route.id, step, note);
          await emitForApply(env, userId, rec, "apply_step", { step, note });
          return ok({ ok: true });
        }
        case "screenshot": {
          const url = stringOrNull(body?.url);
          if (!url) return problem({ title: "url required", status: 400 });
          await appendScreenshotUrl(env, userId, route.id, url);
          await emitForApply(env, userId, rec, "apply_screenshot", { url });
          return ok({ ok: true });
        }
        case "running": {
          const updated = await updateApply(env, userId, route.id, {
            status: "running", started_at: rec.started_at ?? new Date().toISOString(),
          });
          if (updated) await emitForApply(env, userId, updated, "apply_running");
          return ok({ item: updated });
        }
        case "submitted": {
          const updated = await updateApply(env, userId, route.id, {
            status: "submitted", finished_at: new Date().toISOString(),
          });
          if (updated) await emitForApply(env, userId, updated, "apply_submitted");
          return ok({ item: updated });
        }
        case "failed": {
          const err = stringOrNull(body?.error) ?? "unknown error";
          const updated = await updateApply(env, userId, route.id, {
            status: "failed", error: err, finished_at: new Date().toISOString(),
          });
          if (updated) await emitForApply(env, userId, updated, "apply_failed", { error: err });
          return ok({ item: updated });
        }
        case "needs_input": {
          const updated = await updateApply(env, userId, route.id, { status: "needs_input" });
          if (updated) await emitForApply(env, userId, updated, "apply_needs_input");
          return ok({ item: updated });
        }
        default:
          return problem({ title: `unknown report kind: ${kind}`, status: 400, code: "bad_input" });
      }
    }

    return problem({ title: "Method not allowed", status: 405 });
  } catch (e) {
    return problem({
      title: "Apply error", status: 500,
      detail: e instanceof Error ? e.message : String(e),
    });
  }
}
