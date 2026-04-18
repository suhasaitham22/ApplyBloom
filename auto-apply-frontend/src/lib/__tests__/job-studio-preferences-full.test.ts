import { describe, it, expect } from "vitest";
import {
  normalizeJobStudioPreferences,
  DEFAULT_JOB_STUDIO_PREFERENCES,
  type JobStudioPreferences,
} from "../job-studio-preferences";

describe("normalizeJobStudioPreferences", () => {
  it("returns defaults for null", () => {
    expect(normalizeJobStudioPreferences(null)).toEqual(DEFAULT_JOB_STUDIO_PREFERENCES);
  });

  it("returns defaults for undefined", () => {
    expect(normalizeJobStudioPreferences(undefined)).toEqual(DEFAULT_JOB_STUDIO_PREFERENCES);
  });

  it("returns defaults for empty object", () => {
    expect(normalizeJobStudioPreferences({})).toEqual(DEFAULT_JOB_STUDIO_PREFERENCES);
  });

  it("preserves valid mode=single", () => {
    const r = normalizeJobStudioPreferences({ mode: "single" });
    expect(r.mode).toBe("single");
  });

  it("defaults invalid mode to auto", () => {
    const r = normalizeJobStudioPreferences({ mode: "invalid" as "auto" });
    expect(r.mode).toBe("auto");
  });

  it("preserves valid jobType", () => {
    const r = normalizeJobStudioPreferences({ jobType: "Contract" });
    expect(r.jobType).toBe("Contract");
  });

  it("defaults invalid jobType", () => {
    const r = normalizeJobStudioPreferences({ jobType: "Freelance" as "Full-time" });
    expect(r.jobType).toBe(DEFAULT_JOB_STUDIO_PREFERENCES.jobType);
  });

  it("preserves valid seniority", () => {
    const r = normalizeJobStudioPreferences({ seniority: "Senior" });
    expect(r.seniority).toBe("Senior");
  });

  it("defaults invalid seniority", () => {
    const r = normalizeJobStudioPreferences({ seniority: "Intern" as "Junior" });
    expect(r.seniority).toBe(DEFAULT_JOB_STUDIO_PREFERENCES.seniority);
  });

  it("filters valid selectedSources", () => {
    const r = normalizeJobStudioPreferences({ selectedSources: ["LinkedIn", "FakeSource" as "LinkedIn", "Indeed"] });
    expect(r.selectedSources).toEqual(["LinkedIn", "Indeed"]);
  });

  it("defaults to default sources when all filtered out", () => {
    const r = normalizeJobStudioPreferences({ selectedSources: ["Fake" as "LinkedIn"] });
    expect(r.selectedSources).toEqual(DEFAULT_JOB_STUDIO_PREFERENCES.selectedSources);
  });

  it("defaults non-array selectedSources", () => {
    const r = normalizeJobStudioPreferences({ selectedSources: "bad" as unknown as [] });
    expect(r.selectedSources).toEqual(DEFAULT_JOB_STUDIO_PREFERENCES.selectedSources);
  });

  it("clamps matchScore within range", () => {
    expect(normalizeJobStudioPreferences({ matchScore: 30 }).matchScore).toBe(40);
    expect(normalizeJobStudioPreferences({ matchScore: 99 }).matchScore).toBe(95);
    expect(normalizeJobStudioPreferences({ matchScore: 75 }).matchScore).toBe(75);
  });

  it("rounds matchScore", () => {
    expect(normalizeJobStudioPreferences({ matchScore: 75.7 }).matchScore).toBe(76);
  });

  it("defaults NaN matchScore", () => {
    expect(normalizeJobStudioPreferences({ matchScore: NaN }).matchScore).toBe(DEFAULT_JOB_STUDIO_PREFERENCES.matchScore);
  });

  it("defaults non-number matchScore", () => {
    expect(normalizeJobStudioPreferences({ matchScore: "hi" as unknown as number }).matchScore).toBe(DEFAULT_JOB_STUDIO_PREFERENCES.matchScore);
  });

  it("clamps dailyCap", () => {
    expect(normalizeJobStudioPreferences({ dailyCap: 1 }).dailyCap).toBe(5);
    expect(normalizeJobStudioPreferences({ dailyCap: 500 }).dailyCap).toBe(200);
    expect(normalizeJobStudioPreferences({ dailyCap: 100 }).dailyCap).toBe(100);
  });

  it("defaults NaN dailyCap", () => {
    expect(normalizeJobStudioPreferences({ dailyCap: NaN }).dailyCap).toBe(DEFAULT_JOB_STUDIO_PREFERENCES.dailyCap);
  });

  it("coerces remoteOnly to boolean", () => {
    expect(normalizeJobStudioPreferences({ remoteOnly: true }).remoteOnly).toBe(true);
    expect(normalizeJobStudioPreferences({ remoteOnly: false }).remoteOnly).toBe(false);
    expect(normalizeJobStudioPreferences({}).remoteOnly).toBe(false);
  });

  it("trims and defaults location", () => {
    expect(normalizeJobStudioPreferences({ location: "  NYC  " }).location).toBe("NYC");
    expect(normalizeJobStudioPreferences({ location: "   " }).location).toBe(DEFAULT_JOB_STUDIO_PREFERENCES.location);
  });

  it("trims and defaults blacklistedCompanies", () => {
    expect(normalizeJobStudioPreferences({ blacklistedCompanies: "  Google  " }).blacklistedCompanies).toBe("Google");
    expect(normalizeJobStudioPreferences({ blacklistedCompanies: "" }).blacklistedCompanies).toBe(DEFAULT_JOB_STUDIO_PREFERENCES.blacklistedCompanies);
  });

  it("handles full valid input", () => {
    const input: JobStudioPreferences = {
      mode: "single",
      jobType: "Part-time",
      seniority: "Lead / Staff",
      selectedSources: ["Wellfound"],
      matchScore: 80,
      dailyCap: 25,
      remoteOnly: true,
      location: "SF",
      blacklistedCompanies: "Google",
    };
    expect(normalizeJobStudioPreferences(input)).toEqual(input);
  });
});
