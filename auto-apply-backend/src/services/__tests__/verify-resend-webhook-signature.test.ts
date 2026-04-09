import { describe, expect, it, vi } from "vitest";
import { verifyResendWebhookSignature } from "../verify-resend-webhook-signature";

vi.mock("svix", () => {
  const verify = vi.fn().mockReturnValue({ type: "email.delivered" });

  return {
    Webhook: vi.fn().mockImplementation(() => ({
      verify,
    })),
  };
});

describe("verifyResendWebhookSignature", () => {
  it("verifies the raw webhook payload", async () => {
    const request = new Request("https://example.com/api/v1/webhooks/resend", {
      method: "POST",
      headers: {
        "svix-id": "msg_123",
        "svix-timestamp": "1710000000",
        "svix-signature": "v1.signature",
      },
      body: JSON.stringify({ type: "email.delivered" }),
    });

    await expect(
      verifyResendWebhookSignature(request, {
        API_VERSION: "v1",
        RESEND_WEBHOOK_SECRET: "whsec_test",
      } as Env),
    ).resolves.toEqual({ type: "email.delivered" });
  });
});
