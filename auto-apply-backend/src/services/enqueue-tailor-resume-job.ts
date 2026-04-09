import { queueNames } from "@/lib/queues/queue-names";
import type { TailorResumeQueueMessage } from "@/lib/queues/queue-message-types";
import type { EnqueuedJob } from "@/services/enqueue-parse-resume-job";

export async function enqueueTailorResumeJob(payload: {
  user_id: string;
  profile_id: string;
  job_id: string;
  mode: "manual" | "auto";
  request_id: string;
}) {
  const message: TailorResumeQueueMessage = {
    type: "tailor_resume",
    user_id: payload.user_id,
    profile_id: payload.profile_id,
    job_id: payload.job_id,
    mode: payload.mode,
    request_id: payload.request_id,
  };

  return {
    queue_name: queueNames.tailorResume,
    message,
  } satisfies EnqueuedJob<TailorResumeQueueMessage>;
}
