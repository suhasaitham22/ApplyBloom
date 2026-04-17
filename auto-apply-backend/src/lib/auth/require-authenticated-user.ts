import { errorResponse } from "@/lib/http/error-response";
import { jwtVerify } from "jose";

/**
 * Authenticates a request against Supabase.
 *
 * Resolution order:
 *   1. If `Authorization: Bearer <jwt>` is set and SUPABASE_JWT_SECRET is present,
 *      verify the JWT. On success, return the Supabase subject (user id).
 *   2. If DEMO_MODE=true, allow any bearer token (value becomes demo user id),
 *      or fall back to DEV_DEMO_USER_ID when no Authorization header.
 *   3. Otherwise reject with 401.
 *
 * This means production deployments without DEMO_MODE require a valid Supabase JWT.
 */
export async function requireAuthenticatedUser(request: Request, env: Env) {
  const authorization = request.headers.get("Authorization");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  // Real Supabase JWT verification path
  if (bearerToken && env.SUPABASE_JWT_SECRET) {
    try {
      const secretKey = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
      const { payload } = await jwtVerify(bearerToken, secretKey, {
        algorithms: ["HS256"],
      });
      const userId = typeof payload.sub === "string" ? payload.sub : "";
      const email = typeof payload.email === "string" ? payload.email : undefined;
      if (!userId) {
        return rejection("invalid_token", "Token missing subject");
      }
      return {
        ok: true as const,
        user: { id: userId, email, token: bearerToken, verified: true as const },
      };
    } catch (error) {
      return rejection(
        "invalid_token",
        error instanceof Error ? error.message : "JWT verification failed",
      );
    }
  }

  // Demo mode: accept any bearer or fall back to DEV_DEMO_USER_ID
  if (env.DEMO_MODE === "true") {
    const userId = bearerToken || env.DEV_DEMO_USER_ID || "demo_user";
    return {
      ok: true as const,
      user: {
        id: userId,
        email: `${userId}@demo.local`,
        token: userId,
        verified: false as const,
      },
    };
  }

  return rejection("unauthorized", "Missing or invalid bearer token");
}

function rejection(code: string, message: string) {
  return {
    ok: false as const,
    response: errorResponse(code, message, 401),
  };
}
