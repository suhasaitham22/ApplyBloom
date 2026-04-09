import { describe, expect, it } from "vitest";
import { sendNotification } from "@/services/send-notification";
import { resetRuntimeStore } from "@/lib/state/runtime-store";
import { handleListNotificationsRequest } from "../list-notifications";

describe("handleListNotificationsRequest", () => {
  it("returns runtime notifications for the authenticated user", async () => {
    resetRuntimeStore();
    await sendNotification({
      user_id: "user_123",
      title: "Hello",
      body: "World",
      request_id: "req_123",
    });

    const request = new Request("https://example.com/api/v1/notifications", {
      method: "GET",
      headers: {
        Authorization: "Bearer user_123",
      },
    });

    const response = await handleListNotificationsRequest(request, {} as Env);

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { notifications: Array<{ id: string }> };
    };
    expect(body.data.notifications.length).toBeGreaterThan(0);
  });
});
