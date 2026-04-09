export interface UploadResumeRequestBody {
  file_name: string;
  file_type: string;
  storage_path: string;
  resume_text?: string;
}

export interface MatchJobsRequestBody {
  limit?: number;
  filters?: {
    remote?: boolean;
    location?: string;
  };
}

export interface TailorResumeRequestBody {
  job_id: string;
  mode?: "manual" | "auto";
}

export interface CreateApplicationRequestBody {
  job_id: string;
  resume_artifact_id: string;
  apply_mode?: "manual_review" | "auto_apply" | "save_for_later";
  job_title?: string;
  company?: string;
}
