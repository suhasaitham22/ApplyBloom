import { verifyResendWebhookSignature } from "@/services/verify-resend-webhook-signature";
import { buildSuccessPayload } from "@/lib/http/build-success-payload";
import { getRequestId } from "@/lib/http/request-id";
import { jsonResponse } from "@/lib/http/json-response";
import { requireMethod } from "@/lib/http/require-method";

export async function handleResendWebhookRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const requestId = getRequestId(request);

  const methodError = requireMethod(request, "POST");
  if (methodError) {
    return methodError;
  }

  await verifyResendWebhookSignature(request, env);

  return jsonResponse(buildSuccessPayload({ status: "accepted" }, requestId));
}
