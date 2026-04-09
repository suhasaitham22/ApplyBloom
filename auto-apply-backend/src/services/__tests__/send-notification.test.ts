import { describe, expect, it } from "vitest";
import { sendNotification } from "../send-notification";

describe("sendNotification", () => {
  it("returns a notification delivery result", async () => {
    await expect(
      sendNotification({
        user_id: "user_123",
        title: "Application submitted",
        body: "Your application was submitted.",
        request_id: "req_123",
      }),
    ).resolves.toEqual({
      delivered: true,
      notification_id: "user_123:req_123",
    });
  });
});

