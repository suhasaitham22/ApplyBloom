import { describe, expect, it } from "vitest";
import { requireArrayOfStrings } from "../require-array-of-strings";

describe("requireArrayOfStrings", () => {
  it("accepts arrays of strings", () => {
    expect(requireArrayOfStrings(["  a  ", "b"], "skills")).toEqual({
      ok: true,
      value: ["a", "b"],
    });
  });

  it("rejects mixed arrays", () => {
    expect(requireArrayOfStrings(["a", 1], "skills")).toEqual({
      ok: false,
      error: "skills must be an array of strings",
    });
  });
});

