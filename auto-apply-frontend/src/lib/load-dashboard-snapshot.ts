import type {
  ApplicationSummary,
  JobMatchSummary,
  NotificationSummary,
} from "@/lib/api-types";
import {
  fetchApplicationsFromBackend,
  fetchJobMatchesFromBackend,
  fetchNotificationsFromBackend,
} from "@/lib/auto-apply-backend";

export interface DashboardSnapshot {
  matches: JobMatchSummary[];
  applications: ApplicationSummary[];
  notifications: NotificationSummary[];
}

export async function loadDashboardSnapshot(): Promise<DashboardSnapshot> {
  if (!process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL) {
    return {
      matches: [],
      applications: [],
      notifications: [],
    };
  }

  try {
    const [matchesResponse, applicationsResponse, notificationsResponse] =
      await Promise.all([
        fetchJobMatchesFromBackend(),
        fetchApplicationsFromBackend(),
        fetchNotificationsFromBackend(),
      ]);

    return {
      matches: matchesResponse.data.matches,
      applications: applicationsResponse.data.applications,
      notifications: notificationsResponse.data.notifications,
    };
  } catch {
    return {
      matches: [],
      applications: [],
      notifications: [],
    };
  }
}
