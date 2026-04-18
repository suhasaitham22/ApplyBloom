import { describe, it, expect } from "vitest";
import { PROMPTS, type PromptKey } from "../index";

describe("PROMPTS", () => {
  const expectedKeys: PromptKey[] = [
    "parse_resume",
    "chat_resume",
    "tailor_resume",
    "match_jobs",
    "auto_apply_coach",
    "general_chat",
  ];

  it("exports all expected prompt keys", () => {
    for (const key of expectedKeys) {
      expect(PROMPTS[key]).toBeDefined();
    }
  });

  it("each prompt has name, version, and system", () => {
    for (const key of expectedKeys) {
      const p = PROMPTS[key];
      expect(typeof p.name).toBe("string");
      expect(p.name.length).toBeGreaterThan(0);
      expect(typeof p.version).toBe("string");
      expect(p.version).toMatch(/^v\d+$/);
      expect(typeof p.system).toBe("string");
      expect(p.system.length).toBeGreaterThan(10);
    }
  });

  it("prompt names match keys", () => {
    for (const key of expectedKeys) {
      expect(PROMPTS[key].name).toBe(key);
    }
  });
});
