// User profile store — required fields gate `mode="auto"` applies.
// EEO fields are AES-256-GCM encrypted at the application layer (credentials aes-gcm helper).

import { getSupabase } from "@/lib/supabase/client";
import type { SupabaseEnv } from "@/lib/supabase/client";

export type WorkAuth =
  | "citizen" | "green_card" | "h1b" | "opt" | "stem_opt" | "needs_sponsorship" | "other";

export interface UserProfileRecord {
  id: string;
  user_id: string;
  legal_first_name: string | null;
  legal_last_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  work_authorization: WorkAuth | null;
  visa_sponsorship_needed: boolean | null;
  relocation_ok: boolean | null;
  earliest_start_date: string | null; // ISO date
  notice_period_weeks: number | null;
  salary_min: number | null;
  salary_max: number | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  github_url: string | null;
  eeo_gender_enc: string | null;
  eeo_race_enc: string | null;
  eeo_veteran_enc: string | null;
  eeo_disability_enc: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Public view — EEO ciphertext stripped (server never returns it verbatim). */
export interface UserProfilePublic extends Omit<
  UserProfileRecord,
  "eeo_gender_enc" | "eeo_race_enc" | "eeo_veteran_enc" | "eeo_disability_enc"
> {
  has_eeo: boolean;
}

export type UserProfilePatch = Partial<Omit<
  UserProfileRecord, "id" | "user_id" | "created_at" | "updated_at"
>>;

/** Which fields are required to move to mode="auto". */
export const REQUIRED_PROFILE_FIELDS: (keyof UserProfileRecord)[] = [
  "legal_first_name", "legal_last_name", "email", "phone", "location",
  "work_authorization", "relocation_ok",
];

export function isProfileComplete(p: UserProfileRecord | null): boolean {
  if (!p) return false;
  return REQUIRED_PROFILE_FIELDS.every((k) => {
    const v = p[k];
    return v !== null && v !== undefined && v !== "";
  });
}

export function toPublic(r: UserProfileRecord): UserProfilePublic {
  const { eeo_gender_enc, eeo_race_enc, eeo_veteran_enc, eeo_disability_enc, ...rest } = r;
  return {
    ...rest,
    has_eeo: Boolean(eeo_gender_enc || eeo_race_enc || eeo_veteran_enc || eeo_disability_enc),
  };
}

// ── In-memory store ──────────────────────────────────────────────────────
const memStore = new Map<string, UserProfileRecord>(); // keyed by user_id

function memGet(userId: string): UserProfileRecord | null {
  return memStore.get(userId) ?? null;
}

function memUpsert(userId: string, patch: UserProfilePatch): UserProfileRecord {
  const now = new Date().toISOString();
  const existing = memStore.get(userId);
  const base: UserProfileRecord = existing ?? {
    id: crypto.randomUUID(),
    user_id: userId,
    legal_first_name: null, legal_last_name: null, email: null, phone: null, location: null,
    work_authorization: null, visa_sponsorship_needed: null, relocation_ok: null,
    earliest_start_date: null, notice_period_weeks: null, salary_min: null, salary_max: null,
    linkedin_url: null, portfolio_url: null, github_url: null,
    eeo_gender_enc: null, eeo_race_enc: null, eeo_veteran_enc: null, eeo_disability_enc: null,
    completed_at: null, created_at: now, updated_at: now,
  };
  const merged: UserProfileRecord = { ...base, ...patch, updated_at: now };
  if (!merged.completed_at && isProfileComplete(merged)) merged.completed_at = now;
  memStore.set(userId, merged);
  return merged;
}

// ── Dispatcher ───────────────────────────────────────────────────────────
type Env = SupabaseEnv & { DEMO_MODE?: string };

function useSupabase(env: Env): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function getProfile(env: Env, userId: string): Promise<UserProfileRecord | null> {
  if (useSupabase(env)) {
    const { data, error } = await getSupabase(env)
      .from("user_profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(`getProfile: ${error.message}`);
    return data as UserProfileRecord | null;
  }
  return memGet(userId);
}

export async function upsertProfile(
  env: Env, userId: string, patch: UserProfilePatch,
): Promise<UserProfileRecord> {
  if (useSupabase(env)) {
    const existing = await getProfile(env, userId);
    const nowCompletedAt = existing?.completed_at
      ?? (isProfileComplete({ ...(existing ?? {}), ...patch } as UserProfileRecord)
          ? new Date().toISOString() : null);
    const { data, error } = await getSupabase(env)
      .from("user_profiles")
      .upsert(
        { user_id: userId, ...patch, completed_at: nowCompletedAt },
        { onConflict: "user_id" },
      )
      .select().single();
    if (error) throw new Error(`upsertProfile: ${error.message}`);
    return data as UserProfileRecord;
  }
  return memUpsert(userId, patch);
}

/** Test helper — memory only. */
export function __resetUserProfileStore(): void {
  memStore.clear();
}
