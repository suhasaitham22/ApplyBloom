import { buildSuccessPayload } from "@/lib/http/build-success-payload";
import { getRequestId } from "@/lib/http/request-id";
import { jsonResponse } from "@/lib/http/json-response";

export async function handleHealthRequest(request: Request, env: Env): Promise<Response> {
  void env;

  const requestId = getRequestId(request);

  return jsonResponse(
    buildSuccessPayload(
      {
        status: "ok",
      },
      requestId,
    ),
  );
}

