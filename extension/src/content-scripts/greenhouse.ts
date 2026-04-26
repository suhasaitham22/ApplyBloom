// Greenhouse content script.
// Runs on greenhouse.io pages — receives fill instructions from background via
// chrome.runtime messages, executes them against the DOM, reports back.

import { setValue, uploadResume } from "../lib/form-fill";
import { buildFillPlan } from "../lib/fill-plan";
import type { ProfileForFill } from "../lib/types";

type Msg =
  | { type: "ab:fill"; profile: ProfileForFill; resumeSignedUrl?: string }
  | { type: "ab:collect_questions" }
  | { type: "ab:answer_question"; question_text: string; answer: string }
  | { type: "ab:click_submit"; dry_run: boolean };

async function handle(msg: Msg): Promise<unknown> {
  if (msg.type === "ab:fill") {
    const plan = buildFillPlan(document, msg.profile);
    if (msg.resumeSignedUrl) {
      const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
      if (fileInput) {
        try { await uploadResume(fileInput, msg.resumeSignedUrl, "resume.pdf"); } catch { /* non-fatal */ }
      }
    }
    return {
      filledKeys: plan.filledKeys,
      questions: plan.unansweredQuestions.map((q) => q.question_text),
    };
  }
  if (msg.type === "ab:collect_questions") {
    const plan = buildFillPlan(document, {} as ProfileForFill);
    return { questions: plan.unansweredQuestions.map((q) => q.question_text) };
  }
  if (msg.type === "ab:answer_question") {
    const labels = Array.from(document.querySelectorAll("label"));
    for (const label of labels) {
      if ((label.textContent ?? "").trim() === msg.question_text) {
        const forId = label.getAttribute("for");
        const input = forId
          ? document.querySelector("#" + CSS.escape(forId)) as HTMLInputElement | HTMLTextAreaElement | null
          : label.querySelector("input, textarea") as HTMLInputElement | HTMLTextAreaElement | null;
        if (input) { setValue(input, msg.answer); return { ok: true }; }
      }
    }
    return { ok: false, reason: "not_found" };
  }
  if (msg.type === "ab:click_submit") {
    if (msg.dry_run) return { ok: false, reason: "dry_run" };
    const btn = document.querySelector<HTMLButtonElement>('button[type="submit"], input[type="submit"]');
    if (!btn) return { ok: false, reason: "no_submit" };
    btn.click();
    return { ok: true };
  }
  return { ok: false, reason: "unknown_message" };
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg: Msg, _sender, send) => {
    handle(msg).then(send).catch((e) => send({ ok: false, error: String(e) }));
    return true;
  });
}
