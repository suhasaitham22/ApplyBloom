import { afterEach, describe, expect, it, vi } from "vitest";
import { loadDashboardSnapshot } from "../load-dashboard-snapshot";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadDashboardSnapshot", () => {
  it("falls back to empty dashboard data when the backend is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    await expect(loadDashboardSnapshot()).resolves.toEqual({
      matches: [],
      applications: [],
      notifications: [],
    });
  });
});

