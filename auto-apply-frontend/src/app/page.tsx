import { StoryHomePage } from "@/components/story-home-page";
import { EMPTY_DASHBOARD_SNAPSHOT } from "@/lib/empty-dashboard-snapshot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HomePage() {
  return <StoryHomePage snapshot={EMPTY_DASHBOARD_SNAPSHOT} />;
}
