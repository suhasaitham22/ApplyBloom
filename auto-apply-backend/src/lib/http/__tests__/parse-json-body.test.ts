import { describe, expect, it } from "vitest";
import { parseJsonBody } from "../parse-json-body";

describe("parseJsonBody", () => {
  it("parses valid JSON", async () => {
    const request = new Request("https://example.com", {
      method: "POST",
      body: JSON.stringify({ value: "ok" }),
    });

    const result = await parseJsonBody<{ value: string }>(request);

    expect(result).toEqual({
      ok: true,
      data: {
        value: "ok",
      },
    });
  });

  it("returns an error response for invalid JSON", async () => {
    const request = new Request("https://example.com", {
      method: "POST",
      body: "{",
    });

    const result = await parseJsonBody(request);

    if (result.ok) {
      throw new Error("Expected invalid JSON to fail parsing");
    }

    expect(result.response.status).toBe(400);
  });
});
