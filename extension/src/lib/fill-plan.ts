// Shared logic used by every content-script. Pure & testable.

import {
  autoFillProfile, extractUnansweredQuestions, LABEL_PATTERNS,
} from "./form-fill";
import type { ProfileForFill } from "./types";

export interface FillPlan {
  filledKeys: string[];
  unansweredQuestions: Array<{ question_text: string; input: HTMLInputElement | HTMLTextAreaElement }>;
}

/**
 * Execute the generic fill pass: autofill profile fields, collect remaining questions.
 */
export function buildFillPlan(doc: Document, profile: ProfileForFill): FillPlan {
  const filledKeys = autoFillProfile(doc, profile as unknown as Partial<Record<string, string | null>>);
  const unansweredQuestions = extractUnansweredQuestions(doc, filledKeys);
  return { filledKeys, unansweredQuestions };
}

export const PROFILE_KEYS = Object.keys(LABEL_PATTERNS);
