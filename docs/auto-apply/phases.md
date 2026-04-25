# Phased Delivery Plan

Each phase is one PR. Docs-first, code-after-approval, ship-after-verify.

## PR A — Profile Intake + Q&A Memory (foundation, no browser yet)

**Goal:** unblock everything else — no auto-apply can run without this data.

**Ships:**
- Migration 005: `user_profiles` + `qa_memory` tables with RLS
- Backend: `/api/v1/profile` GET/PUT, `/api/v1/qa-memory` GET/POST with embedding-based similarity search
- Frontend `/onboarding` wizard — 4 steps (Basics / Work Auth / Preferences / EEO)
- Chat integration: when AI hits an unknown question it pauses the session and posts: _"Need your answer to: '...'. I'll remember it."_
- Validation: `session.mode="auto"` is rejected on the API if profile is incomplete
- Tests: profile CRUD, Q&A similarity matcher (cosine thresholds), onboarding wizard smoke

**Out of scope:** no browser automation, no new adapters, no orchestrator.

**Acceptance:** user can complete the wizard, AI can store + retrieve Q&A answers via chat.

---

## PR B — Real Cloudflare Playwright + Greenhouse Adapter + Dry-Run

**Goal:** one ATS fully end-to-end, manually triggered, with preview.

**Ships:**
- Swap `"playwright"` → `@cloudflare/playwright`
- Add `[browser]` binding to `wrangler.toml`
- Update `compatibility_date` + `compatibility_flags=["nodejs_compat"]` if needed
- Rewrite `applyJobWithPlaywright` to use Browser Rendering
- **Real** Greenhouse adapter: detect form fields by known Greenhouse DOM structure, fill from `user_profile` + `qa_memory`, upload tailored PDF, screenshot each step, stop before Submit (dry-run mode)
- New `applications.status='dry_run_preview'` — UI shows screenshots, user clicks "Submit for real" → second worker invocation clicks Submit
- After 3 successful dry-run confirms for a user, auto-submit becomes available
- Tests: fixture-based adapter tests (Greenhouse HTML snapshot), end-to-end with local Chromium

**Acceptance:** from `/studio`, click a real Greenhouse job, confirm dry-run screenshots look right, click "Submit for real" → application lands in the company's Greenhouse.

---

## PR C — Orchestrator + Cron + Lever Adapter

**Goal:** fully autonomous — fetches and applies on schedule without user clicking anything.

**Ships:**
- Cron Trigger `0 */4 * * *` → `scheduled()` handler
- `runAutoApplyTick(userId)`: fetch → rank (LLM upgrade from lexical-only) → tailor → apply
- Daily-cap enforcement via `applications` count in last 24h
- Lever adapter (ATS)
- Chat messages stream status: "Found 47 matches in your filters. Applying to top 5 today."
- Circuit breaker: 5 consecutive failures → auto-pause, alert via notify_user queue
- Tests: orchestrator respects daily_cap, circuit breaker trips, Lever adapter fills form

**Acceptance:** user sets `mode="auto"`, waits 4h, sees 5 applications in their `applications` table without any interaction.

---

## PR D — Observability + Ashby Adapter + Polish

**Goal:** production-grade.

**Ships:**
- `application_attempts` table with step-level logs + screenshots in R2
- Admin-ish `/applications/:id/trace` page showing full attempt timeline
- Ashby adapter
- Generic adapter improvements (more label patterns, captcha detection → pause for user)
- Rate limiting per user per ATS (respectful scraping)
- Retry policy: 3 retries with exponential backoff, then mark failed
- Tests: attempts logging, R2 screenshot round-trip, rate-limit enforcement

**Acceptance:** user can audit any application end-to-end from the UI.

---

## Why this ordering

1. **A first** — no automation is possible without user profile data
2. **B before C** — prove browser automation works with one ATS + user-in-loop before running it on cron
3. **C before D** — autonomous pipeline is the main product; observability is polish
4. Each PR ships something useful on its own. Can pause between any two.

## Estimated effort

| PR | Backend | Frontend | Tests | Docs | Total |
|---|---|---|---|---|---|
| A | 500 lines | 400 lines | 25 tests | 1 day | ~3 days |
| B | 400 lines | 200 lines | 15 tests | 0.5 day | ~2 days |
| C | 350 lines | 150 lines | 20 tests | 0.5 day | ~2 days |
| D | 450 lines | 300 lines | 20 tests | 1 day | ~3 days |

**Total: ~10 focused days to fully working auto-apply.** Each PR is self-contained,
testable in isolation, and ships value on its own.
