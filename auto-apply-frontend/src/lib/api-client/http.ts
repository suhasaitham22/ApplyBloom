import { ApiError, isProblem, type Problem } from "./problem";
import { newRequestId } from "@/lib/telemetry/request-id";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL?.trim() || "http://127.0.0.1:8787";

interface HttpOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  body?: unknown;
  token?: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export async function httpJson<T>(path: string, opts: HttpOptions = {}): Promise<T> {
  const requestId = newRequestId();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-request-id": requestId,
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  const text = await res.text();
  const parsed = text ? safeJson(text) : null;

  if (!res.ok) {
    const problem: Problem = isProblem(parsed)
      ? parsed
      : { title: `HTTP ${res.status}`, status: res.status, detail: text || undefined };
    throw new ApiError(problem, res.headers.get("x-request-id") ?? requestId);
  }

  return (parsed ?? {}) as T;
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}
