import { AppShell } from "@/components/app-shell";
import { ApplicationStatusTimeline } from "@/components/application-status-timeline";
import { loadDashboardSnapshot } from "@/lib/load-dashboard-snapshot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ApplicationsPage() {
  const snapshot = await loadDashboardSnapshot();

  return (
    <AppShell title="ApplyBoom" notifications={snapshot.notifications}>
      <div className="section-stack">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            Application timeline
          </div>
          <h1 className="section-title" style={{ marginTop: "0.8rem" }}>
            A clear record of every submission.
          </h1>
          <p className="section-subtitle" style={{ marginTop: "0.8rem" }}>
            The dashboard should make application progress feel calm, visual, and easy to scan.
          </p>
        </div>
        <ApplicationStatusTimeline applications={snapshot.applications} />
      </div>
    </AppShell>
  );
}
