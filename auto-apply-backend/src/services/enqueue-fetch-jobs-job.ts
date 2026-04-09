import { queueNames } from "@/lib/queues/queue-names";
import type { FetchJobsQueueMessage } from "@/lib/queues/queue-message-types";
import type { EnqueuedJob } from "@/services/enqueue-parse-resume-job";

export async function enqueueFetchJobsJob(payload: {
  user_id: string;
  profile_id: string;
  request_id: string;
}) {
  const message: FetchJobsQueueMessage = {
    type: "fetch_jobs",
    user_id: payload.user_id,
    profile_id: payload.profile_id,
    request_id: payload.request_id,
  };

  return {
    queue_name: queueNames.fetchJobs,
    message,
  } satisfies EnqueuedJob<FetchJobsQueueMessage>;
}

