import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/demo", () => ({
  DEMO_COOKIE_NAME: "ab_demo_user",
}));

function makeRequest(url: string, cookies: Record<string, string> = {}, headers: Record<string, string> = {}) {
  const nextUrl = new URL(url, "http://localhost:3000");
  // Add clone() method that URL doesn't have natively
  (nextUrl as any).clone = () => {
    const cloned = new URL(nextUrl.href);
    (cloned as any).clone = (nextUrl as any).clone;
    return cloned;
  };
  const hdrs = new Headers(headers);
  return {
    nextUrl,
    headers: hdrs,
    cookies: {
      get: (name: string) => cookies[name] ? { value: cookies[name] } : undefined,
    },
  };
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    delete process.env.NEXT_PUBLIC_DEMO_USER_ID;
  });

  it("redirects unauthenticated user from /studio to /login", async () => {
    vi.resetModules();
    const { middleware } = await import("../middleware");
    const req = makeRequest("http://localhost:3000/studio");
    const res = await middleware(req as any);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("redirects unauthenticated user from /dashboard to /login", async () => {
    vi.resetModules();
    const { middleware } = await import("../middleware");
    const req = makeRequest("http://localhost:3000/dashboard");
    const res = await middleware(req as any);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("sets x-request-id header", async () => {
    vi.resetModules();
    const { middleware } = await import("../middleware");
    const req = makeRequest("http://localhost:3000/");
    const res = await middleware(req as any);
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("preserves existing x-request-id", async () => {
    vi.resetModules();
    const { middleware } = await import("../middleware");
    const req = makeRequest("http://localhost:3000/", {}, { "x-request-id": "custom-id" });
    const res = await middleware(req as any);
    expect(res.headers.get("x-request-id")).toBe("custom-id");
  });

  it("allows non-protected routes", async () => {
    vi.resetModules();
    const { middleware } = await import("../middleware");
    const req = makeRequest("http://localhost:3000/");
    const res = await middleware(req as any);
    expect(res.status).toBe(200);
  });

  it("auto-grants demo session when DEMO_MODE is on", async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    process.env.NEXT_PUBLIC_DEMO_USER_ID = "demo123";
    vi.resetModules();
    const { middleware } = await import("../middleware");
    const req = makeRequest("http://localhost:3000/studio");
    const res = await middleware(req as any);
    expect(res.status).toBe(200);
  });

  it("reads demo cookie when DEMO_MODE is on", async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    vi.resetModules();
    const { middleware } = await import("../middleware");
    const req = makeRequest("http://localhost:3000/studio", { ab_demo_user: "demo-user-1" });
    const res = await middleware(req as any);
    expect(res.status).toBe(200);
  });

  it("clears stale demo cookie when DEMO_MODE is off", async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "false";
    vi.resetModules();
    const { middleware } = await import("../middleware");
    const req = makeRequest("http://localhost:3000/", { ab_demo_user: "stale" });
    const res = await middleware(req as any);
    expect(res.status).toBe(200);
  });

  it("redirects authenticated user away from /login", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
    mockGetUser.mockResolvedValue({ data: { user: { id: "user1" } } });
    vi.resetModules();
    const { middleware } = await import("../middleware");
    const req = makeRequest("http://localhost:3000/login");
    const res = await middleware(req as any);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/studio");
  });

  it("allows authenticated user on /studio", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
    mockGetUser.mockResolvedValue({ data: { user: { id: "user1" } } });
    vi.resetModules();
    const { middleware } = await import("../middleware");
    const req = makeRequest("http://localhost:3000/studio/s1");
    const res = await middleware(req as any);
    expect(res.status).toBe(200);
  });

  it("includes next param in login redirect", async () => {
    vi.resetModules();
    const { middleware } = await import("../middleware");
    const req = makeRequest("http://localhost:3000/studio/abc?foo=bar");
    const res = await middleware(req as any);
    const location = res.headers.get("location") || "";
    expect(location).toContain("next=");
  });

  it("redirects authenticated user from /signup to /studio", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    vi.resetModules();
    const { middleware } = await import("../middleware");
    const req = makeRequest("http://localhost:3000/signup");
    const res = await middleware(req as any);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/studio");
  });

  it("exports matcher config", async () => {
    vi.resetModules();
    const mod = await import("../middleware");
    expect(mod.config).toBeDefined();
    expect(mod.config.matcher).toBeDefined();
  });
});
