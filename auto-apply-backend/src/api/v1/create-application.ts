import { enqueueApplyJob } from "@/services/enqueue-apply-job";
import { processApplyJob } from "@/workers/process-apply-job";
import { buildSuccessPayload } from "@/lib/http/build-success-payload";
import { getRequestId } from "@/lib/http/request-id";
import { jsonResponse } from "@/lib/http/json-response";
import { parseJsonBody } from "@/lib/http/parse-json-body";
import { requireAuthenticatedUser } from "@/lib/auth/require-authenticated-user";
import { requireMethod } from "@/lib/http/require-method";
import { requireNonEmptyString } from "@/lib/http/require-non-empty-string";
import type { CreateApplicationRequestBody } from "@/lib/contracts/api-types";

export async function handleCreateApplicationRequest(
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

  const parsed = await parseJsonBody<CreateApplicationRequestBody>(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const jobId = requireNonEmptyString(parsed.data.job_id, "job_id");
  if (!jobId.ok) {
    return jsonResponse(
      {
        error: {
          code: "validation_error",
          message: jobId.error,
          details: {},
        },
        meta: { request_id: requestId },
      },
      400,
    );
  }

  const resumeArtifactId = requireNonEmptyString(
    parsed.data.resume_artifact_id,
    "resume_artifact_id",
  );
  if (!resumeArtifactId.ok) {
    return jsonResponse(
      {
        error: {
          code: "validation_error",
          message: resumeArtifactId.error,
          details: {},
        },
        meta: { request_id: requestId },
      },
      400,
    );
  }

  if (env.DEV_IMMEDIATE_QUEUE_PROCESSING === "true") {
    const result = await processApplyJob({
      user_id: auth.user.id,
      job_id: jobId.value,
      resume_artifact_id: resumeArtifactId.value,
      apply_mode: parsed.data.apply_mode ?? "manual_review",
      request_id: requestId,
    });

    return jsonResponse(
      buildSuccessPayload(
        {
          status: result.submitted ? "submitted" : result.next_action,
          application_result: result,
        },
        requestId,
      ),
    );
  }

  await enqueueApplyJob(
    {
      user_id: auth.user.id,
      job_id: jobId.value,
      resume_artifact_id: resumeArtifactId.value,
      apply_mode: parsed.data.apply_mode ?? "manual_review",
      request_id: requestId,
    },
    env,
  );

  return jsonResponse(buildSuccessPayload({ status: "queued" }, requestId));
}
