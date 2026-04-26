export type AtsProvider = "greenhouse" | "lever" | "ashby" | "generic";

export type ApplyStatus =
  | "queued" | "claimed" | "running" | "needs_input"
  | "submitted" | "failed" | "cancelled" | "paused";

export type ReportKind =
  | "running" | "submitted" | "failed" | "needs_input" | "step" | "screenshot";

export interface ApplyRecord {
  id: string;
  user_id: string;
  session_id: string | null;
  job_key: string;
  ats_provider: AtsProvider;
  apply_url: string;
  job_title: string | null;
  company: string | null;
  resume_id: string | null;
  credential_id: string | null;
  dry_run: boolean;
  status: ApplyStatus;
  priority: number;
  error: string | null;
  screenshot_urls: string[];
  attempt_log: Array<{ at: string; step: string; note?: string }>;
  claimed_by: string | null;
  claimed_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QAPendingRecord {
  id: string;
  apply_id: string;
  question_text: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

export interface MatchResult {
  record: { id: string; answer: string };
  similarity: number;
  verdict: "auto" | "suggest" | "ask";
}

export interface ProfileForFill {
  legal_first_name: string | null;
  legal_last_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  github_url: string | null;
}
