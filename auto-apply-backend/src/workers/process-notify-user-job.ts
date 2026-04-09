import { sendNotification } from "@/services/send-notification";

export async function processNotifyUserJob(message: {
  user_id: string;
  title: string;
  body: string;
  request_id: string;
}) {
  await sendNotification(message);
  return {
    delivered: true,
  };
}
