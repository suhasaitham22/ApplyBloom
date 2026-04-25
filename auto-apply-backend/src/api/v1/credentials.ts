// Credentials vault API.
// All list/get responses are REDACTED by default.
// Full plaintext is only returned when explicit `?reveal=true` is set.
// Every reveal is logged to `credential_access_log`.

import { ok, problem } from "@/lib/http/problem";
import { resolveUser } from "@/lib/auth/require-authenticated-user";
import { encrypt, decrypt, decryptJson, encryptJson } from "@/lib/crypto/aes-gcm";
import {
  createCredential,
  listCredentials,
  getCredential,
  updateCredential,
  deleteCredential,
  logAccess,
  toRedacted,
  type CredentialProvider,
  type CredentialRecord,
  type CredentialFull,
} from "@/services/credentials/store";

export type CredRoute =
  | { kind: "list"; method: "GET" | "POST" }
  | { kind: "detail"; method: "GET" | "PATCH" | "DELETE"; id: string };

const ALLOWED_PROVIDERS = new Set<CredentialProvider>([
  "greenhouse", "lever", "workday", "linkedin", "indeed", "wellfound", "generic", "other",
]);

async function safeJson(req: Request): Promise<Record<string, unknown> | null> {
  try { return (await req.json()) as Record<string, unknown>; } catch { return null; }
}

function problemSafe(title: string, status = 400, code?: string) {
  return problem({ title, status, code });
}

async function toRedactedWithUsername(env: { CREDENTIALS_ENCRYPTION_KEY?: string }, r: CredentialRecord) {
  // Decrypt ONLY the username so we can mask it (e.g. "j•••@gmail.com") — safe to show.
  try {
    const username = await decrypt(r.username_enc, env);
    return toRedacted(r, username);
  } catch {
    return toRedacted(r);
  }
}

async function revealFull(env: { CREDENTIALS_ENCRYPTION_KEY?: string }, r: CredentialRecord): Promise<CredentialFull> {
  const username = await decrypt(r.username_enc, env);
  const password = await decrypt(r.password_enc, env);
  const extra = r.extra_enc ? await decryptJson<Record<string, unknown>>(r.extra_enc, env) : null;
  const redacted = toRedacted(r, username);
  return { ...redacted, username, password, extra };
}

export async function handleCredentialsRequest(
  request: Request,
  env: Env,
  route: CredRoute,
): Promise<Response> {
  const auth = await resolveUser(request, env);
  if (!auth) return problem({ title: "Unauthorized", status: 401, code: "auth_required" });
  const userId = auth.id;

  try {
    if (!env.CREDENTIALS_ENCRYPTION_KEY) {
      return problem({ title: "Server not configured", status: 500, detail: "CREDENTIALS_ENCRYPTION_KEY is missing" });
    }

    switch (route.kind) {
      case "list": {
        if (route.method === "GET") {
          const items = await listCredentials(env, userId);
          const redacted = await Promise.all(items.map((r) => toRedactedWithUsername(env, r)));
          return ok({ credentials: redacted });
        }
        if (route.method === "POST") {
          const body = await safeJson(request);
          const provider = body?.provider as string;
          if (!provider || !ALLOWED_PROVIDERS.has(provider as CredentialProvider)) {
            return problemSafe(`provider must be one of: ${[...ALLOWED_PROVIDERS].join(", ")}`, 400, "bad_input");
          }
          const username = typeof body?.username === "string" ? body.username : "";
          const password = typeof body?.password === "string" ? body.password : "";
          if (!username.trim() || !password) {
            return problemSafe("username and password are required", 400, "bad_input");
          }
          const label = typeof body?.label === "string" ? body.label : null;
          const extra = body && typeof body === "object" && body.extra && typeof body.extra === "object" ? body.extra : null;

          const rec = await createCredential(env, userId, {
            provider: provider as CredentialProvider,
            label,
            username_enc: await encrypt(username, env),
            password_enc: await encrypt(password, env),
            extra_enc: extra ? await encryptJson(extra, env) : null,
          });
          return ok({ credential: await toRedactedWithUsername(env, rec) }, 201);
        }
        return problem({ title: "Method not allowed", status: 405 });
      }

      case "detail": {
        const rec = await getCredential(env, userId, route.id);
        if (!rec) return problem({ title: "Credential not found", status: 404 });

        if (route.method === "GET") {
          const url = new URL(request.url);
          const reveal = url.searchParams.get("reveal") === "true";
          if (reveal) {
            const full = await revealFull(env, rec);
            await logAccess(env, userId, rec.id, "reveal", {
              requestId: request.headers.get("x-request-id") ?? undefined,
              ip: request.headers.get("cf-connecting-ip") ?? undefined,
              ua: request.headers.get("user-agent") ?? undefined,
            });
            return ok({ credential: full, revealed: true });
          }
          return ok({ credential: await toRedactedWithUsername(env, rec) });
        }

        if (route.method === "PATCH") {
          const body = await safeJson(request);
          const patch: Parameters<typeof updateCredential>[3] = {};
          if (typeof body?.label === "string" || body?.label === null) patch.label = body.label as string | null;
          if (typeof body?.username === "string" && body.username.trim()) {
            patch.username_enc = await encrypt(body.username, env);
          }
          if (typeof body?.password === "string" && body.password) {
            patch.password_enc = await encrypt(body.password, env);
          }
          if (body && typeof body === "object" && "extra" in body) {
            patch.extra_enc = body.extra ? await encryptJson(body.extra, env) : null;
          }
          const updated = await updateCredential(env, userId, route.id, patch);
          if (!updated) return problem({ title: "Credential not found", status: 404 });
          await logAccess(env, userId, rec.id, "update");
          return ok({ credential: await toRedactedWithUsername(env, updated) });
        }

        if (route.method === "DELETE") {
          const okDel = await deleteCredential(env, userId, route.id);
          if (!okDel) return problem({ title: "Credential not found", status: 404 });
          await logAccess(env, userId, rec.id, "delete");
          return ok({ deleted: true });
        }
        return problem({ title: "Method not allowed", status: 405 });
      }
    }
  } catch (e) {
    return problem({
      title: "Credentials error",
      status: 500,
      detail: e instanceof Error ? e.message : String(e),
    });
  }
}
