import { handleUploadResumeRequest } from "@/api/v1/upload-resume";
import { handleGetJobMatchesRequest } from "@/api/v1/get-job-matches";
import { handleTailorResumeRequest } from "@/api/v1/tailor-resume";
import { handleCreateApplicationRequest } from "@/api/v1/create-application";
import { handleListApplicationsRequest } from "@/api/v1/list-applications";
import { handleListNotificationsRequest } from "@/api/v1/list-notifications";
import { handleResendWebhookRequest } from "@/api/v1/webhooks/resend";
import { handleHealthRequest } from "@/api/v1/health";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/v1/resume/upload") {
      return handleUploadResumeRequest(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/v1/match") {
      return handleGetJobMatchesRequest(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/v1/resume/tailor") {
      return handleTailorResumeRequest(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/v1/applications") {
      return handleCreateApplicationRequest(request, env);
    }

    if (request.method === "GET" && url.pathname === "/api/v1/applications") {
      return handleListApplicationsRequest(request, env);
    }

    if (request.method === "GET" && url.pathname === "/api/v1/notifications") {
      return handleListNotificationsRequest(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/v1/webhooks/resend") {
      return handleResendWebhookRequest(request, env);
    }

    if (request.method === "GET" && url.pathname === "/api/v1/health") {
      return handleHealthRequest(request, env);
    }

    return new Response(JSON.stringify({ error: { code: "not_found" } }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
} satisfies ExportedHandler<Env>;
