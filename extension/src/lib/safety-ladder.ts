// First N applies per user are guided mode.
const KEY = "ab_submitted_count";
const GUIDED_THRESHOLD = 3;

type ChromeLike = {
  storage?: {
    local?: {
      get: (key: string | string[]) => Promise<Record<string, unknown>>;
      set: (items: Record<string, unknown>) => Promise<void>;
    };
  };
};

async function readCount(c: ChromeLike): Promise<number> {
  const s = await c.storage?.local?.get(KEY);
  const v = s?.[KEY];
  return typeof v === "number" ? v : 0;
}

async function writeCount(c: ChromeLike, n: number): Promise<void> {
  await c.storage?.local?.set({ [KEY]: n });
}

export async function isGuidedMode(c: ChromeLike): Promise<boolean> {
  const n = await readCount(c);
  return n < GUIDED_THRESHOLD;
}

export async function recordSubmittedApply(c: ChromeLike): Promise<number> {
  const n = await readCount(c);
  const next = n + 1;
  await writeCount(c, next);
  return next;
}

export { GUIDED_THRESHOLD };
