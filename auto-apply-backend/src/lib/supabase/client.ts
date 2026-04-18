// Supabase service-role client for the Cloudflare Worker.
// The worker is trusted code — we use the service role key and scope every query
// by the verified user_id extracted from the JWT.
// RLS stays enabled as defense-in-depth; explicit filters are the primary enforcement.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

let cached: SupabaseClient | null = null;

export function getSupabase(env: SupabaseEnv): SupabaseClient {
  if (cached) return cached;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .dev.vars",
    );
  }
  cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "applybloom-worker/1.0" } },
  });
  return cached;
}

export function supabaseEnabled(env: { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string }): boolean {
  // Supabase is used whenever credentials are present. DEMO_MODE only relaxes
  // auth (accepts bearer token verbatim); persistence still goes to real DB.
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}
