import { buildSuccessPayload } from "@/lib/http/build-success-payload";
import { errorResponse } from "@/lib/http/error-response";
import { getRequestId } from "@/lib/http/request-id";
import { jsonResponse } from "@/lib/http/json-response";
import { parseJsonBody } from "@/lib/http/parse-json-body";
import { requireAuthenticatedUser } from "@/lib/auth/require-authenticated-user";
import { requireMethod } from "@/lib/http/require-method";
import { chatWithResume, type ChatWithResumeInput } from "@/services/chat-with-resume";

export async function handleResumeChatRequest(request: Request, env: Env): Promise<Response> {
  const requestId = getRequestId(request);

  const methodError = requireMethod(request, "POST");
  if (methodError) return methodError;

  const auth = await requireAuthenticatedUser(request, env);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<ChatWithResumeInput>(request);
  if (!parsed.ok) return parsed.response;

  if (!parsed.data.resume || typeof parsed.data.instruction !== "string") {
    return errorResponse("validation_error", "resume and instruction are required", 400, {}, requestId);
  }

  const { data, demo } = await chatWithResume(
    {
      resume: parsed.data.resume,
      messages: parsed.data.messages ?? [],
      instruction: parsed.data.instruction,
    },
    env,
  );

  return jsonResponse(buildSuccessPayload({ reply: data, demo_mode: demo }, requestId));
}
