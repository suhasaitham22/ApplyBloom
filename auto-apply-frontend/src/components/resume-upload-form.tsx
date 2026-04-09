"use client";

import { uploadResumeToBackend } from "@/lib/auto-apply-backend";
import type { FormEvent } from "react";

export function ResumeUploadForm() {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const file = formData.get("resume");

    if (!(file instanceof File)) {
      return;
    }

    const resumeText = await file.text();

    await uploadResumeToBackend({
      file_name: file.name,
      file_type: file.type,
      storage_path: `resume-ingest/${file.name}`,
      resume_text: resumeText,
    });
  }

  return (
    <section className="soft-card summary-card" aria-label="Resume upload form">
      <div className="eyebrow">
        <span className="eyebrow-dot" />
        Resume upload
      </div>
      <form onSubmit={handleSubmit} className="section-stack" style={{ marginTop: "0.9rem" }}>
        <label className="field-stack" htmlFor="resume">
          <span>Resume</span>
          <input id="resume" name="resume" type="file" />
        </label>
        <button type="submit" className="primary-button" style={{ width: "fit-content" }}>
          Upload resume
        </button>
      </form>
    </section>
  );
}
