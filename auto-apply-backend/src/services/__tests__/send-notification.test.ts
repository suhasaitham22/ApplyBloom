import { describe, expect, it } from "vitest";
import { resetRuntimeStore, saveRuntimeProfile } from "@/lib/state/runtime-store";
import { sendNotification } from "../send-notification";

describe("sendNotification", () => {
  it("returns a notification delivery result", async () => {
    resetRuntimeStore();
    saveRuntimeProfile({
      user_id: "user_123",
      email: "user@example.com",
      full_name: "Jane Doe",
      headline: "Backend Engineer",
      skills: ["TypeScript"],
      years_experience: 5,
      summary: "Summary",
      updated_at: new Date().toISOString(),
    });

    await expect(
      sendNotification({
        user_id: "user_123",
        title: "Application submitted",
        body: "Your application was submitted.",
        request_id: "req_123",
      }),
    ).resolves.toMatchObject({
      delivered: true,
      notification_id: "user_123:req_123",
      delivery_provider: "runtime",
    });
  });

  it("sends a Resend email when the API key and recipient email are available", async () => {
    resetRuntimeStore();
    saveRuntimeProfile({
      user_id: "user_123",
      email: "user@example.com",
      full_name: "Jane Doe",
      headline: "Backend Engineer",
      skills: ["TypeScript"],
      years_experience: 5,
      summary: "Summary",
      updated_at: new Date().toISOString(),
    });

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
    );

    await expect(
      sendNotification(
        {
          user_id: "user_123",
          title: "Application submitted",
          body: "Your application was submitted.",
          request_id: "req_123",
        },
        {
          RESEND_API_KEY: "re_test",
          RESEND_FROM_EMAIL: "ApplyBoom <onboarding@resend.dev>",
        },
      ),
    ).resolves.toMatchObject({
      delivered: true,
      notification_id: "user_123:req_123",
      delivery_provider: "resend",
      email_delivered: true,
      provider_event_id: "email_123",
      error_message: null,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockRestore();
  });
});
