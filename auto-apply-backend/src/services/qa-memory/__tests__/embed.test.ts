import { describe, expect, it } from "vitest";
import { embedQuestion, embedQuestions, QA_EMBED_DIM } from "../embed";

describe("qa-memory embed", () => {
  it("fallback produces a 384-dim L2-normalized vector", async () => {
    const v = await embedQuestion({} as { AI?: { run: (m: string, i: unknown) => Promise<unknown> } }, "hello world");
    expect(v).toHaveLength(QA_EMBED_DIM);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("fallback is deterministic", async () => {
    const a = await embedQuestion({}, "same text");
    const b = await embedQuestion({}, "same text");
    expect(a).toEqual(b);
  });

  it("different text → different embedding", async () => {
    const a = await embedQuestion({}, "question one");
    const b = await embedQuestion({}, "totally different query");
    expect(a).not.toEqual(b);
  });

  it("uses env.AI.run when available", async () => {
    const expected = new Array(QA_EMBED_DIM).fill(0).map((_, i) => i / QA_EMBED_DIM);
    const env = {
      AI: {
        run: async (_model: string, input: unknown) => ({
          data: [expected],
        }),
      },
    };
    const v = await embedQuestion(env, "whatever");
    expect(v).toEqual(expected);
  });

  it("falls back on malformed AI response", async () => {
    const env = {
      AI: { run: async () => ({ data: null }) },
    };
    const v = await embedQuestion(env, "x");
    expect(v).toHaveLength(QA_EMBED_DIM);
  });

  it("falls back on AI throw", async () => {
    const env = {
      AI: { run: async () => { throw new Error("boom"); } },
    };
    const v = await embedQuestion(env, "x");
    expect(v).toHaveLength(QA_EMBED_DIM);
  });

  it("embedQuestions batches when AI is available", async () => {
    const vecs = [new Array(QA_EMBED_DIM).fill(0.1), new Array(QA_EMBED_DIM).fill(0.2)];
    const env = { AI: { run: async () => ({ data: vecs }) } };
    const out = await embedQuestions(env, ["a", "b"]);
    expect(out).toEqual(vecs);
  });
});
