import { handleHealthRequest } from "@/api/v1/health";
import { handleListApplicationsRequest } from "@/api/v1/list-applications";
import { handleListNotificationsRequest } from "@/api/v1/list-notifications";
import { handleRecordApplicationRequest } from "@/api/v1/record-application";
import { handleResumeChatRequest } from "@/api/v1/resume-chat";
import { handleStructureResumeRequest } from "@/api/v1/structure-resume";
import { handleTailorResumeRequest } from "@/api/v1/tailor-resume";
import { handleResumesRequest } from "@/api/v1/studio/resumes";
import { handleSessionsRequest } from "@/api/v1/studio/sessions";
import { handleUploadResumeRequest } from "@/api/v1/studio/upload-resume";

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, x-request-id, Idempotency-Key",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function withCors(response: Response, origin: string | null): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders(origin))) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    const m = request.method;
    const p = url.pathname;

    const route = async (): Promise<Response> => {
      // Health + legacy endpoints
      if (m === "GET" && p === "/api/v1/health") return handleHealthRequest(request, env);
      if (m === "POST" && p === "/api/v1/resume/structure") return handleStructureResumeRequest(request, env);
      if (m === "POST" && p === "/api/v1/resume/tailor") return handleTailorResumeRequest(request, env);
      if (m === "POST" && p === "/api/v1/resume/chat") return handleResumeChatRequest(request, env);
      if (m === "POST" && p === "/api/v1/applications") return handleRecordApplicationRequest(request, env);
      if (m === "GET" && p === "/api/v1/applications") return handleListApplicationsRequest(request, env);
      if (m === "GET" && p === "/api/v1/notifications") return handleListNotificationsRequest(request, env);

      // Studio: resumes
      if (m === "POST" && p === "/api/v1/resumes/upload") return handleUploadResumeRequest(request, env);
      if (p === "/api/v1/resumes") {
        if (m === "GET" || m === "POST") return handleResumesRequest(request, env, { method: m });
      }
      const resumeMatch = p.match(/^\/api\/v1\/resumes\/([^/]+)$/);
      if (resumeMatch) {
        return handleResumesRequest(request, env, { method: m, id: resumeMatch[1] });
      }

      // Studio: sessions
      if (p === "/api/v1/sessions") {
        if (m === "GET" || m === "POST") return handleSessionsRequest(request, env, { kind: "list", method: m });
      }
      const sMatch = p.match(/^\/api\/v1\/sessions\/([^/]+)(?:\/([^/]+))?$/);
      if (sMatch) {
        const id = sMatch[1];
        const sub = sMatch[2];
        if (!sub) {
          if (m === "GET" || m === "PATCH") return handleSessionsRequest(request, env, { kind: "detail", method: m, id });
        } else if (sub === "messages") {
          if (m === "GET" || m === "POST") return handleSessionsRequest(request, env, { kind: "messages", method: m, id });
        } else if (sub === "lock" && m === "POST") {
          return handleSessionsRequest(request, env, { kind: "lock", method: "POST", id });
        } else if (sub === "start" && m === "POST") {
          return handleSessionsRequest(request, env, { kind: "start", method: "POST", id });
        } else if (sub === "pause" && m === "POST") {
          return handleSessionsRequest(request, env, { kind: "pause", method: "POST", id });
        } else if (sub === "resume" && m === "POST") {
          return handleSessionsRequest(request, env, { kind: "resume", method: "POST", id });
        } else if (sub === "cancel" && m === "POST") {
          return handleSessionsRequest(request, env, { kind: "cancel", method: "POST", id });
        } else if (sub === "parse" && m === "POST") {
          return handleSessionsRequest(request, env, { kind: "parse", method: "POST", id });
        } else if (sub === "tailor" && m === "POST") {
          return handleSessionsRequest(request, env, { kind: "tailor", method: "POST", id });
        } else if (sub === "apply" && m === "POST") {
          return handleSessionsRequest(request, env, { kind: "apply", method: "POST", id });
        }
      }

      return new Response(
        JSON.stringify({ title: "Not found", status: 404, detail: `No route for ${m} ${p}` }),
        { status: 404, headers: { "Content-Type": "application/problem+json" } },
      );
    };

    return withCors(await route(), origin);
  },
} satisfies ExportedHandler<Env>;
