import { AppShell } from "@/components/app-shell";
import { JobMatchCard } from "@/components/job-match-card";
import { loadDashboardSnapshot } from "@/lib/load-dashboard-snapshot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function JobMatchesPage() {
  const snapshot = await loadDashboardSnapshot();

  return (
    <AppShell title="ApplyBoom" notifications={snapshot.notifications}>
      <div className="section-stack">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            Ranked matches
          </div>
          <h1 className="section-title" style={{ marginTop: "0.8rem" }}>
            Jobs that fit the resume signal.
          </h1>
          <p className="section-subtitle" style={{ marginTop: "0.8rem" }}>
            This screen is designed to feel like a live shortlist with context, not a table of raw
            records.
          </p>
        </div>
        <JobMatchCard job={snapshot.matches[0]} />
      </div>
    </AppShell>
  );
}
