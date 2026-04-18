export function newRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `req_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

type LogLevel = "debug" | "info" | "warn" | "error";
interface LogFields {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  [k: string]: unknown;
}

export function log(level: LogLevel, msg: string, fields: LogFields = {}) {
  const entry = { ts: new Date().toISOString(), level, msg, ...fields };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
