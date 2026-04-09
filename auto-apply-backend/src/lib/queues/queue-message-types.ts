export interface ParseResumeQueueMessage {
  type: "parse_resume";
  user_id: string;
  artifact_id: string;
  resume_text?: string;
  request_id: string;
}

export interface FetchJobsQueueMessage {
  type: "fetch_jobs";
  user_id: string;
  profile_id: string;
  request_id: string;
}

export interface MatchJobsQueueMessage {
  type: "match_jobs";
  user_id: string;
  profile_id: string;
  request_id: string;
}

export interface TailorResumeQueueMessage {
  type: "tailor_resume";
  user_id: string;
  profile_id: string;
  job_id: string;
  mode: "manual" | "auto";
  request_id: string;
}

export interface ApplyJobQueueMessage {
  type: "apply_job";
  user_id: string;
  job_id: string;
  resume_artifact_id: string;
  apply_mode: "manual_review" | "auto_apply" | "save_for_later";
  request_id: string;
}

export interface NotifyUserQueueMessage {
  type: "notify_user";
  user_id: string;
  title: string;
  body: string;
  request_id: string;
}
