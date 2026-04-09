export function getRequestId(request: Request): string {
  return request.headers.get("X-Request-Id") ?? crypto.randomUUID();
}

