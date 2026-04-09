import { Webhook } from "svix";

export async function verifyResendWebhookSignature(request: Request, env: Env) {
  const webhookSecret = env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("RESEND_WEBHOOK_SECRET is not configured");
  }

  const payload = await request.text();
  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  const webhook = new Webhook(webhookSecret);
  return webhook.verify(payload, headers);
}
