import { enqueueTailorResumeJob } from "@/services/enqueue-tailor-resume-job";
import { discoverJobs } from "@/services/discover-jobs";
import { tailorResume } from "@/services/tailor-resume";
import { renderResumePdf } from "@/services/render-resume-pdf";
import { buildSuccessPayload } from "@/lib/http/build-success-payload";
import { getRequestId } from "@/lib/http/request-id";
import { jsonResponse } from "@/lib/http/json-response";
import { parseJsonBody } from "@/lib/http/parse-json-body";
import { requireAuthenticatedUser } from "@/lib/auth/require-authenticated-user";
import { requireMethod } from "@/lib/http/require-method";
import { requireNonEmptyString } from "@/lib/http/require-non-empty-string";
import type { TailorResumeRequestBody } from "@/lib/contracts/api-types";
import {
  getRuntimeProfile,
  saveRuntimeTailoredResume,
} from "@/lib/state/runtime-store";

export async function handleTailorResumeRequest(
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

  const parsed = await parseJsonBody<TailorResumeRequestBody>(request);
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

  if (env.DEV_IMMEDIATE_QUEUE_PROCESSING === "true") {
    const profile = getRuntimeProfile(auth.user.id);
    if (!profile) {
      return jsonResponse(
        {
          error: {
            code: "not_found",
            message: "No runtime profile available for tailoring",
            details: {},
          },
          meta: { request_id: requestId },
        },
        404,
      );
    }

    const jobs = await discoverJobs(profile.headline || jobId.value);
    const job = jobs.find((candidate) => candidate.id === jobId.value || candidate.source_job_id === jobId.value) ?? jobs[0];

    if (!job) {
      return jsonResponse(
        {
          error: {
            code: "not_found",
            message: "No matching job available for tailoring",
            details: {},
          },
          meta: { request_id: requestId },
        },
        404,
      );
    }

    const tailoredResume = await tailorResume(profile, job);
    const renderedPdf = await renderResumePdf(tailoredResume);
    const storedTailoredResume = saveRuntimeTailoredResume({
      user_id: auth.user.id,
      job_id: job.id,
      headline: tailoredResume.headline,
      summary: tailoredResume.summary,
      skills: tailoredResume.skills,
      sections: tailoredResume.sections,
      change_summary: tailoredResume.change_summary,
      rendered_pdf: renderedPdf,
    });

    return jsonResponse(
      buildSuccessPayload(
        {
          status: "tailored",
          tailored_resume: storedTailoredResume,
        },
        requestId,
      ),
    );
  }

  await enqueueTailorResumeJob(
    {
      user_id: auth.user.id,
      profile_id: auth.user.id,
      job_id: jobId.value,
      mode: parsed.data.mode ?? "manual",
      request_id: requestId,
    },
  );

  return jsonResponse(buildSuccessPayload({ status: "queued" }, requestId));
}
