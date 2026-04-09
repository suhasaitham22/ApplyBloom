import { submitApplication } from "@/services/submit-application";
import { storeApplicationEvent } from "@/services/store-application-event";
import { sendNotification } from "@/services/send-notification";

export async function processApplyJob(message: {
  user_id: string;
  job_id: string;
  resume_artifact_id: string;
  apply_mode: "manual_review" | "auto_apply" | "save_for_later";
  request_id: string;
}, env?: Pick<Env, "RESEND_API_KEY" | "RESEND_FROM_EMAIL">) {
  const result = await submitApplication(message);

  await storeApplicationEvent({
    user_id: message.user_id,
    job_id: message.job_id,
    request_id: message.request_id,
    event_type:
      result.next_action === "saved_for_later"
        ? "application_saved"
        : result.next_action === "manual_review_required"
          ? "application_planned"
          : "application_submitted",
    metadata: result,
  });

  await sendNotification({
    user_id: message.user_id,
    title: result.submitted ? "Application submitted" : "Application queued for review",
    body: result.submitted
      ? `Your application for job ${message.job_id} was submitted.`
      : `Your application for job ${message.job_id} is waiting for review.`,
    request_id: message.request_id,
  }, env);

  return result;
}
