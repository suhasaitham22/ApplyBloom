// User profile API — GET (redacted view) / PUT (upsert).
// EEO values, if provided, are encrypted server-side before storage.

import { ok, problem } from "@/lib/http/problem";
import { resolveUser } from "@/lib/auth/require-authenticated-user";
import { encrypt } from "@/lib/crypto/aes-gcm";
import {
  getProfile, upsertProfile, toPublic, isProfileComplete, REQUIRED_PROFILE_FIELDS,
  type UserProfilePatch, type WorkAuth,
} from "@/services/user-profile/store";

const WORK_AUTHS: WorkAuth[] = [
  "citizen", "green_card", "h1b", "opt", "stem_opt", "needs_sponsorship", "other",
];

async function safeJson(req: Request): Promise<Record<string, unknown> | null> {
  try { return (await req.json()) as Record<string, unknown>; } catch { return null; }
}

function str(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === "string") return v;
  return undefined;
}
function bool(v: unknown): boolean | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === "boolean") return v;
  return undefined;
}
function num(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return undefined;
}

export async function handleProfileRequest(request: Request, env: Env): Promise<Response> {
  const auth = await resolveUser(request, env);
  if (!auth) return problem({ title: "Unauthorized", status: 401, code: "auth_required" });
  const userId = auth.id;

  if (request.method === "GET") {
    const rec = await getProfile(env, userId);
    return ok({
      profile: rec ? toPublic(rec) : null,
      complete: isProfileComplete(rec),
      required_fields: REQUIRED_PROFILE_FIELDS,
    });
  }

  if (request.method === "PUT" || request.method === "PATCH") {
    const body = await safeJson(request);
    if (!body) return problem({ title: "Invalid JSON", status: 400, code: "bad_input" });

    const patch: UserProfilePatch = {};
    const assignStr = (k: keyof UserProfilePatch) => {
      const v = str(body[k]); if (v !== undefined) (patch as Record<string, unknown>)[k] = v;
    };
    const assignBool = (k: keyof UserProfilePatch) => {
      const v = bool(body[k]); if (v !== undefined) (patch as Record<string, unknown>)[k] = v;
    };
    const assignNum = (k: keyof UserProfilePatch) => {
      const v = num(body[k]); if (v !== undefined) (patch as Record<string, unknown>)[k] = v;
    };

    assignStr("legal_first_name");
    assignStr("legal_last_name");
    assignStr("email");
    assignStr("phone");
    assignStr("location");
    assignStr("earliest_start_date");
    assignStr("linkedin_url");
    assignStr("portfolio_url");
    assignStr("github_url");
    assignBool("visa_sponsorship_needed");
    assignBool("relocation_ok");
    assignNum("notice_period_weeks");
    assignNum("salary_min");
    assignNum("salary_max");

    if (typeof body.work_authorization === "string") {
      if (!WORK_AUTHS.includes(body.work_authorization as WorkAuth)) {
        return problem({
          title: `work_authorization must be one of: ${WORK_AUTHS.join(", ")}`,
          status: 400, code: "bad_input",
        });
      }
      patch.work_authorization = body.work_authorization as WorkAuth;
    }

    // EEO — encrypt plaintext before storing.
    if (env.CREDENTIALS_ENCRYPTION_KEY) {
      for (const key of ["eeo_gender", "eeo_race", "eeo_veteran", "eeo_disability"] as const) {
        const raw = str(body[key]);
        if (raw === undefined) continue;
        if (raw === null || raw === "") {
          (patch as Record<string, unknown>)[`${key}_enc`] = null;
        } else {
          (patch as Record<string, unknown>)[`${key}_enc`] = await encrypt(raw, env);
        }
      }
    } else {
      // Reject EEO writes if crypto isn't configured — fail closed.
      const sentEEO = ["eeo_gender", "eeo_race", "eeo_veteran", "eeo_disability"]
        .some((k) => k in body);
      if (sentEEO) {
        return problem({
          title: "Server not configured",
          status: 500,
          detail: "CREDENTIALS_ENCRYPTION_KEY is required to store EEO data",
        });
      }
    }

    const updated = await upsertProfile(env, userId, patch);
    return ok({
      profile: toPublic(updated),
      complete: isProfileComplete(updated),
    });
  }

  return problem({ title: "Method not allowed", status: 405 });
}
