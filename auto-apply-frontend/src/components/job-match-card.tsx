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
    <section className="soft-card summary-card" aria-label="Job match card">
      <div className="eyebrow">
        <span className="eyebrow-dot" />
        Job match
      </div>
      {job ? (
        <>
          <h2 style={{ fontFamily: "var(--font-syne, 'Syne', sans-serif)", marginTop: "0.9rem" }}>
            {job.title}
          </h2>
          <p className="muted-copy">{job.company}</p>
          <div className="chip-row">
            <span className="chip">{job.location ?? "Location not provided"}</span>
            <span className="chip" data-tone="accent">
              {job.remote ? "Remote" : "Onsite"}
            </span>
            {typeof job.score === "number" ? (
              <span className="chip" data-tone="success">
                {Math.round(job.score * 100)}% match
              </span>
            ) : null}
          </div>
          <p style={{ marginTop: "0.85rem" }}>{job.reason ?? "No ranking explanation available."}</p>
          <div className="hero-actions" style={{ marginTop: "1rem" }}>
            <button type="button" onClick={handleTailor} className="secondary-button">
              Tailor resume
            </button>
            <button type="button" onClick={handleApply} className="primary-button">
              Apply
            </button>
          </div>
        </>
      ) : (
        <p className="muted-copy" style={{ marginTop: "0.9rem" }}>
          No job match loaded.
        </p>
      )}
    </section>
  );
}
