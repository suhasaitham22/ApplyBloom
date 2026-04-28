// Scheduled (cron) handler — runs job discovery for every user with a
// completed profile + auto-mode session, once per trigger.
//
// wrangler.toml binds this to "0 */4 * * *" (every 4 hours).

import { getSupabase } from "@/lib/supabase/client";
import { runDiscoveryForUser } from "@/api/v1/jobs";

/**
 * List user_ids that should receive fresh jobs this tick.
 * Free-plan-friendly: we cap the batch at N users, so if the user-base grows
 * the cron still finishes inside 15min CPU time (paid-limit). Remaining users
 * are picked up on the next tick.
 */
async function usersForDiscovery(env: Env, limit = 50): Promise<string[]> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const { data, error } = await getSupabase(env)
    .from("user_profiles")
    .select("user_id, completed_at")
    .not("completed_at", "is", null)
    .order("updated_at", { ascending: true })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((r) => r.user_id as string);
}

export async function runJobDiscoveryCron(env: Env): Promise<{
  totalUsers: number; totalDiscovered: number; totalMatched: number; errors: number;
}> {
  const users = await usersForDiscovery(env);
  let totalDiscovered = 0, totalMatched = 0, errors = 0;
  for (const userId of users) {
    try {
      const r = await runDiscoveryForUser(env, userId, { maxJobs: 80 });
      totalDiscovered += r.discovered;
      totalMatched += r.matched;
    } catch {
      errors += 1;
    }
  }
  return { totalUsers: users.length, totalDiscovered, totalMatched, errors };
}
