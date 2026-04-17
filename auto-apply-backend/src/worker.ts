import { handleHealthRequest } from "@/api/v1/health";
import { handleListApplicationsRequest } from "@/api/v1/list-applications";
import { handleListNotificationsRequest } from "@/api/v1/list-notifications";
import { handleRecordApplicationRequest } from "@/api/v1/record-application";
import { handleResumeChatRequest } from "@/api/v1/resume-chat";
import { handleStructureResumeRequest } from "@/api/v1/structure-resume";
import { handleTailorResumeRequest } from "@/api/v1/tailor-resume";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    const route = async (): Promise<Response> => {
      if (request.method === "GET" && url.pathname === "/api/v1/health") {
        return handleHealthRequest(request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/v1/resume/structure") {
        return handleStructureResumeRequest(request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/v1/resume/tailor") {
        return handleTailorResumeRequest(request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/v1/resume/chat") {
        return handleResumeChatRequest(request, env);
      }
      if (request.method === "POST" && url.pathname === "/api/v1/applications") {
        return handleRecordApplicationRequest(request, env);
      }
      if (request.method === "GET" && url.pathname === "/api/v1/applications") {
        return handleListApplicationsRequest(request, env);
      }
      if (request.method === "GET" && url.pathname === "/api/v1/notifications") {
        return handleListNotificationsRequest(request, env);
      }

      return new Response(
        JSON.stringify({ error: { code: "not_found", message: `No route for ${request.method} ${url.pathname}` } }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    };

    return withCors(await route());
  },
} satisfies ExportedHandler<Env>;
