import { buildSuccessPayload } from "@/lib/http/build-success-payload";
import { errorResponse } from "@/lib/http/error-response";
import { getRequestId } from "@/lib/http/request-id";
import { jsonResponse } from "@/lib/http/json-response";
import { parseJsonBody } from "@/lib/http/parse-json-body";
import { requireAuthenticatedUser } from "@/lib/auth/require-authenticated-user";
import { requireMethod } from "@/lib/http/require-method";
import { tailorResumeForJob } from "@/services/tailor-resume-llm";
import type { StructuredResume } from "@/services/structure-resume";

interface TailorBody {
  resume: StructuredResume;
  job: { title: string; company?: string; description: string; url?: string };
}

export async function handleTailorResumeRequest(request: Request, env: Env): Promise<Response> {
  const requestId = getRequestId(request);

  const methodError = requireMethod(request, "POST");
  if (methodError) return methodError;

  const auth = await requireAuthenticatedUser(request, env);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<TailorBody>(request);
  if (!parsed.ok) return parsed.response;

  if (!parsed.data.resume || !parsed.data.job) {
    return errorResponse("validation_error", "resume and job are required", 400, {}, requestId);
  }
  if (!parsed.data.job.title || !parsed.data.job.description) {
    return errorResponse("validation_error", "job.title and job.description are required", 400, {}, requestId);
  }

  const { data, demo } = await tailorResumeForJob(parsed.data, env);

  return jsonResponse(
    buildSuccessPayload({ tailored: data, demo_mode: demo }, requestId),
  );
}
