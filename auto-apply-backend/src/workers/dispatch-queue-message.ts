import { processApplyJob } from "@/workers/process-apply-job";
import { processFetchJobsJob } from "@/workers/process-fetch-jobs-job";
import { processMatchJobsJob } from "@/workers/process-match-jobs-job";
import { processNotifyUserJob } from "@/workers/process-notify-user-job";
import { processParseResumeJob } from "@/workers/process-parse-resume-job";
import { processTailorResumeJob } from "@/workers/process-tailor-resume-job";

export type QueueMessage =
  | {
      type: "parse_resume";
      user_id: string;
      artifact_id: string;
      resume_text?: string;
      request_id: string;
    }
  | {
      type: "fetch_jobs";
      user_id: string;
      profile_id: string;
      request_id: string;
    }
  | {
      type: "match_jobs";
      user_id: string;
      profile_id: string;
      request_id: string;
    }
  | {
      type: "tailor_resume";
      user_id: string;
      profile_id: string;
      job_id: string;
      mode: "manual" | "auto";
      request_id: string;
    }
  | {
      type: "apply_job";
      user_id: string;
      job_id: string;
      resume_artifact_id: string;
      apply_mode: "manual_review" | "auto_apply" | "save_for_later";
      request_id: string;
    }
  | {
      type: "notify_user";
      user_id: string;
      title: string;
      body: string;
      request_id: string;
    };

export async function dispatchQueueMessage(
  message: QueueMessage,
  env?: Pick<
    Env,
    "RESEND_API_KEY" | "RESEND_FROM_EMAIL" | "GREENHOUSE_BOARD_TOKENS" | "LEVER_COMPANY_TOKENS"
  >,
) {
  switch (message.type) {
    case "parse_resume":
      return processParseResumeJob(message);
    case "fetch_jobs":
      return processFetchJobsJob(message, env);
    case "match_jobs":
      return processMatchJobsJob(message);
    case "tailor_resume":
      return processTailorResumeJob(message);
    case "apply_job":
      return processApplyJob(message, env);
    case "notify_user":
      return processNotifyUserJob(message, env);
  }
}
