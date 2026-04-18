import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("merges conditional classes", () => {
    expect(cn("a", "b")).toBe("a b");
    expect(cn("a", false && "b", "c")).toBe("a c");
    expect(cn("a", null, undefined, "b")).toBe("a b");
  });
  it("dedupes conflicting tailwind utilities (twMerge)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });
  it("preserves unrelated utilities", () => {
    expect(cn("flex", "p-4", "bg-red-500")).toBe("flex p-4 bg-red-500");
  });
});
