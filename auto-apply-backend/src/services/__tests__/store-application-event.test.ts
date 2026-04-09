import { describe, expect, it } from "vitest";
import { storeApplicationEvent } from "../store-application-event";

describe("storeApplicationEvent", () => {
  it("returns a stable event id", async () => {
    await expect(
      storeApplicationEvent({
        user_id: "user_123",
        request_id: "req_123",
        event_type: "resume_parsed",
        metadata: { skills: ["TypeScript"] },
      }),
    ).resolves.toEqual({
      stored: true,
      event_id: "user_123:resume_parsed:req_123",
    });
  });
});

