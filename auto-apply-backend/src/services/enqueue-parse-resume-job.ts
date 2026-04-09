import { queueNames } from "@/lib/queues/queue-names";
import type { ParseResumeQueueMessage } from "@/lib/queues/queue-message-types";
import { processParseResumeJob } from "@/workers/process-parse-resume-job";

export interface EnqueuedJob<TMessage> {
  queue_name: string;
  message: TMessage;
}

export async function enqueueParseResumeJob(payload: {
  user_id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  resume_text?: string;
  request_id: string;
}, env?: Env) {
  const message: ParseResumeQueueMessage = {
    type: "parse_resume",
    user_id: payload.user_id,
    artifact_id: payload.storage_path,
    resume_text: payload.resume_text,
    request_id: payload.request_id,
  };

  if (env?.DEV_IMMEDIATE_QUEUE_PROCESSING === "true") {
    await processParseResumeJob({
      user_id: message.user_id,
      artifact_id: message.artifact_id,
      resume_text: message.resume_text,
      request_id: message.request_id,
    });
  }

  return {
    queue_name: queueNames.parseResume,
    message,
  } satisfies EnqueuedJob<ParseResumeQueueMessage>;
}
