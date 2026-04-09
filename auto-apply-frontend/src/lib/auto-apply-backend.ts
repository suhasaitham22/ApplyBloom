import type { ApiSuccess, ApplicationSummary, JobMatchSummary, NotificationSummary } from "@/lib/api-types";

const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL?.trim() ?? "";
const demoUserId = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "";
const API_PREFIX = "/api/v1";

async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = buildBackendUrl(path);
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(demoUserId ? { Authorization: `Bearer ${demoUserId}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status} (${url})`);
  }

  return (await response.json()) as T;
}

function buildBackendUrl(path: string) {
  const base = resolveBackendBaseUrl();
  if (!base) {
    throw new Error(
      "Backend base URL is not configured. Set NEXT_PUBLIC_BACKEND_API_BASE_URL.",
    );
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseHasApiPrefix = /\/api\/v1\/?$/i.test(base);
  const pathWithoutPrefix = normalizedPath.startsWith(`${API_PREFIX}/`)
    ? normalizedPath.slice(API_PREFIX.length)
    : normalizedPath;
  const resolvedPath = baseHasApiPrefix ? pathWithoutPrefix : normalizedPath;

  return `${base}${resolvedPath}`;
}

function resolveBackendBaseUrl() {
  if (backendBaseUrl.length > 0) {
    return trimTrailingSlash(backendBaseUrl);
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://127.0.0.1:8787";
    }
  }

  return "";
}

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
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
