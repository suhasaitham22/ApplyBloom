import { rankJobMatches } from "@/services/rank-job-matches";
import type { JobLike } from "@/services/rank-job-matches";

export async function processMatchJobsJob(message: {
  user_id: string;
  profile_id: string;
  request_id: string;
  jobs?: JobLike[];
}) {
  const matches = await rankJobMatches(message.profile_id, message.jobs ?? []);

  return {
    user_id: message.user_id,
    request_id: message.request_id,
    matches,
  };
}
