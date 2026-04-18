import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ auth: {} })),
}));

describe("supabaseBrowserClient", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("returns null when env vars are not set", async () => {
    const mod = await import("../supabase-browser-client");
    expect(mod.supabaseBrowserClient).toBeNull();
  });

  it("creates client when env vars are set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
    const mod = await import("../supabase-browser-client");
    expect(mod.supabaseBrowserClient).toBeTruthy();
  });
});
