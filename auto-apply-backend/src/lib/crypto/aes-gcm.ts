// AES-256-GCM envelope encryption for credentials vault.
// Format (base64): iv(12 bytes) || ciphertext (includes auth tag).
//
// The master key is 32 random bytes, base64-encoded, in env.CREDENTIALS_ENCRYPTION_KEY.
// Rotate by keeping old key(s) and trying each on decrypt (not implemented yet).

const IV_LEN = 12;

function b64decode(s: string): Uint8Array {
  const binStr = atob(s);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
  return bytes;
}

function b64encode(bytes: Uint8Array): string {
  let binStr = "";
  for (const b of bytes) binStr += String.fromCharCode(b);
  return btoa(binStr);
}

async function importKey(rawBase64: string): Promise<CryptoKey> {
  const raw = b64decode(rawBase64);
  if (raw.length !== 32) {
    throw new Error(`CREDENTIALS_ENCRYPTION_KEY must be 32 bytes (got ${raw.length})`);
  }
  return crypto.subtle.importKey("raw", raw.buffer as ArrayBuffer, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export interface EncryptionEnv {
  CREDENTIALS_ENCRYPTION_KEY?: string;
}

function requireKey(env: EncryptionEnv): string {
  if (!env.CREDENTIALS_ENCRYPTION_KEY) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY is not configured");
  }
  return env.CREDENTIALS_ENCRYPTION_KEY;
}

/** Encrypt a string. Returns base64 of (iv || ciphertext). */
export async function encrypt(plaintext: string, env: EncryptionEnv): Promise<string> {
  const key = await importKey(requireKey(env));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const encoded = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, key, encoded.buffer as ArrayBuffer);
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.length);
  return b64encode(combined);
}

/** Decrypt a string previously produced by `encrypt`. */
export async function decrypt(ciphertextB64: string, env: EncryptionEnv): Promise<string> {
  const key = await importKey(requireKey(env));
  const combined = b64decode(ciphertextB64);
  if (combined.length < IV_LEN + 16) throw new Error("ciphertext too short");
  const iv = combined.slice(0, IV_LEN);
  const ct = combined.slice(IV_LEN);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, key, ct.buffer as ArrayBuffer);
  return new TextDecoder().decode(plain);
}

/** Encrypt a JSON-serialisable value. */
export async function encryptJson(value: unknown, env: EncryptionEnv): Promise<string> {
  return encrypt(JSON.stringify(value), env);
}

/** Decrypt to a JSON value. */
export async function decryptJson<T = unknown>(ciphertextB64: string, env: EncryptionEnv): Promise<T> {
  const s = await decrypt(ciphertextB64, env);
  return JSON.parse(s) as T;
}
