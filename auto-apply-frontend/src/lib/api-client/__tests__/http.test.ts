import { describe, it, expect, vi, beforeEach } from "vitest";
import { httpJson } from "../http";
import { ApiError } from "../problem";

describe("httpJson", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  function mockResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
    const text = typeof body === "string" ? body : JSON.stringify(body);
    const headers = new Headers(init.headers);
    return {
      ok: (init.status ?? 200) < 400,
      status: init.status ?? 200,
      headers,
      text: () => Promise.resolve(text),
    } as unknown as Response;
  }

  it("GET returns parsed JSON on 200", async () => {
    global.fetch = vi.fn().mockResolvedValue(mockResponse({ data: { hello: "world" } }));
    const result = await httpJson<{ data: { hello: string } }>("/ok");
    expect(result).toEqual({ data: { hello: "world" } });
  });

  it("throws ApiError for problem+json on 4xx", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockResponse({ title: "Validation failed", status: 400, code: "bad_input" }, { status: 400 }),
    );
    await expect(httpJson("/bad")).rejects.toBeInstanceOf(ApiError);
  });

  it("throws ApiError with synthetic problem when body is not problem+json", async () => {
    global.fetch = vi.fn().mockResolvedValue(mockResponse("plain text error", { status: 500 }));
    try {
      await httpJson("/broken");
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.problem.status).toBe(500);
      expect(err.problem.title).toBe("HTTP 500");
    }
  });

  it("sends Authorization header when token is provided", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse({ ok: true }));
    global.fetch = fetchSpy;
    await httpJson("/me", { token: "abc123" });
    const call = fetchSpy.mock.calls[0];
    const headers = call[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer abc123");
  });

  it("sends Idempotency-Key header when provided", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse({ ok: true }));
    global.fetch = fetchSpy;
    await httpJson("/x", { idempotencyKey: "key-xyz", body: { a: 1 } });
    const headers = fetchSpy.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("key-xyz");
  });

  it("always sends a fresh x-request-id", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse({ ok: true }));
    global.fetch = fetchSpy;
    await httpJson("/a");
    await httpJson("/b");
    const h1 = fetchSpy.mock.calls[0][1].headers as Record<string, string>;
    const h2 = fetchSpy.mock.calls[1][1].headers as Record<string, string>;
    expect(h1["x-request-id"]).toBeTruthy();
    expect(h2["x-request-id"]).toBeTruthy();
    expect(h1["x-request-id"]).not.toBe(h2["x-request-id"]);
  });

  it("defaults method to POST when body is present, GET otherwise", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse({ ok: true }));
    global.fetch = fetchSpy;
    await httpJson("/a");
    expect(fetchSpy.mock.calls[0][1].method).toBe("GET");
    await httpJson("/b", { body: { x: 1 } });
    expect(fetchSpy.mock.calls[1][1].method).toBe("POST");
  });
});
