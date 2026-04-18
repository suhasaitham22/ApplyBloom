import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}));

import { supabaseEnabled } from "../client";

describe("supabaseEnabled", () => {
  it("returns false when no credentials", () => {
    expect(supabaseEnabled({})).toBe(false);
  });

  it("returns false when only URL", () => {
    expect(supabaseEnabled({ SUPABASE_URL: "https://x.supabase.co" })).toBe(false);
  });

  it("returns false when only key", () => {
    expect(supabaseEnabled({ SUPABASE_SERVICE_ROLE_KEY: "key" })).toBe(false);
  });

  it("returns true when both present", () => {
    expect(supabaseEnabled({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "key" })).toBe(true);
  });
});
