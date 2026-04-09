import { LandingExperience } from "@/components/landing-experience";
import { loadDashboardSnapshot } from "@/lib/load-dashboard-snapshot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const snapshot = await loadDashboardSnapshot();

  return <LandingExperience snapshot={snapshot} />;
}
