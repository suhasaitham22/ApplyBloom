import { buildSuccessPayload } from "@/lib/http/build-success-payload";
import { errorResponse } from "@/lib/http/error-response";
import { getRequestId } from "@/lib/http/request-id";
import { jsonResponse } from "@/lib/http/json-response";
import { parseJsonBody } from "@/lib/http/parse-json-body";
import { requireAuthenticatedUser } from "@/lib/auth/require-authenticated-user";
import { requireMethod } from "@/lib/http/require-method";
import { sendApplicationEmail } from "@/services/notifications";
import {
  recordRuntimeNotification,
  recordRuntimeApplicationEvent,
} from "@/lib/state/runtime-store";

export async function handleRecordApplicationRequest(request: Request, env: Env): Promise<Response> {
  const requestId = getRequestId(request);

  const methodError = requireMethod(request, "POST");
  if (methodError) return methodError;

  const auth = await requireAuthenticatedUser(request, env);
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<{
    job_title: string;
    company?: string;
    apply_url?: string;
    status: "submitted" | "saved_for_later";
  }>(request);
  if (!parsed.ok) return parsed.response;

  if (!parsed.data.job_title || !parsed.data.status) {
    return errorResponse("validation_error", "job_title and status are required", 400, {}, requestId);
  }

  const event = recordRuntimeApplicationEvent({
    user_id: auth.user.id,
    request_id: requestId,
    event_type:
      parsed.data.status === "submitted" ? "application_submitted" : "application_saved",
    job_id: parsed.data.job_title,
    metadata: {
      job_title: parsed.data.job_title,
      company: parsed.data.company,
      apply_url: parsed.data.apply_url,
    },
  });

  const email = await sendApplicationEmail(
    {
      to: auth.user.email ?? "",
      job_title: parsed.data.job_title,
      company: parsed.data.company ?? "",
      status: parsed.data.status,
      apply_url: parsed.data.apply_url,
    },
    env,
  );

  recordRuntimeNotification({
    user_id: auth.user.id,
    type: "application_status",
    title:
      parsed.data.status === "submitted"
        ? `Application submitted: ${parsed.data.job_title}`
        : `Saved for later: ${parsed.data.job_title}`,
    body:
      parsed.data.status === "submitted"
        ? `Your application for ${parsed.data.job_title} at ${parsed.data.company ?? "the company"} is marked submitted.`
        : `Saved ${parsed.data.job_title} for later review.`,
    delivery_provider: email.provider,
    provider_event_id: email.provider_event_id ?? undefined,
  });

  return jsonResponse(
    buildSuccessPayload(
      {
        event_id: event.id,
        notification: {
          email_delivered: email.delivered,
          provider: email.provider,
          message: email.message,
        },
      },
      requestId,
    ),
  );
}
