"use client";

import { createApplicationInBackend, requestResumeTailoring } from "@/lib/auto-apply-backend";
import type { JobMatchSummary } from "@/lib/api-types";

export function JobMatchCard({
  job,
}: Readonly<{
  job?: JobMatchSummary;
}>) {
  async function handleTailor() {
    if (!job) {
      return;
    }

    await requestResumeTailoring(job.id);
  }

  async function handleApply() {
    if (!job) {
      return;
    }

    await createApplicationInBackend({
      job_id: job.id,
      resume_artifact_id: `resume-for-${job.id}`,
      apply_mode: "manual_review",
    });
  }

  return (
    <section aria-label="Job match card">
      {job ? (
        <>
          <h2>{job.title}</h2>
          <p>{job.company}</p>
          <p>{job.location ?? "Location not provided"}</p>
          <p>{job.reason ?? "No ranking explanation available."}</p>
          <button type="button" onClick={handleTailor}>
            Tailor resume
          </button>
          <button type="button" onClick={handleApply}>
            Apply
          </button>
        </>
      ) : (
        <p>No job match loaded.</p>
      )}
    </section>
  );
}
