import { describe, expect, it } from "vitest";
import { requireNonEmptyString } from "../require-non-empty-string";

describe("requireNonEmptyString", () => {
  it("accepts trimmed non-empty strings", () => {
    expect(requireNonEmptyString("  hello  ", "value")).toEqual({
      ok: true,
      value: "hello",
    });
  });

  it("rejects empty strings", () => {
    expect(requireNonEmptyString("   ", "value")).toEqual({
      ok: false,
      error: "value must be a non-empty string",
    });
  });
});

