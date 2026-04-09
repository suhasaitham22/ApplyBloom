export const JOB_STUDIO_PREFERENCES_STORAGE_KEY = "applybloom.jobStudio.preferences.v1";
export const JOB_STUDIO_RESUME_DRAFT_STORAGE_KEY = "applybloom.jobStudio.resumeDraft.v1";

export const JOB_TYPE_OPTIONS = ["Full-time", "Part-time", "Contract", "Remote only"] as const;
export const SENIORITY_OPTIONS = ["Junior", "Mid-level", "Senior", "Lead / Staff"] as const;
export const JOB_SOURCE_OPTIONS = [
  "LinkedIn",
  "Indeed",
  "Greenhouse",
  "Lever",
  "Workday",
  "Wellfound",
] as const;

export type JobStudioMode = "auto" | "single";
export type JobTypeOption = (typeof JOB_TYPE_OPTIONS)[number];
export type SeniorityOption = (typeof SENIORITY_OPTIONS)[number];
export type JobSourceOption = (typeof JOB_SOURCE_OPTIONS)[number];

export interface JobStudioPreferences {
  mode: JobStudioMode;
  jobType: JobTypeOption;
  seniority: SeniorityOption;
  selectedSources: JobSourceOption[];
  matchScore: number;
  dailyCap: number;
  remoteOnly: boolean;
  location: string;
  blacklistedCompanies: string;
}

export const DEFAULT_JOB_STUDIO_PREFERENCES: JobStudioPreferences = {
  mode: "auto",
  jobType: "Full-time",
  seniority: "Mid-level",
  selectedSources: ["LinkedIn", "Greenhouse", "Lever"],
  matchScore: 75,
  dailyCap: 50,
  remoteOnly: false,
  location: "Remote - United States",
  blacklistedCompanies: "Amazon, Meta",
};

export function normalizeJobStudioPreferences(
  input: Partial<JobStudioPreferences> | null | undefined,
): JobStudioPreferences {
  if (!input) {
    return DEFAULT_JOB_STUDIO_PREFERENCES;
  }

  const mode = input.mode === "single" ? "single" : "auto";
  const jobType = JOB_TYPE_OPTIONS.includes(input.jobType as JobTypeOption)
    ? (input.jobType as JobTypeOption)
    : DEFAULT_JOB_STUDIO_PREFERENCES.jobType;
  const seniority = SENIORITY_OPTIONS.includes(input.seniority as SeniorityOption)
    ? (input.seniority as SeniorityOption)
    : DEFAULT_JOB_STUDIO_PREFERENCES.seniority;
  const selectedSources = Array.isArray(input.selectedSources)
    ? input.selectedSources.filter((item): item is JobSourceOption =>
        JOB_SOURCE_OPTIONS.includes(item as JobSourceOption),
      )
    : DEFAULT_JOB_STUDIO_PREFERENCES.selectedSources;

  return {
    mode,
    jobType,
    seniority,
    selectedSources:
      selectedSources.length > 0
        ? selectedSources
        : DEFAULT_JOB_STUDIO_PREFERENCES.selectedSources,
    matchScore: clampNumber(input.matchScore, 40, 95, DEFAULT_JOB_STUDIO_PREFERENCES.matchScore),
    dailyCap: clampNumber(input.dailyCap, 5, 200, DEFAULT_JOB_STUDIO_PREFERENCES.dailyCap),
    remoteOnly: Boolean(input.remoteOnly),
    location: input.location?.trim() || DEFAULT_JOB_STUDIO_PREFERENCES.location,
    blacklistedCompanies:
      input.blacklistedCompanies?.trim() || DEFAULT_JOB_STUDIO_PREFERENCES.blacklistedCompanies,
  };
}

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}
