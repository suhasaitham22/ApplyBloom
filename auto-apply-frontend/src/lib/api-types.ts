export interface ApiSuccess<T> {
  data: T;
  meta?: {
    request_id?: string;
  };
}

export interface JobMatchSummary {
  id: string;
  title: string;
  company: string;
  location?: string;
  remote: boolean;
  score?: number;
  reason?: string;
}

export interface ApplicationSummary {
  id: string;
  job_title: string;
  company: string;
  status: string;
  updated_at?: string;
}

export interface NotificationSummary {
  id: string;
  title: string;
  body: string;
  read_at?: string | null;
}

