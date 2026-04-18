import { describe, it, expect } from "vitest";
import {
  JOB_STUDIO_PREFERENCES_STORAGE_KEY,
  JOB_STUDIO_RESUME_DRAFT_STORAGE_KEY,
  JOB_TYPE_OPTIONS,
  SENIORITY_OPTIONS,
  JOB_SOURCE_OPTIONS,
} from "../job-studio-preferences";

describe("job-studio-preferences constants", () => {
  it("has stable, namespaced storage keys", () => {
    expect(JOB_STUDIO_PREFERENCES_STORAGE_KEY).toMatch(/^applybloom\.jobStudio\./);
    expect(JOB_STUDIO_RESUME_DRAFT_STORAGE_KEY).toMatch(/^applybloom\.jobStudio\./);
    expect(JOB_STUDIO_PREFERENCES_STORAGE_KEY).not.toBe(JOB_STUDIO_RESUME_DRAFT_STORAGE_KEY);
  });
  it("exposes non-empty option lists", () => {
    expect(JOB_TYPE_OPTIONS.length).toBeGreaterThan(0);
    expect(SENIORITY_OPTIONS.length).toBeGreaterThan(0);
    expect(JOB_SOURCE_OPTIONS.length).toBeGreaterThan(0);
  });
});
