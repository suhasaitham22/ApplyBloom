/**
 * Unified notification service. Uses Resend when configured; otherwise logs
 * the email body into the in-memory notification feed so the UI can still show it.
 */
export interface ApplicationEmailPayload {
  to: string;
  job_title: string;
  company: string;
  status: "submitted" | "saved_for_later";
  apply_url?: string;
}

export interface NotificationResult {
  delivered: boolean;
  provider: "resend" | "inbox";
  provider_event_id: string | null;
  message: string;
}

export async function sendApplicationEmail(
  payload: ApplicationEmailPayload,
  env: Pick<Env, "RESEND_API_KEY" | "RESEND_FROM_EMAIL">,
): Promise<NotificationResult> {
  const subject =
    payload.status === "submitted"
      ? `Applied: ${payload.job_title}${payload.company ? ` at ${payload.company}` : ""}`
      : `Saved for later: ${payload.job_title}`;
  const bodyText =
    payload.status === "submitted"
      ? `You marked your application for ${payload.job_title}${
          payload.company ? ` at ${payload.company}` : ""
        } as submitted.${payload.apply_url ? `\n\nJob link: ${payload.apply_url}` : ""}`
      : `You saved ${payload.job_title} for later review.`;

  if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL && payload.to) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.RESEND_FROM_EMAIL,
          to: [payload.to],
          subject,
          text: bodyText,
          html: `<p>${bodyText.replace(/\n/g, "<br/>")}</p>`,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { id?: string };
        return {
          delivered: true,
          provider: "resend",
          provider_event_id: data.id ?? null,
          message: "Email sent via Resend",
        };
      }
      return {
        delivered: false,
        provider: "resend",
        provider_event_id: null,
        message: `Resend error: HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        delivered: false,
        provider: "resend",
        provider_event_id: null,
        message:
          "Resend request failed: " +
          (error instanceof Error ? error.message : "unknown"),
      };
    }
  }

  // Degraded path: no Resend key. Surface in in-app inbox only.
  return {
    delivered: false,
    provider: "inbox",
    provider_event_id: null,
    message:
      "Resend not configured — notification visible in in-app inbox only. Set RESEND_API_KEY and RESEND_FROM_EMAIL to enable email.",
  };
}
