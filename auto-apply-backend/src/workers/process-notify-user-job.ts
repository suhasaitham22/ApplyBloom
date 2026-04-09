import { sendNotification } from "@/services/send-notification";

export async function processNotifyUserJob(message: {
  user_id: string;
  title: string;
  body: string;
  request_id: string;
}, env?: Pick<Env, "RESEND_API_KEY" | "RESEND_FROM_EMAIL">) {
  await sendNotification(message, env);
  return {
    delivered: true,
  };
}
