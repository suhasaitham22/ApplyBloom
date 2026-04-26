// Detect which ATS provider hosts a given apply URL.
//
// Used by the extension (via the backend) to pick the right content-script strategy.
// Conservative: unknown URLs → 'generic' (extension will try best-effort fill).

export type AtsProvider = "greenhouse" | "lever" | "ashby" | "generic";

export function detectAtsProvider(rawUrl: string): AtsProvider {
  if (!rawUrl) return "generic";
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return "generic";
  }
  const host = url.hostname.toLowerCase();

  // Greenhouse: boards.greenhouse.io, <co>.greenhouse.io, job-boards.greenhouse.io
  if (host === "boards.greenhouse.io" || host.endsWith(".greenhouse.io")) return "greenhouse";

  // Lever: jobs.lever.co, <co>.lever.co
  if (host === "jobs.lever.co" || host.endsWith(".lever.co")) return "lever";

  // Ashby: jobs.ashbyhq.com, <co>.ashbyhq.com
  if (host === "jobs.ashbyhq.com" || host.endsWith(".ashbyhq.com")) return "ashby";

  return "generic";
}

/**
 * Extract the ATS-specific job key from the URL so we can dedupe applications.
 * Falls back to the full URL if we can't parse a key.
 */
export function extractJobKey(rawUrl: string, provider: AtsProvider): string {
  try {
    const url = new URL(rawUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    if (provider === "greenhouse") {
      // /:board/jobs/:jobId or /embed/job_app?for=:board&token=:jobId
      const jobsIdx = parts.indexOf("jobs");
      if (jobsIdx >= 0 && parts[jobsIdx + 1]) return `greenhouse:${parts[jobsIdx + 1]}`;
      const token = url.searchParams.get("token");
      if (token) return `greenhouse:${token}`;
    }
    if (provider === "lever") {
      // /:company/:jobId
      if (parts.length >= 2) return `lever:${parts[0]}:${parts[1]}`;
    }
    if (provider === "ashby") {
      // /:company/:jobId  or  /:company/jobs/:jobId
      if (parts.length >= 2) {
        const jobIdx = parts.indexOf("jobs");
        const jobId = jobIdx >= 0 ? parts[jobIdx + 1] : parts[parts.length - 1];
        if (jobId) return `ashby:${parts[0]}:${jobId}`;
      }
    }
  } catch {
    // fall through
  }
  return `url:${rawUrl}`;
}
