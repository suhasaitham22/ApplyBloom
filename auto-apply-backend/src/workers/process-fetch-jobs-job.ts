import { discoverJobs } from "@/services/discover-jobs";

export async function processFetchJobsJob(message: {
  user_id: string;
  profile_id: string;
  request_id: string;
}) {
  const jobs = await discoverJobs(message.profile_id);

  return {
    user_id: message.user_id,
    request_id: message.request_id,
    jobs,
  };
}
