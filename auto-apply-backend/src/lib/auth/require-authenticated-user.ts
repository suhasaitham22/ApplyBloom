import { errorResponse } from "@/lib/http/error-response";

export async function requireAuthenticatedUser(request: Request, env: Env) {
  const authorization = request.headers.get("Authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    if (env.DEV_DEMO_USER_ID) {
      return {
        ok: true as const,
        user: {
          id: env.DEV_DEMO_USER_ID,
          token: env.DEV_DEMO_USER_ID,
        },
      };
    }

    return {
      ok: false as const,
      response: errorResponse("unauthorized", "Missing bearer token", 401),
    };
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (token.length === 0) {
    return {
      ok: false as const,
      response: errorResponse("unauthorized", "Missing bearer token", 401),
    };
  }

  return {
    ok: true as const,
    user: {
      id: token,
      token,
    },
  };
}
