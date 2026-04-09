import { describe, expect, it, vi } from "vitest";
import { processNotifyUserJob } from "../process-notify-user-job";

vi.mock("@/services/send-notification", () => ({
  sendNotification: vi.fn().mockResolvedValue({
    delivered: true,
    notification_id: "user_123:req_123",
  }),
}));

describe("processNotifyUserJob", () => {
  it("returns a delivered result", async () => {
    await expect(
      processNotifyUserJob({
        user_id: "user_123",
        title: "Notice",
        body: "Body",
        request_id: "req_123",
      }),
    ).resolves.toEqual({
      delivered: true,
    });
  });
});

