# Architecture Decisions

Each decision captures: **what we picked · what we rejected · why**.

## D1 — Cloudflare Browser Rendering vs. external runner

**Picked:** `@cloudflare/playwright` + Browser Rendering binding.

**Rejected:** separate Fly.io / Render Node server running vanilla Playwright.

**Why:**
- Single deployment (one repo, one `wrangler deploy`)
- Browser time is wall-clock — doesn't hit the 30s CPU limit
- Cost: included in $5/mo Workers Paid plan baseline
- Trade-off: requires paid plan (acceptable — free plan can't auto-apply at any scale anyway)

## D2 — LinkedIn automation

**Picked:** discover-only via legal aggregators (JSearch, which aggregates LinkedIn public posts via Google for Jobs). Never automate logged-in LinkedIn actions.

**Rejected:** direct LinkedIn scraping / Easy Apply automation.

**Why:**
- TOS violation (LinkedIn Section 8.2 prohibits "use any automated means...")
- hiQ v. LinkedIn settled in LinkedIn's favor post-remand — they win CFAA arguments on logged-in accounts
- Account-ban rate in OSS tools (AIHawk, etc.) is high, often permanent
- Aggregators already redirect to the underlying ATS — we apply there legitimately

## D3 — Job-board source priority

**Picked:** Greenhouse + Lever (P0) → Remotive + Arbeitnow (P1) → Adzuna + JSearch (P2, gated by env)

**Rejected:** Indeed direct scraping, ZipRecruiter direct.

**Why:**
- P0 are public, documented APIs with legit apply endpoints
- P1 are CC-BY-licensed aggregators — free, no auth, safe
- P2 are paid tiers — only enable when user provides their own API key
- Indeed/ZipRecruiter rate-limit aggressively and require scraping gray-areas

## D4 — Q&A memory matching threshold

**Picked:** cosine similarity > **0.92** for auto-fill; 0.75–0.92 shows suggestion + confirm; <0.75 asks user.

**Rejected:** single threshold at 0.85.

**Why:**
- Custom questions vary wildly ("why do you want to work here?" vs. "why are you interested?" — both should hit, but different wording)
- Conservative threshold (0.92) prevents wrong answers being submitted silently
- Middle tier (suggestion + confirm) builds trust + teaches user our matcher is good
- Can retune after first 100 applications per user

## D5 — Dry-run default

**Picked:** first 3 applications per user are dry-run by default. After 3 confirmed-submitted, dry-run becomes opt-in.

**Rejected:** always dry-run, or never dry-run.

**Why:**
- New users trust us to review the actual form before submit — reduces "oh no, it sent my resume with wrong name" anxiety
- After 3 successful submits the user has seen enough; forcing dry-run forever = friction
- User can always re-enable via Settings

## D6 — EEO / demographic handling

**Picked:** Collect voluntarily in onboarding. Store AES-256-GCM encrypted. Fill into ATS EEO sections automatically when answered. Never guess from name/profile.

**Rejected:** Skip EEO entirely (= lots of applications fail submit).

**Why:**
- Most US ATS require at least "decline to answer" selection — blank breaks submit
- EEOC explicitly allows voluntary collection; we follow their schema
- Encrypted at rest = SOC2 audit checkbox checked

## D7 — Daily cap

**Picked:** 10/day default, user-configurable up to 50.

**Rejected:** 25+/day default.

**Why:**
- Flooding recruiters with generic applies = quality tanks, user reputation hurt
- 10 well-tailored applications = tomorrow's interview pipeline
- Users who want more volume can explicitly raise the cap — we warn at 25+

## D8 — Yjs / real-time collab

**Picked:** none. Resume stays in Postgres, edits are request/response.

**Rejected:** Yjs + WebSocket server.

**Why:**
- One human + one AI; AI returns structured ops, not cursor edits
- 200KB+ bundle, WebSocket infra, Awareness model — all unused overhead
- Easy to add later if we ever add multi-device live editing or share-with-recruiter

## D9 — Cron schedule

**Picked:** every 4 hours (`0 */4 * * *`).

**Rejected:** hourly, daily.

**Why:**
- Hourly = fast feedback but we'd hit aggregator rate limits + sub-optimal since job postings refresh slowly
- Daily = too slow for users who want "overnight my 10 applications are in"
- 4h = 6 ticks/day → matches 10/day cap comfortably (average <2 per tick)

## D10 — Storing resumes for apply

**Picked:** store generated PDF in R2 per-apply, URL logged in `applications.tailored_pdf_url`, expires after 30 days.

**Rejected:** re-generate PDF every apply / store in Supabase storage.

**Why:**
- R2 is cheaper and already integrated
- 30-day retention = user can audit what was actually submitted
- Re-generation on demand = wasted compute + harder to debug "what did ATS see?"

---

## Open decisions (will lock before each PR)

- [ ] Should rerank use LLM or just lexical? (trade-off: quality vs. cost per user per day)
- [ ] Retry strategy for failed applies — 3 retries with backoff, or single attempt + manual?
- [ ] Captcha handling — currently plan is "detect + pause for user"; is 2Captcha integration worth $$ for seamless flow?
- [ ] Rate limit per ATS: should we add our own on top of CF's? (paranoia vs. respect)
