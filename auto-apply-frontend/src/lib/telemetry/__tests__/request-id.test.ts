import { describe, it, expect, vi } from "vitest";
import { newRequestId, log } from "../request-id";

describe("newRequestId", () => {
  it("returns a UUID when crypto.randomUUID is available", () => {
    const result = newRequestId();
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("returns a non-empty string id", () => {
    const result = newRequestId();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("log", () => {
  it("logs error level to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    log("error", "test error", { requestId: "r1" });
    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("error");
    expect(parsed.msg).toBe("test error");
    expect(parsed.requestId).toBe("r1");
    spy.mockRestore();
  });

  it("logs warn level to console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    log("warn", "test warn");
    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("warn");
    spy.mockRestore();
  });

  it("logs info level to console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log("info", "test info", { userId: "u1", sessionId: "s1" });
    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("info");
    expect(parsed.userId).toBe("u1");
    expect(parsed.sessionId).toBe("s1");
    spy.mockRestore();
  });

  it("logs debug level to console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log("debug", "test debug");
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("includes timestamp", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log("info", "ts test");
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.ts).toBeDefined();
    expect(new Date(parsed.ts).getTime()).not.toBeNaN();
    spy.mockRestore();
  });
});
