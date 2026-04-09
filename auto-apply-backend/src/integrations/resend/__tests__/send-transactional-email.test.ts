import { describe, expect, it, vi } from "vitest";
import { sendTransactionalEmail } from "../send-transactional-email";

describe("sendTransactionalEmail", () => {
  it("skips when no API key is configured", async () => {
    await expect(
      sendTransactionalEmail(
        {
          to: "user@example.com",
          subject: "Hello",
          html: "<p>Hello</p>",
        },
        {},
      ),
    ).resolves.toEqual({
      sent: false,
      email_id: null,
      error_message: "RESEND_API_KEY is not configured",
    });
  });

  it("posts an email request to Resend", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
    );

    const result = await sendTransactionalEmail(
      {
        to: "user@example.com",
        subject: "Hello",
        html: "<p>Hello</p>",
      },
      {
        RESEND_API_KEY: "re_test",
        RESEND_FROM_EMAIL: "ApplyBloom <onboarding@resend.dev>",
      },
    );

    expect(result).toEqual({
      sent: true,
      email_id: "email_123",
      error_message: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockRestore();
  });
});
