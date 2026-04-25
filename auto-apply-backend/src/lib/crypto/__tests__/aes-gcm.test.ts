import { describe, it, expect } from "vitest";
import { encrypt, decrypt, encryptJson, decryptJson } from "../aes-gcm";

// Node 20+ has WebCrypto globally. If not, test env fails — that's expected.
const TEST_KEY = "a".repeat(44); // not a real 32-byte key base64
// Generate a proper 32-byte key encoded as base64 for tests
function makeKey(): string {
  const raw = new Uint8Array(32);
  for (let i = 0; i < 32; i++) raw[i] = i * 7 % 256;
  let s = "";
  for (const b of raw) s += String.fromCharCode(b);
  return btoa(s);
}

describe("aes-gcm encrypt/decrypt", () => {
  const env = { CREDENTIALS_ENCRYPTION_KEY: makeKey() };

  it("round-trips a plain string", async () => {
    const ct = await encrypt("hello world", env);
    expect(ct).not.toBe("hello world");
    expect(ct.length).toBeGreaterThan(0);
    const pt = await decrypt(ct, env);
    expect(pt).toBe("hello world");
  });

  it("produces different ciphertext each call (random IV)", async () => {
    const a = await encrypt("secret", env);
    const b = await encrypt("secret", env);
    expect(a).not.toBe(b);
    expect(await decrypt(a, env)).toBe("secret");
    expect(await decrypt(b, env)).toBe("secret");
  });

  it("round-trips JSON", async () => {
    const payload = { mfa: "123456", nickname: "Main", arr: [1, 2, 3] };
    const ct = await encryptJson(payload, env);
    const pt = await decryptJson(ct, env);
    expect(pt).toEqual(payload);
  });

  it("throws when key is missing", async () => {
    await expect(encrypt("x", {})).rejects.toThrow(/CREDENTIALS_ENCRYPTION_KEY/);
    await expect(decrypt("x", {})).rejects.toThrow(/CREDENTIALS_ENCRYPTION_KEY/);
  });

  it("throws when key is wrong length", async () => {
    await expect(encrypt("x", { CREDENTIALS_ENCRYPTION_KEY: "dGVzdA==" })).rejects.toThrow(/32 bytes/);
  });

  it("throws on ciphertext tamper", async () => {
    const ct = await encrypt("hello", env);
    const tampered = ct.slice(0, -4) + "AAAA";
    await expect(decrypt(tampered, env)).rejects.toBeDefined();
  });

  it("throws on ciphertext too short", async () => {
    await expect(decrypt("AAAA", env)).rejects.toThrow(/too short/);
  });

  it("handles empty string", async () => {
    const ct = await encrypt("", env);
    expect(await decrypt(ct, env)).toBe("");
  });

  it("handles unicode", async () => {
    const s = "password! 🔒 テスト";
    const ct = await encrypt(s, env);
    expect(await decrypt(ct, env)).toBe(s);
  });
});
