import { describe, it, expect, vi } from "vitest";

vi.mock("@/services/verify-resend-webhook-signature", () => ({
  verifyResendWebhookSignature: vi.fn(),
}));

import { handleResendWebhookRequest } from "../resend";
import { verifyResendWebhookSignature } from "@/services/verify-resend-webhook-signature";

const mockVerify = vi.mocked(verifyResendWebhookSignature);

describe("handleResendWebhookRequest", () => {
  it("rejects non-POST requests", async () => {
    const req = new Request("https://example.com/webhooks/resend", { method: "GET" });
    const res = await handleResendWebhookRequest(req, {} as any);
    expect(res.status).toBe(405);
  });

  it("returns accepted on valid webhook", async () => {
    mockVerify.mockResolvedValueOnce({ type: "email.delivered" });
    const req = new Request("https://example.com/webhooks/resend", {
      method: "POST",
      body: JSON.stringify({ type: "email.delivered" }),
    });
    const res = await handleResendWebhookRequest(req, {} as any);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.status).toBe("accepted");
    expect(body.data.event_type).toBe("email.delivered");
  });

  it("returns 400 on signature verification failure", async () => {
    mockVerify.mockRejectedValueOnce(new Error("Invalid signature"));
    const req = new Request("https://example.com/webhooks/resend", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await handleResendWebhookRequest(req, {} as any);
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.data.status).toBe("rejected");
    expect(body.data.error_message).toContain("Invalid signature");
  });

  it("handles non-Error throw", async () => {
    mockVerify.mockRejectedValueOnce("string error");
    const req = new Request("https://example.com/webhooks/resend", {
      method: "POST",
      body: "{}",
    });
    const res = await handleResendWebhookRequest(req, {} as any);
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.data.error_message).toBe("Invalid webhook signature");
  });
});
