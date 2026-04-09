import { enqueueParseResumeJob } from "@/services/enqueue-parse-resume-job";
import { errorResponse } from "@/lib/http/error-response";
import { buildSuccessPayload } from "@/lib/http/build-success-payload";
import { getRequestId } from "@/lib/http/request-id";
import { jsonResponse } from "@/lib/http/json-response";
import { parseJsonBody } from "@/lib/http/parse-json-body";
import { requireAuthenticatedUser } from "@/lib/auth/require-authenticated-user";
import { requireMethod } from "@/lib/http/require-method";
import { requireNonEmptyString } from "@/lib/http/require-non-empty-string";
import type { UploadResumeRequestBody } from "@/lib/contracts/api-types";

export async function handleUploadResumeRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const requestId = getRequestId(request);

  const methodError = requireMethod(request, "POST");
  if (methodError) {
    return methodError;
  }

  const auth = await requireAuthenticatedUser(request, env);
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseJsonBody<UploadResumeRequestBody>(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const fileName = requireNonEmptyString(parsed.data.file_name, "file_name");
  if (!fileName.ok) {
    return errorResponse("validation_error", fileName.error, 400, {}, requestId);
  }

  const fileType = requireNonEmptyString(parsed.data.file_type, "file_type");
  if (!fileType.ok) {
    return errorResponse("validation_error", fileType.error, 400, {}, requestId);
  }

  const storagePath = requireNonEmptyString(parsed.data.storage_path, "storage_path");
  if (!storagePath.ok) {
    return errorResponse("validation_error", storagePath.error, 400, {}, requestId);
  }

  const resumeText =
    typeof parsed.data.resume_text === "string" && parsed.data.resume_text.trim().length > 0
      ? parsed.data.resume_text.trim()
      : undefined;

  await enqueueParseResumeJob(
    {
      user_id: auth.user.id,
      file_name: fileName.value,
      file_type: fileType.value,
      storage_path: storagePath.value,
      resume_text: resumeText,
      request_id: requestId,
    },
    env,
  );

  return jsonResponse(buildSuccessPayload({ status: "queued" }, requestId));
}
