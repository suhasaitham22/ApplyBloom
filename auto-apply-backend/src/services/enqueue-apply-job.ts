import { queueNames } from "@/lib/queues/queue-names";
import type { ApplyJobQueueMessage } from "@/lib/queues/queue-message-types";
import type { EnqueuedJob } from "@/services/enqueue-parse-resume-job";
import { processApplyJob } from "@/workers/process-apply-job";

export async function enqueueApplyJob(payload: {
  user_id: string;
  job_id: string;
  resume_artifact_id: string;
  apply_mode: "manual_review" | "auto_apply" | "save_for_later";
  request_id: string;
}, env?: Env) {
  const message: ApplyJobQueueMessage = {
    type: "apply_job",
    user_id: payload.user_id,
    job_id: payload.job_id,
    resume_artifact_id: payload.resume_artifact_id,
    apply_mode: payload.apply_mode,
    request_id: payload.request_id,
  };

  if (env?.DEV_IMMEDIATE_QUEUE_PROCESSING === "true") {
    await processApplyJob({
      user_id: message.user_id,
      job_id: message.job_id,
      resume_artifact_id: message.resume_artifact_id,
      apply_mode: message.apply_mode,
      request_id: message.request_id,
    }, env);
  }

  return {
    queue_name: queueNames.applyJob,
    message,
  } satisfies EnqueuedJob<ApplyJobQueueMessage>;
}
