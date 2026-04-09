import { JobMatchCard } from "@/components/job-match-card";
import { loadDashboardSnapshot } from "@/lib/load-dashboard-snapshot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function JobMatchesPage() {
  const snapshot = await loadDashboardSnapshot();

  return (
    <main>
      <h1>Job Matches</h1>
      <JobMatchCard job={snapshot.matches[0]} />
    </main>
  );
}
