import type { ApiSuccess, StructuredResume, TailoredResume, ChatReply } from "@/lib/api-types";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL?.trim() || "http://127.0.0.1:8787";
const DEMO_USER = process.env.NEXT_PUBLIC_DEMO_USER_ID || "demo_user";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEMO_USER}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend ${res.status} on ${path}: ${text}`);
  }
  return (await res.json()) as T;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${DEMO_USER}` },
  });
  if (!res.ok) throw new Error(`Backend ${res.status} on ${path}`);
  return (await res.json()) as T;
}

export function structureResumeOnBackend(resumeText: string, fileName?: string) {
  return post<ApiSuccess<{ resume: StructuredResume; demo_mode: boolean; file_name: string | null }>>(
    "/api/v1/resume/structure",
    { resume_text: resumeText, file_name: fileName },
  );
}

export function tailorResumeOnBackend(
  resume: StructuredResume,
  job: { title: string; company?: string; description: string; url?: string },
) {
  return post<ApiSuccess<{ tailored: TailoredResume; demo_mode: boolean }>>("/api/v1/resume/tailor", {
    resume,
    job,
  });
}

export function chatAboutResumeOnBackend(resume: StructuredResume, instruction: string, messages: { role: "user" | "assistant"; content: string }[]) {
  return post<ApiSuccess<{ reply: ChatReply; demo_mode: boolean }>>("/api/v1/resume/chat", {
    resume,
    messages,
    instruction,
  });
}

export function recordApplicationOnBackend(payload: {
  job_title: string;
  company?: string;
  apply_url?: string;
  status: "submitted" | "saved_for_later";
}) {
  return post<ApiSuccess<{ event_id: string; notification: { email_delivered: boolean; provider: string; message: string } }>>(
    "/api/v1/applications",
    payload,
  );
}

export function listApplicationsFromBackend() {
  return get<ApiSuccess<{ applications: unknown[] }>>("/api/v1/applications");
}
