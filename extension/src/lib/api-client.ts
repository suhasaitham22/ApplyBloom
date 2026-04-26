// Extension <-> Worker API client.

import type { ApplyRecord, QAPendingRecord, ReportKind, MatchResult } from "./types";

export interface ApiConfig {
  baseUrl: string;
  token: string;
  deviceId: string;
}

async function call<T>(cfg: ApiConfig, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.token}`,
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const title = (body as { title?: string; detail?: string })?.detail
      ?? (body as { title?: string })?.title
      ?? `HTTP ${res.status}`;
    throw new ApiError(title, res.status, (body as { code?: string })?.code);
  }
  return (body as { data: T }).data;
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

export const claimNext = (cfg: ApiConfig) =>
  call<{ item: ApplyRecord | null }>(cfg, "/api/v1/apply/claim", {
    method: "POST",
    body: JSON.stringify({ device_id: cfg.deviceId }),
  });

export const reportStep = (cfg: ApiConfig, applyId: string, step: string, note?: string) =>
  call<unknown>(cfg, `/api/v1/apply/${applyId}/report`, {
    method: "POST",
    body: JSON.stringify({ kind: "step", step, note }),
  });

export const reportStatus = (cfg: ApiConfig, applyId: string, kind: ReportKind, extra: Record<string, unknown> = {}) =>
  call<{ item: ApplyRecord | null }>(cfg, `/api/v1/apply/${applyId}/report`, {
    method: "POST",
    body: JSON.stringify({ kind, ...extra }),
  });

export const reportScreenshot = (cfg: ApiConfig, applyId: string, url: string) =>
  call<unknown>(cfg, `/api/v1/apply/${applyId}/report`, {
    method: "POST",
    body: JSON.stringify({ kind: "screenshot", url }),
  });

export const createPendingQA = (cfg: ApiConfig, input: {
  apply_id: string;
  question_text: string;
  question_type?: string | null;
  suggested_answer?: string | null;
  suggested_verdict?: "auto" | "suggest" | "ask" | null;
}) => call<{ item: QAPendingRecord }>(cfg, "/api/v1/qa-pending", {
  method: "POST",
  body: JSON.stringify(input),
});

export const matchQA = (cfg: ApiConfig, question_text: string) =>
  call<{ match: MatchResult | null }>(cfg, "/api/v1/qa-memory/match", {
    method: "POST",
    body: JSON.stringify({ question_text }),
  });

export const getProfile = (cfg: ApiConfig) =>
  call<{ profile: Record<string, unknown> | null; complete: boolean }>(cfg, "/api/v1/profile");
