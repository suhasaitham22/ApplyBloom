import { describe, expect, it } from "vitest";
import { errorResponse } from "../error-response";

describe("errorResponse", () => {
  it("returns the standard error shape", async () => {
    const response = errorResponse(
      "validation_error",
      "Missing file",
      400,
      { field: "file_name" },
      "req_123",
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "validation_error",
        message: "Missing file",
        details: {
          field: "file_name",
        },
      },
      meta: {
        request_id: "req_123",
      },
    });
  });
});

