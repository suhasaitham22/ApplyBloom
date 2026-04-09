import { ResumeWorkflowStudio } from "@/components/resume-workflow-studio";
import { loadDashboardSnapshot } from "@/lib/load-dashboard-snapshot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResumeUploadPage() {
  const snapshot = await loadDashboardSnapshot();

  return (
    <ResumeWorkflowStudio snapshot={snapshot} />
  );
}
