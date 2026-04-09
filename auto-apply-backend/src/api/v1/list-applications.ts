import { buildSuccessPayload } from "@/lib/http/build-success-payload";
import { getRequestId } from "@/lib/http/request-id";
import { jsonResponse } from "@/lib/http/json-response";
import { requireAuthenticatedUser } from "@/lib/auth/require-authenticated-user";
import { requireMethod } from "@/lib/http/require-method";
import { listRuntimeApplications } from "@/lib/state/runtime-store";

export async function handleListApplicationsRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const requestId = getRequestId(request);

  const methodError = requireMethod(request, "GET");
  if (methodError) {
    return methodError;
  }

  const auth = await requireAuthenticatedUser(request, env);
  if (!auth.ok) {
    return auth.response;
  }

  return jsonResponse(
    buildSuccessPayload(
      {
        applications: listRuntimeApplications(auth.user.id),
      },
      requestId,
    ),
  );
}
