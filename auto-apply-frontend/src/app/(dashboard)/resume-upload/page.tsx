import { ResumeUploadForm } from "@/components/resume-upload-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ResumeUploadPage() {
  return (
    <main>
      <h1>Upload Resume</h1>
      <ResumeUploadForm />
    </main>
  );
}
