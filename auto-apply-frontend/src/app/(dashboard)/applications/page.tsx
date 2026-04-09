import { ApplicationStatusTimeline } from "@/components/application-status-timeline";
import { loadDashboardSnapshot } from "@/lib/load-dashboard-snapshot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ApplicationsPage() {
  const snapshot = await loadDashboardSnapshot();

  return (
    <main>
      <h1>Applications</h1>
      <ApplicationStatusTimeline applications={snapshot.applications} />
    </main>
  );
}
