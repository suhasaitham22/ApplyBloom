import { discoverJobs } from "@/services/discover-jobs";
import { rankJobMatches } from "@/services/rank-job-matches";
import { buildSuccessPayload } from "@/lib/http/build-success-payload";
import { errorResponse } from "@/lib/http/error-response";
import { getRequestId } from "@/lib/http/request-id";
import { jsonResponse } from "@/lib/http/json-response";
import { parseJsonBody } from "@/lib/http/parse-json-body";
import { requireAuthenticatedUser } from "@/lib/auth/require-authenticated-user";
import { requireMethod } from "@/lib/http/require-method";
import { requireNonEmptyString } from "@/lib/http/require-non-empty-string";
import type { MatchJobsRequestBody } from "@/lib/contracts/api-types";
import { getRuntimeProfile, saveRuntimeDiscoveredJobs } from "@/lib/state/runtime-store";

export async function handleGetJobMatchesRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const requestId = getRequestId(request);

  const methodError = requireMethod(request, "POST");
  if (methodError) {
    return methodError;
  }

  const auth = await requireAuthenticatedUser(request, env);
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseJsonBody<MatchJobsRequestBody>(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  if (parsed.data.filters?.location) {
    const location = requireNonEmptyString(parsed.data.filters.location, "filters.location");
    if (!location.ok) {
      return errorResponse("validation_error", location.error, 400, {}, requestId);
    }
  }

  const profile = getRuntimeProfile(auth.user.id);
  if (!profile) {
    return jsonResponse(
      buildSuccessPayload(
        {
          matches: [],
        },
        requestId,
      ),
    );
  }

  const query = [profile.headline, ...(profile.skills ?? [])].filter(Boolean).join(" ");
  const jobs = await discoverJobs(query, {
    remoteOnly: parsed.data.filters?.remote ?? false,
    location: parsed.data.filters?.location ?? "",
    greenhouseBoardTokens: parseCsvEnv(env.GREENHOUSE_BOARD_TOKENS),
    leverCompanyTokens: parseCsvEnv(env.LEVER_COMPANY_TOKENS),
  });
  saveRuntimeDiscoveredJobs(auth.user.id, jobs);
  const matches = await rankJobMatches(profile, jobs.slice(0, parsed.data.limit ?? 20));
  const matchesWithJobDetails = matches
    .map((match) => {
      const job = jobs.find((candidate) => candidate.id === match.job_id);
      if (!job) {
        return null;
      }

      return {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        remote: job.remote,
        score: match.score,
        reason: match.reason,
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);

  return jsonResponse(
    buildSuccessPayload(
      {
        matches: matchesWithJobDetails,
      },
      requestId,
    ),
  );
}

function parseCsvEnv(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
