// Wrap Workers AI `@cf/baai/bge-small-en-v1.5` for question embeddings.
// Returns a 384-dim float array.
// If `env.AI` is unavailable (local dev), falls back to a deterministic hash-based
// embedding so similarity-based tests can run without a real model. The fallback
// is intentionally low-quality — it just exercises the cosine path.

const EMBED_MODEL = "@cf/baai/bge-small-en-v1.5";
const EMBED_DIM = 384;

/** Hash string → 32-bit integer (djb2). */
function hash32(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h;
}

/** Deterministic fake embedding: token-bag projected into EMBED_DIM buckets. */
function fallbackEmbed(text: string): number[] {
  const v = new Array<number>(EMBED_DIM).fill(0);
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    const h = hash32(t);
    const bucket = Math.abs(h) % EMBED_DIM;
    v[bucket] += 1;
  }
  // L2 normalize
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  return v.map((x) => x / norm);
}

type AiEnv = { AI?: { run: (model: string, inputs: Record<string, unknown>) => Promise<unknown> } };

/** Embed a single question. Returns 384-dim float array, L2-normalized. */
export async function embedQuestion(env: AiEnv, text: string): Promise<number[]> {
  if (!env.AI) return fallbackEmbed(text);
  try {
    const resp = (await env.AI.run(EMBED_MODEL, { text: [text] })) as {
      shape?: number[];
      data?: number[][];
    };
    const vec = resp?.data?.[0];
    if (Array.isArray(vec) && vec.length === EMBED_DIM) return vec;
    return fallbackEmbed(text);
  } catch {
    return fallbackEmbed(text);
  }
}

/** Batch version — caller may want to embed many questions at once. */
export async function embedQuestions(env: AiEnv, texts: string[]): Promise<number[][]> {
  if (!env.AI) return texts.map(fallbackEmbed);
  try {
    const resp = (await env.AI.run(EMBED_MODEL, { text: texts })) as {
      data?: number[][];
    };
    const out = resp?.data;
    if (Array.isArray(out) && out.length === texts.length) return out;
    return texts.map(fallbackEmbed);
  } catch {
    return texts.map(fallbackEmbed);
  }
}

export const QA_EMBED_DIM = EMBED_DIM;
export const QA_EMBED_MODEL = EMBED_MODEL;
