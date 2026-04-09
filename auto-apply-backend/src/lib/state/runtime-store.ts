export interface RuntimeApplicationRecord {
  id: string;
  user_id: string;
  job_id?: string;
  status: string;
  resume_artifact_id?: string;
  applied_at?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  external_reference?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RuntimeNotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RuntimeApplicationEventRecord {
  id: string;
  user_id: string;
  request_id: string;
  event_type: string;
  job_id?: string;
  metadata: unknown;
  created_at: string;
}

export interface RuntimeProfileRecord {
  user_id: string;
  full_name: string;
  headline: string;
  skills: string[];
  years_experience: number;
  summary: string;
  updated_at: string;
}

export interface RuntimeTailoredResumeRecord {
  id: string;
  user_id: string;
  job_id: string;
  headline: string;
  summary: string;
  skills: string[];
  sections: Array<{ section_name: string; lines: string[] }>;
  change_summary: string[];
  rendered_pdf?: {
    file_name: string;
    content_type: "application/pdf";
    base64_pdf: string;
  };
  created_at: string;
  updated_at: string;
}

const runtimeApplications = new Map<string, RuntimeApplicationRecord>();
const runtimeNotifications: RuntimeNotificationRecord[] = [];
const runtimeEvents: RuntimeApplicationEventRecord[] = [];
const runtimeProfiles = new Map<string, RuntimeProfileRecord>();
const runtimeTailoredResumes = new Map<string, RuntimeTailoredResumeRecord>();

export function recordRuntimeApplicationEvent(input: {
  user_id: string;
  request_id: string;
  event_type: string;
  metadata: unknown;
  job_id?: string;
}) {
  const event: RuntimeApplicationEventRecord = {
    id: `${input.user_id}:${input.request_id}:${runtimeEvents.length + 1}`,
    user_id: input.user_id,
    request_id: input.request_id,
    event_type: input.event_type,
    job_id: input.job_id,
    metadata: input.metadata,
    created_at: new Date().toISOString(),
  };

  runtimeEvents.push(event);

  if (input.job_id) {
    const applicationKey = `${input.user_id}:${input.job_id}`;
    const existing = runtimeApplications.get(applicationKey) ?? {
      id: applicationKey,
      user_id: input.user_id,
      job_id: input.job_id,
      status: "queued",
      resume_artifact_id: undefined,
      applied_at: null,
      error_code: null,
      error_message: null,
      external_reference: null,
      created_at: event.created_at,
      updated_at: event.created_at,
    };

    existing.updated_at = event.created_at;

    if (input.event_type === "application_submitted") {
      existing.status = "submitted";
      existing.applied_at = event.created_at;
      existing.error_code = null;
      existing.error_message = null;
    } else if (input.event_type === "application_planned") {
      existing.status = "needs_review";
    } else if (input.event_type === "application_saved") {
      existing.status = "archived";
    } else if (input.event_type === "application_failed") {
      existing.status = "failed";
      existing.error_message =
        typeof input.metadata === "object" &&
        input.metadata !== null &&
        "error_message" in input.metadata &&
        typeof (input.metadata as { error_message?: unknown }).error_message === "string"
          ? (input.metadata as { error_message: string }).error_message
          : "Application processing failed";
    } else if (input.event_type === "resume_parsed") {
      existing.status = "matching";
    } else if (input.event_type === "resume_tailored") {
      existing.status = "ready_to_apply";
    }

    runtimeApplications.set(applicationKey, existing);
  }

  return event;
}

export function recordRuntimeNotification(input: {
  user_id: string;
  type: string;
  title: string;
  body: string;
}) {
  const now = new Date().toISOString();
  const notification: RuntimeNotificationRecord = {
    id: `${input.user_id}:${runtimeNotifications.length + 1}`,
    user_id: input.user_id,
    type: input.type,
    title: input.title,
    body: input.body,
    read_at: null,
    created_at: now,
    updated_at: now,
  };

  runtimeNotifications.push(notification);
  return notification;
}

export function listRuntimeApplications(userId: string) {
  return Array.from(runtimeApplications.values()).filter(
    (application) => application.user_id === userId,
  );
}

export function listRuntimeNotifications(userId: string) {
  return runtimeNotifications.filter((notification) => notification.user_id === userId);
}

export function saveRuntimeProfile(input: RuntimeProfileRecord) {
  runtimeProfiles.set(input.user_id, input);
  return input;
}

export function getRuntimeProfile(userId: string) {
  return runtimeProfiles.get(userId) ?? null;
}

export function saveRuntimeTailoredResume(input: {
  user_id: string;
  job_id: string;
  headline: string;
  summary: string;
  skills: string[];
  sections: Array<{ section_name: string; lines: string[] }>;
  change_summary: string[];
  rendered_pdf?: {
    file_name: string;
    content_type: "application/pdf";
    base64_pdf: string;
  };
}) {
  const now = new Date().toISOString();
  const record: RuntimeTailoredResumeRecord = {
    id: `${input.user_id}:${input.job_id}`,
    user_id: input.user_id,
    job_id: input.job_id,
    headline: input.headline,
    summary: input.summary,
    skills: input.skills,
    sections: input.sections,
    change_summary: input.change_summary,
    rendered_pdf: input.rendered_pdf,
    created_at: now,
    updated_at: now,
  };

  runtimeTailoredResumes.set(record.id, record);
  return record;
}

export function getRuntimeTailoredResume(userId: string, jobId: string) {
  return runtimeTailoredResumes.get(`${userId}:${jobId}`) ?? null;
}

export function resetRuntimeStore() {
  runtimeApplications.clear();
  runtimeNotifications.length = 0;
  runtimeEvents.length = 0;
  runtimeProfiles.clear();
  runtimeTailoredResumes.clear();
}
