import { recordRuntimeNotification } from "@/lib/state/runtime-store";
import { getRuntimeProfile } from "@/lib/state/runtime-store";
import { sendTransactionalEmail } from "@/integrations/resend/send-transactional-email";

export interface SendNotificationPayload {
  user_id: string;
  title: string;
  body: string;
  request_id: string;
}

export interface SendNotificationResult {
  delivered: boolean;
  notification_id: string;
  email_delivered: boolean;
  delivery_provider: "runtime" | "resend";
  provider_event_id: string | null;
  error_message: string | null;
}

export async function sendNotification(
  payload: SendNotificationPayload,
  env?: Pick<Env, "RESEND_API_KEY" | "RESEND_FROM_EMAIL">,
): Promise<SendNotificationResult> {
  const profile = getRuntimeProfile(payload.user_id);
  const recipientEmail = profile?.email ?? "";
  let emailDelivered = false;
  let deliveryProvider: "runtime" | "resend" = "runtime";
  let providerEventId: string | null = null;
  let errorMessage: string | null = null;

  if (env?.RESEND_API_KEY && recipientEmail) {
    const emailResult = await sendTransactionalEmail(
      {
        to: recipientEmail,
        subject: payload.title,
        html: `<p>${payload.body}</p>`,
        text: payload.body,
      },
      env,
    );

    emailDelivered = emailResult.sent;
    deliveryProvider = "resend";
    providerEventId = emailResult.email_id;
    errorMessage = emailResult.error_message;
  }

  recordRuntimeNotification({
    user_id: payload.user_id,
    type: "application_notification",
    title: payload.title,
    body: payload.body,
    delivery_provider: deliveryProvider,
    provider_event_id: providerEventId ?? undefined,
  });

  return {
    delivered: true,
    notification_id: `${payload.user_id}:${payload.request_id}`,
    email_delivered: emailDelivered,
    delivery_provider: deliveryProvider,
    provider_event_id: providerEventId,
    error_message: errorMessage,
  };
}
