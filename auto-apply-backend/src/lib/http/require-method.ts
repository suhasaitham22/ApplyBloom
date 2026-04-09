import { errorResponse } from "@/lib/http/error-response";

export function requireMethod(request: Request, expectedMethod: string): Response | null {
  if (request.method !== expectedMethod) {
    return errorResponse(
      "validation_error",
      `Expected ${expectedMethod} request method`,
      405,
      { expected_method: expectedMethod, received_method: request.method },
    );
  }

  return null;
}

