# ApplyBloom Browser Extension

MV3 extension (Chrome + Firefox) that executes job applications inside the user's
own browser, driven by long-polling against the ApplyBloom backend.

## Why an extension

- User's own IP = best possible signal for ATS bot-detection filters
- Works on every OS and every device the user already uses
- No server-side browser infra needed (Cloudflare free tier compatible)
- User can watch every apply happen; `prefers-reduced-motion` and safety-ladder
  keep the first 3 applies in "fill, don't submit" mode

## Architecture

- `src/background.ts` — service worker. Long-polls `/api/v1/apply/claim` every 5s,
  opens a tab per claimed job, orchestrates the content script.
- `src/content-scripts/{greenhouse,lever,ashby}.ts` — per-ATS form fillers.
  They all use the same `buildFillPlan()` primitive and differ only in DOM selectors
  for Submit buttons and file inputs.
- `src/lib/form-fill.ts` — DOM helpers (setValue, label-to-input matching, profile autofill).
- `src/lib/api-client.ts` — thin HTTP client talking to the backend.
- `src/lib/safety-ladder.ts` — first `GUIDED_THRESHOLD` (=3) applies are guided mode.

## Local development

    npm install
    npm run build     # writes dist/
    npm test
    npm run typecheck

Load unpacked from `dist/` in `chrome://extensions` (Developer Mode ON).

## Install (unpacked)

1. `npm run build`
2. Chrome: `chrome://extensions` → Developer mode → Load unpacked → select `dist/`
3. Firefox: `about:debugging` → This Firefox → Load Temporary Add-on → pick `dist/manifest.json`
4. Click the extension icon → enter backend URL + your user id → Connect
5. Queue an apply from the dashboard → extension opens the job URL → fills the form

## Safety model

- First 3 successful applies per install = guided mode: extension fills everything
  but stops before clicking Submit. User reviews + submits manually.
- After 3, full auto is allowed unless the apply has `dry_run: true`.
- Every step is reported back to `/api/v1/apply/:id/report` and persists to
  `apply_queue.attempt_log`, surfacing in the dashboard.
- Novel questions (anything not in the user's qa_memory above the 0.92 cosine
  threshold) create a `qa_pending` row and stop orchestration — the user answers
  from chat or dashboard, which resumes the apply.
