import { describe, it, expect, beforeEach } from "vitest";
import {
  createQAPending, listOpenQAPending, answerQAPending, __resetQAPendingStore,
} from "../store";

const env = {} as unknown as Parameters<typeof createQAPending>[0];
const USER = "u1";

beforeEach(() => __resetQAPendingStore());

describe("qa-pending store", () => {
  it("create + list open", async () => {
    await createQAPending(env, USER, {
      apply_id: "a1", session_id: "s1",
      question_text: "Why us?", question_type: "long_text",
    });
    const open = await listOpenQAPending(env, USER);
    expect(open).toHaveLength(1);
    expect(open[0].answered_at).toBeNull();
  });

  it("answering removes from open list", async () => {
    const r = await createQAPending(env, USER, { apply_id: "a1", session_id: null, question_text: "Q" });
    await answerQAPending(env, USER, r.id, "my answer");
    expect(await listOpenQAPending(env, USER)).toHaveLength(0);
  });

  it("scopes by apply_id + user", async () => {
    await createQAPending(env, USER, { apply_id: "a1", session_id: null, question_text: "Q1" });
    await createQAPending(env, USER, { apply_id: "a2", session_id: null, question_text: "Q2" });
    await createQAPending(env, "other", { apply_id: "a1", session_id: null, question_text: "Qx" });
    expect(await listOpenQAPending(env, USER, "a1")).toHaveLength(1);
    expect(await listOpenQAPending(env, USER)).toHaveLength(2);
  });

  it("answer for unknown id returns null", async () => {
    expect(await answerQAPending(env, USER, "missing", "x")).toBeNull();
  });

  it("cross-user isolation on answer", async () => {
    const r = await createQAPending(env, "other", { apply_id: "a1", session_id: null, question_text: "Q" });
    expect(await answerQAPending(env, USER, r.id, "x")).toBeNull();
  });
});
