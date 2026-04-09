import type { ApiSuccess, ApplicationSummary, JobMatchSummary, NotificationSummary } from "@/lib/api-types";

const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ?? "";
const demoUserId = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "";

async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${backendBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(demoUserId ? { Authorization: `Bearer ${demoUserId}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function uploadResumeToBackend(payload: {
  file_name: string;
  file_type: string;
  storage_path: string;
  resume_text?: string;
}) {
  return backendFetch("/api/v1/resume/upload", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchJobMatchesFromBackend() {
  return backendFetch<ApiSuccess<{ matches: JobMatchSummary[] }>>("/api/v1/match", {
    method: "POST",
    body: JSON.stringify({ limit: 20 }),
  });
}

export async function fetchApplicationsFromBackend() {
  return backendFetch<ApiSuccess<{ applications: ApplicationSummary[] }>>(
    "/api/v1/applications",
  );
}

export async function fetchNotificationsFromBackend() {
  return backendFetch<ApiSuccess<{ notifications: NotificationSummary[] }>>(
    "/api/v1/notifications",
  );
}

export async function requestResumeTailoring(jobId: string) {
  return backendFetch("/api/v1/resume/tailor", {
    method: "POST",
    body: JSON.stringify({ job_id: jobId, mode: "manual" }),
  });
}

export async function createApplicationInBackend(payload: {
  job_id: string;
  resume_artifact_id: string;
  apply_mode?: "manual_review" | "auto_apply" | "save_for_later";
}) {
  return backendFetch("/api/v1/applications", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      apply_mode: payload.apply_mode ?? "manual_review",
    }),
  });
}
