import { describe, it, expect } from "vitest";
import { isGuidedMode, recordSubmittedApply, GUIDED_THRESHOLD } from "../lib/safety-ladder";

function makeFakeChrome() {
  const store: Record<string, unknown> = {};
  return {
    storage: {
      local: {
        get: async (key: string | string[]) => {
          const keys = Array.isArray(key) ? key : [key];
          const out: Record<string, unknown> = {};
          for (const k of keys) if (k in store) out[k] = store[k];
          return out;
        },
        set: async (items: Record<string, unknown>) => { Object.assign(store, items); },
      },
    },
    _store: store,
  };
}

describe("safety-ladder", () => {
  it("guided mode for first GUIDED_THRESHOLD applies", async () => {
    const c = makeFakeChrome();
    for (let i = 0; i < GUIDED_THRESHOLD; i++) {
      expect(await isGuidedMode(c)).toBe(true);
      await recordSubmittedApply(c);
    }
    expect(await isGuidedMode(c)).toBe(false);
  });

  it("recordSubmittedApply increments + persists", async () => {
    const c = makeFakeChrome();
    const n1 = await recordSubmittedApply(c);
    const n2 = await recordSubmittedApply(c);
    expect(n2).toBe(n1 + 1);
  });

  it("GUIDED_THRESHOLD matches locked decision (3 applies)", () => {
    expect(GUIDED_THRESHOLD).toBe(3);
  });
});
