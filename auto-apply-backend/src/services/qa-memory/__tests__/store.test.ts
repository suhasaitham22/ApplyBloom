import { describe, expect, it, beforeEach } from "vitest";
import {
  listQA, upsertQA, markQAUsed, deleteQA,
  findSimilarAnswer, normalizeQuestion, cosineSimilarity,
  classifyMatch, QA_AUTO_THRESHOLD, QA_SUGGEST_THRESHOLD,
  __resetQAMemoryStore,
} from "../store";

const USER = "user-1";
const env = {} as unknown as Parameters<typeof listQA>[0];

beforeEach(() => __resetQAMemoryStore());

describe("qa-memory normalization + similarity", () => {
  it("normalizes to lowercase, strips punctuation and diacritics", () => {
    expect(normalizeQuestion("Are you Authorized?  ")).toBe("are you authorized");
    expect(normalizeQuestion("résumé  w/ typo!!")).toBe("resume w typo");
  });

  it("cosineSimilarity: identical vectors = 1", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });

  it("cosineSimilarity: orthogonal = 0", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it("cosineSimilarity: empty / mismatched lengths = 0", () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1], [1, 2])).toBe(0);
  });

  it("classifyMatch uses 0.92/0.75 thresholds per decisions.md", () => {
    expect(classifyMatch(0.95)).toBe("auto");
    expect(classifyMatch(QA_AUTO_THRESHOLD)).toBe("auto");
    expect(classifyMatch(0.80)).toBe("suggest");
    expect(classifyMatch(QA_SUGGEST_THRESHOLD)).toBe("suggest");
    expect(classifyMatch(0.5)).toBe("ask");
  });
});

describe("qa-memory store (memory mode)", () => {
  it("upsertQA creates a new row; re-upsert updates answer", async () => {
    const a = await upsertQA(env, USER, { question_text: "Are you authorized?", answer: "Yes" });
    expect(a.answer).toBe("Yes");
    const b = await upsertQA(env, USER, { question_text: "Are you authorized?", answer: "Yes — citizen" });
    expect(b.id).toBe(a.id);
    expect(b.answer).toBe("Yes — citizen");
  });

  it("listQA scopes by user_id", async () => {
    await upsertQA(env, USER, { question_text: "Q1", answer: "A1" });
    await upsertQA(env, "other-user", { question_text: "Q1", answer: "A-other" });
    const mine = await listQA(env, USER);
    expect(mine).toHaveLength(1);
    expect(mine[0].answer).toBe("A1");
  });

  it("markQAUsed increments times_used + sets last_used_at", async () => {
    const r = await upsertQA(env, USER, { question_text: "Q", answer: "A" });
    await markQAUsed(env, USER, r.id);
    await markQAUsed(env, USER, r.id);
    const updated = (await listQA(env, USER))[0];
    expect(updated.times_used).toBe(2);
    expect(updated.last_used_at).not.toBeNull();
  });

  it("deleteQA removes the row + scopes by user", async () => {
    const r = await upsertQA(env, USER, { question_text: "Q", answer: "A" });
    expect(await deleteQA(env, "other-user", r.id)).toBe(false);
    expect(await deleteQA(env, USER, r.id)).toBe(true);
    expect(await listQA(env, USER)).toHaveLength(0);
  });

  describe("findSimilarAnswer", () => {
    it("exact normalized match → similarity 1, verdict auto", async () => {
      await upsertQA(env, USER, { question_text: "Are you authorized to work?", answer: "Yes" });
      const hit = await findSimilarAnswer(env, USER, { question_text: "are you AUTHORIZED to work" });
      expect(hit?.similarity).toBe(1);
      expect(hit?.verdict).toBe("auto");
      expect(hit?.record.answer).toBe("Yes");
    });

    it("high cosine → auto verdict", async () => {
      await upsertQA(env, USER, {
        question_text: "Do you need sponsorship?",
        answer: "No",
        question_embedding: [1, 0, 0, 0],
      });
      const hit = await findSimilarAnswer(env, USER, {
        question_text: "Will you require visa sponsorship?",
        question_embedding: [0.99, 0.1, 0, 0],
      });
      expect(hit).not.toBeNull();
      expect(hit!.similarity).toBeGreaterThan(QA_AUTO_THRESHOLD);
      expect(hit!.verdict).toBe("auto");
    });

    it("mid cosine → suggest verdict", async () => {
      await upsertQA(env, USER, {
        question_text: "Foo bar baz",
        answer: "ans",
        question_embedding: [1, 0, 0, 0],
      });
      const hit = await findSimilarAnswer(env, USER, {
        question_text: "Totally different",
        question_embedding: [0.8, 0.6, 0, 0],
      });
      expect(hit?.verdict).toBe("suggest");
    });

    it("returns null when no embedding + no exact match", async () => {
      await upsertQA(env, USER, { question_text: "Q1", answer: "A" });
      const hit = await findSimilarAnswer(env, USER, { question_text: "completely unrelated" });
      expect(hit).toBeNull();
    });

    it("skips stored rows without an embedding when only semantic match is possible", async () => {
      await upsertQA(env, USER, { question_text: "Q1", answer: "A" }); // no embedding
      const hit = await findSimilarAnswer(env, USER, {
        question_text: "something",
        question_embedding: [1, 0],
      });
      expect(hit).toBeNull();
    });
  });
});
