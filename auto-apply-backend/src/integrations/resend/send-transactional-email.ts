export interface SendTransactionalEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  idempotencyKey?: string;
}

export interface SendTransactionalEmailResult {
  sent: boolean;
  email_id: string | null;
  error_message: string | null;
}

export async function sendTransactionalEmail(
  payload: SendTransactionalEmailPayload,
  env: Pick<Env, "RESEND_API_KEY" | "RESEND_FROM_EMAIL">,
): Promise<SendTransactionalEmailResult> {
  if (!env.RESEND_API_KEY) {
    return {
      sent: false,
      email_id: null,
      error_message: "RESEND_API_KEY is not configured",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": "ApplyBloom/1.0",
      ...(payload.idempotencyKey ? { "Idempotency-Key": payload.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: payload.from ?? env.RESEND_FROM_EMAIL ?? "ApplyBloom <onboarding@resend.dev>",
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      ...(payload.text ? { text: payload.text } : {}),
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
    }),
  });

  if (!response.ok) {
    return {
      sent: false,
      email_id: null,
      error_message: `Resend email request failed with status ${response.status}`,
    };
  }

  const data = (await response.json()) as { id?: string };

  return {
    sent: true,
    email_id: data.id ?? null,
    error_message: null,
  };
}
