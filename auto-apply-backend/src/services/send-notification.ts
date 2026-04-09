import { recordRuntimeNotification } from "@/lib/state/runtime-store";

export interface SendNotificationPayload {
  user_id: string;
  title: string;
  body: string;
  request_id: string;
}

export interface SendNotificationResult {
  delivered: boolean;
  notification_id: string;
}

export async function sendNotification(
  payload: SendNotificationPayload,
): Promise<SendNotificationResult> {
  recordRuntimeNotification({
    user_id: payload.user_id,
    type: "application_notification",
    title: payload.title,
    body: payload.body,
  });

  return {
    delivered: true,
    notification_id: `${payload.user_id}:${payload.request_id}`,
  };
}
