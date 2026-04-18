import { describe, it, expect } from "vitest";
import { ApiError, isProblem } from "../problem";

describe("isProblem", () => {
  it("accepts valid problem+json shape", () => {
    expect(isProblem({ title: "x", status: 500 })).toBe(true);
  });
  it("rejects non-objects", () => {
    expect(isProblem(null)).toBe(false);
    expect(isProblem("err")).toBe(false);
    expect(isProblem(undefined)).toBe(false);
  });
  it("rejects objects missing title or status", () => {
    expect(isProblem({ title: "x" })).toBe(false);
    expect(isProblem({ status: 500 })).toBe(false);
  });
});

describe("ApiError", () => {
  it("preserves problem + requestId + message", () => {
    const p = { title: "boom", status: 400, code: "bad_input" };
    const err = new ApiError(p, "req-123");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("boom");
    expect(err.problem).toEqual(p);
    expect(err.requestId).toBe("req-123");
  });
});
