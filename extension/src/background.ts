// Background service worker.
// Long-polls /api/v1/apply/claim every 5s when idle, opens a tab per claimed
// apply, orchestrates the per-ATS content script via chrome.runtime.sendMessage.

import {
  claimNext, reportStatus, reportStep, createPendingQA,
  matchQA, getProfile, type ApiConfig,
} from "./lib/api-client";
import type { ApplyRecord, ProfileForFill } from "./lib/types";
import { isGuidedMode, recordSubmittedApply } from "./lib/safety-ladder";

const STORAGE_KEYS = {
  cfg: "ab_cfg",
};

const POLL_INTERVAL_MS = 5_000;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let currentApply: ApplyRecord | null = null;

async function getConfig(): Promise<ApiConfig | null> {
  const v = (await chrome.storage.local.get(STORAGE_KEYS.cfg))[STORAGE_KEYS.cfg];
  return (v as ApiConfig | undefined) ?? null;
}

async function openTabAndRun(cfg: ApiConfig, apply: ApplyRecord): Promise<void> {
  const tab = await chrome.tabs.create({ url: apply.apply_url, active: false });
  const tabId = tab.id;
  if (!tabId) throw new Error("failed to open tab");
  await waitForTabLoad(tabId);

  const { profile } = await getProfile(cfg).catch(() => ({ profile: null }));
  const fillProfile = (profile ?? {}) as Partial<ProfileForFill>;

  await reportStatus(cfg, apply.id, "running");
  await reportStep(cfg, apply.id, "opened_page", apply.apply_url);

  const fillResult = (await chrome.tabs.sendMessage(tabId, {
    type: "ab:fill", profile: fillProfile,
  })) as { filledKeys: string[]; questions: string[] } | undefined;

  await reportStep(cfg, apply.id, "auto_filled", (fillResult?.filledKeys ?? []).join(","));

  // Resolve unanswered questions via qa_memory match → auto / suggest / ask.
  const questions = fillResult?.questions ?? [];
  for (const q of questions) {
    const { match } = await matchQA(cfg, q).catch(() => ({ match: null }));
    if (match && match.verdict === "auto") {
      await chrome.tabs.sendMessage(tabId, {
        type: "ab:answer_question", question_text: q, answer: match.record.answer,
      });
      await reportStep(cfg, apply.id, "qa_auto_filled", q);
    } else {
      await createPendingQA(cfg, {
        apply_id: apply.id,
        question_text: q,
        suggested_answer: match?.record.answer ?? null,
        suggested_verdict: match?.verdict ?? "ask",
      });
      await reportStatus(cfg, apply.id, "needs_input");
      return; // stop orchestration; user will answer, apply resumes on next poll cycle
    }
  }

  // Safety ladder: first 3 applies are guided (fill, user clicks Submit)
  const guided = await isGuidedMode(chrome);
  if (guided || apply.dry_run) {
    await reportStep(cfg, apply.id, "stopped_before_submit", guided ? "guided_mode" : "dry_run");
    await reportStatus(cfg, apply.id, "needs_input", { error: null });
    return;
  }

  const submit = (await chrome.tabs.sendMessage(tabId, {
    type: "ab:click_submit", dry_run: apply.dry_run,
  })) as { ok: boolean; reason?: string } | undefined;

  if (submit?.ok) {
    await reportStatus(cfg, apply.id, "submitted");
    await recordSubmittedApply(chrome);
  } else {
    await reportStatus(cfg, apply.id, "failed", { error: submit?.reason ?? "submit_failed" });
  }
}

function waitForTabLoad(tabId: number, timeoutMs = 15_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const check = () => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (tab.status === "complete") return resolve();
        if (Date.now() - t0 > timeoutMs) return reject(new Error("tab load timeout"));
        setTimeout(check, 300);
      });
    };
    check();
  });
}

async function pollOnce(): Promise<void> {
  if (currentApply) return; // busy
  const cfg = await getConfig();
  if (!cfg) return;
  try {
    const { item } = await claimNext(cfg);
    if (!item) return;
    currentApply = item;
    try {
      await openTabAndRun(cfg, item);
    } catch (e) {
      await reportStatus(cfg, item.id, "failed", { error: e instanceof Error ? e.message : String(e) });
    } finally {
      currentApply = null;
    }
  } catch {
    // auth or network hiccup — retry on next poll
  }
}

function startPolling(): void {
  if (pollTimer) return;
  pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
  pollOnce();
}

function stopPolling(): void {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

// Popup commands
chrome.runtime.onMessage.addListener((msg: unknown, _sender, send) => {
  const m = msg as { type?: string; cfg?: ApiConfig };
  if (m?.type === "ab:connect" && m.cfg) {
    chrome.storage.local.set({ [STORAGE_KEYS.cfg]: m.cfg }).then(() => {
      startPolling();
      send({ ok: true });
    });
    return true;
  }
  if (m?.type === "ab:disconnect") {
    chrome.storage.local.remove(STORAGE_KEYS.cfg).then(() => {
      stopPolling();
      send({ ok: true });
    });
    return true;
  }
  if (m?.type === "ab:status") {
    send({ connected: Boolean(pollTimer), currentApply });
    return true;
  }
  return false;
});

// Auto-start on reload if config exists.
getConfig().then((cfg) => { if (cfg) startPolling(); });

export { pollOnce, openTabAndRun }; // exported for tests
