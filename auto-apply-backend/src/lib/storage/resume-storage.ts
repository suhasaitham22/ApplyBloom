// Storage adapter for resume files.
// In DEMO_MODE / when SUPABASE_SERVICE_ROLE_KEY is absent → in-memory fallback.
// In production → uploads to Supabase Storage bucket "resume-files".

export interface StoredFile {
  storage_path: string;   // e.g. "<userId>/<resumeId>/<filename>"
  url: string;            // signed read URL (in-memory: data: URL)
  bytes: number;
  file_type: "pdf" | "docx" | "txt" | "text" | "other";
}

interface StorageAdapter {
  put(opts: { userId: string; resumeId: string; filename: string; contentType: string; data: ArrayBuffer }): Promise<StoredFile>;
  get(storagePath: string): Promise<{ data: ArrayBuffer; contentType: string } | null>;
  delete(storagePath: string): Promise<boolean>;
  signedUrl(storagePath: string, ttlSeconds?: number): Promise<string | null>;
}

// ── In-memory adapter (dev/test/demo) ─────────────────────────────────────
const memStore = new Map<string, { data: ArrayBuffer; contentType: string }>();

const memoryAdapter: StorageAdapter = {
  async put({ userId, resumeId, filename, contentType, data }) {
    const storage_path = `${userId}/${resumeId}/${filename}`;
    memStore.set(storage_path, { data, contentType });
    const b64 = arrayBufferToBase64(data);
    return {
      storage_path,
      url: `data:${contentType};base64,${b64}`,
      bytes: data.byteLength,
      file_type: inferFileType(contentType, filename),
    };
  },
  async get(storage_path) {
    return memStore.get(storage_path) ?? null;
  },
  async delete(storage_path) {
    return memStore.delete(storage_path);
  },
  async signedUrl(storage_path) {
    const hit = memStore.get(storage_path);
    if (!hit) return null;
    return `data:${hit.contentType};base64,${arrayBufferToBase64(hit.data)}`;
  },
};

// ── Supabase adapter (production) ─────────────────────────────────────────
function supabaseAdapter(env: {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_BUCKET?: string;
}): StorageAdapter {
  const bucket = env.SUPABASE_BUCKET ?? "resume-files";
  const base = env.SUPABASE_URL.replace(/\/$/, "");
  const auth = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  return {
    async put({ userId, resumeId, filename, contentType, data }) {
      const storage_path = `${userId}/${resumeId}/${filename}`;
      const res = await fetch(`${base}/storage/v1/object/${bucket}/${encodeURIComponent(storage_path)}`, {
        method: "POST",
        headers: { ...auth, "Content-Type": contentType, "x-upsert": "true" },
        body: data,
      });
      if (!res.ok) throw new Error(`Storage upload failed: ${res.status} ${await res.text()}`);
      return {
        storage_path,
        url: `${base}/storage/v1/object/public/${bucket}/${encodeURIComponent(storage_path)}`,
        bytes: data.byteLength,
        file_type: inferFileType(contentType, filename),
      };
    },
    async get(storage_path) {
      const res = await fetch(`${base}/storage/v1/object/authenticated/${bucket}/${encodeURIComponent(storage_path)}`, { headers: auth });
      if (!res.ok) return null;
      return { data: await res.arrayBuffer(), contentType: res.headers.get("Content-Type") ?? "application/octet-stream" };
    },
    async delete(storage_path) {
      const res = await fetch(`${base}/storage/v1/object/${bucket}/${encodeURIComponent(storage_path)}`, { method: "DELETE", headers: auth });
      return res.ok;
    },
    async signedUrl(storage_path, ttlSeconds = 3600) {
      const res = await fetch(`${base}/storage/v1/object/sign/${bucket}/${encodeURIComponent(storage_path)}`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: ttlSeconds }),
      });
      if (!res.ok) return null;
      const { signedURL } = (await res.json()) as { signedURL?: string };
      return signedURL ? `${base}/storage/v1${signedURL}` : null;
    },
  };
}

// ── Dispatcher ────────────────────────────────────────────────────────────
export function getResumeStorage(env: unknown): StorageAdapter {
  const e = env as Partial<{ SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string; SUPABASE_BUCKET: string; DEMO_MODE: string }>;
  if (e?.DEMO_MODE === "true") return memoryAdapter;
  if (!e?.SUPABASE_URL || !e?.SUPABASE_SERVICE_ROLE_KEY) return memoryAdapter;
  return supabaseAdapter(e as { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string; SUPABASE_BUCKET?: string });
}

function inferFileType(contentType: string, filename: string): StoredFile["file_type"] {
  const lower = (filename || "").toLowerCase();
  if (contentType === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (contentType.includes("officedocument.wordprocessingml") || lower.endsWith(".docx")) return "docx";
  if (contentType === "text/plain" || lower.endsWith(".txt")) return "txt";
  return "other";
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  // In workers, btoa is available; also safe in Node 20+
  return typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(bytes).toString("base64");
}
