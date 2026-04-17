import { buildSuccessPayload } from "@/lib/http/build-success-payload";
import { errorResponse } from "@/lib/http/error-response";
import { getRequestId } from "@/lib/http/request-id";
import { jsonResponse } from "@/lib/http/json-response";
import { parseJsonBody } from "@/lib/http/parse-json-body";
import { requireAuthenticatedUser } from "@/lib/auth/require-authenticated-user";
import { requireMethod } from "@/lib/http/require-method";
import { requireNonEmptyString } from "@/lib/http/require-non-empty-string";
import { structureResume } from "@/services/structure-resume";

export async function handleStructureResumeRequest(request: Request, env: Env): Promise<Response> {
  const requestId = getRequestId(request);

  const methodError = requireMethod(request, "POST");
  if (methodError) return methodError;

  const auth = await requireAuthenticatedUser(request, env);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<{ resume_text: string; file_name?: string }>(request);
  if (!parsed.ok) return parsed.response;

  const resumeText = requireNonEmptyString(parsed.data.resume_text, "resume_text");
  if (!resumeText.ok) {
    return errorResponse("validation_error", resumeText.error, 400, {}, requestId);
  }

  const { data, demo } = await structureResume(resumeText.value, env);

  return jsonResponse(
    buildSuccessPayload(
      {
        resume: data,
        demo_mode: demo,
        file_name: parsed.data.file_name ?? null,
      },
      requestId,
    ),
  );
}
