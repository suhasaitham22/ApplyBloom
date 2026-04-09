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
    <section aria-label="Resume upload form">
      <form onSubmit={handleSubmit}>
        <label htmlFor="resume">Resume</label>
        <input id="resume" name="resume" type="file" />
        <button type="submit">Upload resume</button>
      </form>
    </section>
  );
}
