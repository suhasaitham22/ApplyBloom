export interface SubmitApplicationPayload {
  user_id: string;
  job_id: string;
  resume_artifact_id: string;
  apply_mode: "manual_review" | "auto_apply" | "save_for_later";
  request_id: string;
}

export interface SubmitApplicationResult {
  submitted: boolean;
  application_reference: string;
  mode: SubmitApplicationPayload["apply_mode"];
  next_action: "none" | "manual_review_required" | "saved_for_later";
  notes: string[];
}

export async function submitApplication(
  payload: SubmitApplicationPayload,
): Promise<SubmitApplicationResult> {
  const applicationReference = `${payload.user_id}:${payload.job_id}:${payload.request_id}`;

  if (payload.apply_mode === "save_for_later") {
    return {
      submitted: false,
      application_reference: applicationReference,
      mode: payload.apply_mode,
      next_action: "saved_for_later",
      notes: ["Application saved for later review"],
    };
  }

  if (payload.apply_mode === "manual_review") {
    return {
      submitted: false,
      application_reference: applicationReference,
      mode: payload.apply_mode,
      next_action: "manual_review_required",
      notes: ["Manual review required before submission"],
    };
  }

  return {
    submitted: false,
    application_reference: applicationReference,
    mode: payload.apply_mode,
    next_action: "manual_review_required",
    notes: [
      "Automated submission adapter not yet connected",
      `Resume artifact ${payload.resume_artifact_id} is ready for apply flow`,
    ],
  };
}

