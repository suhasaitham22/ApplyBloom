import { tailorResume } from "@/services/tailor-resume";
import { renderResumePdf } from "@/services/render-resume-pdf";
import { saveRuntimeTailoredResume } from "@/lib/state/runtime-store";

export async function processTailorResumeJob(message: {
  user_id: string;
  profile_id: string;
  job_id: string;
  mode?: "manual" | "auto";
  request_id: string;
  resume?: unknown;
  job?: unknown;
}) {
  const tailoredResume = await tailorResume(message.resume ?? {}, message.job ?? {});
  const renderedPdf = await renderResumePdf(tailoredResume);
  saveRuntimeTailoredResume({
    user_id: message.user_id,
    job_id: message.job_id,
    headline: tailoredResume.headline,
    summary: tailoredResume.summary,
    skills: tailoredResume.skills,
    sections: tailoredResume.sections,
    change_summary: tailoredResume.change_summary,
    rendered_pdf: renderedPdf,
  });

  return {
    user_id: message.user_id,
    request_id: message.request_id,
    job_id: message.job_id,
    tailored_resume: tailoredResume,
    rendered_pdf: renderedPdf,
  };
}
