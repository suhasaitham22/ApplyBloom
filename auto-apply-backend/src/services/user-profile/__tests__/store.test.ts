import { describe, expect, it, beforeEach } from "vitest";
import {
  getProfile, upsertProfile, isProfileComplete, toPublic,
  REQUIRED_PROFILE_FIELDS, __resetUserProfileStore,
} from "../store";

const USER = "user-1";
const env = {} as unknown as Parameters<typeof getProfile>[0];

beforeEach(() => __resetUserProfileStore());

describe("user-profile store (memory mode)", () => {
  it("getProfile returns null for a new user", async () => {
    expect(await getProfile(env, USER)).toBeNull();
  });

  it("upsertProfile creates on first call, patches on second", async () => {
    const a = await upsertProfile(env, USER, { legal_first_name: "Suhas" });
    expect(a.legal_first_name).toBe("Suhas");
    expect(a.legal_last_name).toBeNull();

    const b = await upsertProfile(env, USER, { legal_last_name: "Aitham" });
    expect(b.id).toBe(a.id);
    expect(b.legal_first_name).toBe("Suhas");
    expect(b.legal_last_name).toBe("Aitham");
  });

  it("isProfileComplete requires every REQUIRED_PROFILE_FIELDS field", async () => {
    const incomplete = await upsertProfile(env, USER, { legal_first_name: "X" });
    expect(isProfileComplete(incomplete)).toBe(false);

    const complete = await upsertProfile(env, USER, {
      legal_first_name: "X", legal_last_name: "Y",
      email: "x@y.com", phone: "+15551234",
      location: "SF, CA", work_authorization: "citizen",
      relocation_ok: true,
    });
    expect(isProfileComplete(complete)).toBe(true);
    expect(complete.completed_at).not.toBeNull();
  });

  it("each REQUIRED_PROFILE_FIELDS entry actually gates completion", async () => {
    const full = {
      legal_first_name: "X", legal_last_name: "Y",
      email: "x@y.com", phone: "+15551234",
      location: "SF, CA", work_authorization: "citizen" as const,
      relocation_ok: true,
    };
    for (const field of REQUIRED_PROFILE_FIELDS) {
      const patched = { ...full, [field]: null } as typeof full;
      const rec = { ...patched, id: "", user_id: "", created_at: "", updated_at: "",
        visa_sponsorship_needed: null, earliest_start_date: null,
        notice_period_weeks: null, salary_min: null, salary_max: null,
        linkedin_url: null, portfolio_url: null, github_url: null,
        eeo_gender_enc: null, eeo_race_enc: null, eeo_veteran_enc: null,
        eeo_disability_enc: null, completed_at: null } as unknown as Parameters<typeof isProfileComplete>[0];
      expect(isProfileComplete(rec)).toBe(false);
    }
  });

  it("toPublic strips EEO ciphertext and reports has_eeo", async () => {
    const rec = await upsertProfile(env, USER, {
      legal_first_name: "X",
      eeo_gender_enc: "CIPHERTEXT",
    });
    const pub = toPublic(rec);
    expect("eeo_gender_enc" in pub).toBe(false);
    expect(pub.has_eeo).toBe(true);
  });

  it("has_eeo is false when all eeo fields null", async () => {
    const rec = await upsertProfile(env, USER, { legal_first_name: "X" });
    expect(toPublic(rec).has_eeo).toBe(false);
  });
});
