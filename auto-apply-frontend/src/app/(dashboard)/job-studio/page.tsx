import { ResumeWorkflowStudio } from "@/components/resume-workflow-studio";
import { EMPTY_DASHBOARD_SNAPSHOT } from "@/lib/empty-dashboard-snapshot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function JobStudioPage() {
  return <ResumeWorkflowStudio snapshot={EMPTY_DASHBOARD_SNAPSHOT} />;
}
