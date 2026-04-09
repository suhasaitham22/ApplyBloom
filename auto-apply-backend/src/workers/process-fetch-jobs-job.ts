import { discoverJobs } from "@/services/discover-jobs";
import { saveRuntimeDiscoveredJobs } from "@/lib/state/runtime-store";

type FetchJobsEnv = Pick<Env, "GREENHOUSE_BOARD_TOKENS" | "LEVER_COMPANY_TOKENS">;

export async function processFetchJobsJob(
  message: {
    user_id: string;
    profile_id: string;
    request_id: string;
  },
  env?: FetchJobsEnv,
) {
  const jobs = await discoverJobs(message.profile_id, {
    greenhouseBoardTokens: parseCsvEnv(env?.GREENHOUSE_BOARD_TOKENS),
    leverCompanyTokens: parseCsvEnv(env?.LEVER_COMPANY_TOKENS),
  });
  saveRuntimeDiscoveredJobs(message.user_id, jobs);

  return {
    user_id: message.user_id,
    request_id: message.request_id,
    jobs,
  };
}

function parseCsvEnv(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
