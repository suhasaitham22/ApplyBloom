import { describe, it, expect, beforeEach } from "vitest";
import {
  createCredential,
  listCredentials,
  getCredential,
  updateCredential,
  deleteCredential,
  logAccess,
  toRedacted,
  type CredentialRecord,
  type CredentialProvider,
} from "../store";

const env = {}; // memory mode
const USER_A = "user-a";
const USER_B = "user-b";

function baseInput(provider: CredentialProvider = "linkedin", label: string | null = null) {
  return {
    provider,
    label,
    username_enc: "enc-username",
    password_enc: "enc-password",
  };
}

describe("credentials store (memory mode)", () => {
  beforeEach(() => {
    // memory store is module-level; we clean by listing and deleting
    // but since tests share the module, we use unique labels per test
  });

  it("creates, lists, gets a credential", async () => {
    const created = await createCredential(env, USER_A, baseInput("linkedin", "t1"));
    expect(created.id).toBeTruthy();
    expect(created.provider).toBe("linkedin");

    const list = await listCredentials(env, USER_A);
    expect(list.some((c) => c.id === created.id)).toBe(true);

    const got = await getCredential(env, USER_A, created.id);
    expect(got?.id).toBe(created.id);
  });

  it("isolates between users", async () => {
    const aCred = await createCredential(env, USER_A, baseInput("greenhouse", "t2"));
    const bCred = await createCredential(env, USER_B, baseInput("greenhouse", "t2"));

    const a = await listCredentials(env, USER_A);
    const b = await listCredentials(env, USER_B);
    expect(a.every((c) => c.user_id === USER_A)).toBe(true);
    expect(b.every((c) => c.user_id === USER_B)).toBe(true);

    // user B cannot read user A's cred
    expect(await getCredential(env, USER_B, aCred.id)).toBeNull();
    expect(await getCredential(env, USER_A, bCred.id)).toBeNull();
  });

  it("updates a credential", async () => {
    const c = await createCredential(env, USER_A, baseInput("lever", "t3"));
    await new Promise((res) => setTimeout(res, 5));
    const updated = await updateCredential(env, USER_A, c.id, { label: "Updated" });
    expect(updated?.label).toBe("Updated");
    expect(new Date(updated!.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(c.updated_at).getTime());
  });

  it("update returns null for missing", async () => {
    const r = await updateCredential(env, USER_A, "nonexistent-id", { label: "x" });
    expect(r).toBeNull();
  });

  it("deletes a credential", async () => {
    const c = await createCredential(env, USER_A, baseInput("indeed", "t4"));
    const deleted = await deleteCredential(env, USER_A, c.id);
    expect(deleted).toBe(true);
    expect(await getCredential(env, USER_A, c.id)).toBeNull();
  });

  it("delete returns false for missing", async () => {
    expect(await deleteCredential(env, USER_A, "nope")).toBe(false);
  });

  it("logAccess is a no-op in memory mode", async () => {
    const c = await createCredential(env, USER_A, baseInput("wellfound", "t5"));
    await expect(logAccess(env, USER_A, c.id, "reveal")).resolves.toBeUndefined();
  });
});

describe("toRedacted", () => {
  function base(): CredentialRecord {
    return {
      id: "id-1",
      user_id: "u",
      provider: "linkedin",
      label: "Main",
      username_enc: "x",
      password_enc: "y",
      extra_enc: null,
      last_used_at: null,
      usage_count: 3,
      created_at: "now",
      updated_at: "now",
    };
  }

  it("masks an email username", () => {
    const r = toRedacted(base(), "john.doe@gmail.com");
    expect(r.username_masked).toBe("j•••@gmail.com");
    expect(r.has_password).toBe(true);
    expect(r.has_extra).toBe(false);
  });

  it("masks a short plain username", () => {
    const r = toRedacted(base(), "jo");
    expect(r.username_masked).toBe("••");
  });

  it("masks a long plain username", () => {
    const r = toRedacted(base(), "johnsmith");
    expect(r.username_masked.startsWith("j")).toBe(true);
    expect(r.username_masked.endsWith("h")).toBe(true);
    expect(r.username_masked).not.toContain("ohnsmi");
  });

  it("produces placeholder when username not provided", () => {
    const r = toRedacted(base());
    expect(r.username_masked).toBe("••••••••");
  });

  it("sets has_extra when extra_enc is present", () => {
    const rec = base();
    rec.extra_enc = "something";
    expect(toRedacted(rec).has_extra).toBe(true);
  });
});
