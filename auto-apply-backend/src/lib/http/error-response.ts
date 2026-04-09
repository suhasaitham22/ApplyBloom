import { jsonResponse } from "@/lib/http/json-response";

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details: Record<string, unknown> = {},
  requestId = "unknown",
): Response {
  return jsonResponse(
    {
      error: {
        code,
        message,
        details,
      },
      meta: {
        request_id: requestId,
      },
    },
    status,
  );
}

