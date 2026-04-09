import { describe, expect, it } from "vitest";
import {
  getRuntimeDiscoveredJob,
  listRuntimeApplications,
  listRuntimeDiscoveredJobs,
  getRuntimeProfile,
  listRuntimeNotifications,
  resetRuntimeStore,
  saveRuntimeDiscoveredJobs,
  saveRuntimeProfile,
  recordRuntimeApplicationEvent,
  recordRuntimeNotification,
} from "../runtime-store";

describe("runtime-store", () => {
  it("resets between tests", () => {
    resetRuntimeStore();
    expect(listRuntimeApplications("user_123")).toEqual([]);
    expect(listRuntimeNotifications("user_123")).toEqual([]);
  });

  it("records application events and updates application status", () => {
    resetRuntimeStore();
    recordRuntimeApplicationEvent({
      user_id: "user_123",
      request_id: "req_123",
      event_type: "application_submitted",
      job_id: "job_123",
      metadata: {},
    });

    const applications = listRuntimeApplications("user_123");

    expect(applications[0].status).toBe("submitted");
  });

  it("records notifications", () => {
    resetRuntimeStore();
    recordRuntimeNotification({
      user_id: "user_123",
      type: "application_notification",
      title: "Hello",
      body: "World",
    });

    const notifications = listRuntimeNotifications("user_123");

    expect(notifications.at(-1)?.title).toBe("Hello");
  });

  it("saves and retrieves runtime profiles", () => {
    resetRuntimeStore();
    saveRuntimeProfile({
      user_id: "user_123",
      email: "user@example.com",
      full_name: "Jane Doe",
      headline: "Backend Engineer",
      skills: ["TypeScript"],
      years_experience: 5,
      summary: "Summary",
      updated_at: new Date().toISOString(),
    });

    expect(getRuntimeProfile("user_123")?.headline).toBe("Backend Engineer");
  });

  it("saves and retrieves discovered jobs", () => {
    resetRuntimeStore();
    saveRuntimeDiscoveredJobs("user_123", [
      {
        id: "job_123",
        source: "greenhouse",
        source_job_id: "123",
        title: "Backend Engineer",
        company: "Example",
        location: "Remote",
        remote: true,
        description: "Build backend systems.",
        apply_url: "https://example.com/apply",
        posted_at: "2026-01-01T00:00:00Z",
        raw_payload: {},
      },
    ]);

    expect(listRuntimeDiscoveredJobs("user_123")).toHaveLength(1);
    expect(getRuntimeDiscoveredJob("user_123", "job_123")?.company).toBe("Example");
  });
});
