import { AppShell } from "@/components/app-shell";
import { JobMatchCard } from "@/components/job-match-card";
import { ApplicationStatusTimeline } from "@/components/application-status-timeline";
import { ResumeUploadForm } from "@/components/resume-upload-form";
import { loadDashboardSnapshot } from "@/lib/load-dashboard-snapshot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const snapshot = await loadDashboardSnapshot();
  const topMatch = snapshot.matches[0];

  return (
    <AppShell title="AI Auto Job Apply Platform" notifications={snapshot.notifications}>
      <ResumeUploadForm />
      <JobMatchCard job={topMatch} />
      <ApplicationStatusTimeline applications={snapshot.applications} />
    </AppShell>
  );
}
