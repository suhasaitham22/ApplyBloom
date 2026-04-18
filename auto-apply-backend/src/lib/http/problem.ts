// RFC 7807 problem+json helper for the Worker.

export interface Problem {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  code?: string;
  instance?: string;
  [k: string]: unknown;
}

export function problem(p: Problem, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(p), {
    status: p.status,
    headers: { "Content-Type": "application/problem+json", ...headers },
  });
}

export function ok<T>(data: T, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
