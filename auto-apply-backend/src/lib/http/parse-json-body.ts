import { errorResponse } from "@/lib/http/error-response";

export async function parseJsonBody<T>(
  request: Request,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  try {
    const data = (await request.json()) as T;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      response: errorResponse("validation_error", "Request body must be valid JSON", 400),
    };
  }
}
