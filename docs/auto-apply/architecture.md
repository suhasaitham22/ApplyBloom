# Auto-Apply Architecture

## System diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare Worker (edge)                    │
│                                                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ Cron        │───▶│ Orchestrator │───▶│ Queues (producer)│   │
│  │ 0 */4 * * * │    │  (per user)  │    │                  │   │
│  └─────────────┘    └──────────────┘    └────┬─────────────┘   │
│                                              │                 │
│  ┌───────────────────────────────────────────▼──────────────┐  │
│  │                Queue Consumer (batch)                    │  │
│  │                                                          │  │
│  │   fetch_jobs ──▶ rank_jobs ──▶ tailor_resume ──▶ apply_job │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────┬─────────────────────────────────────────────────┘
                │
       ┌────────┴───────────┐
       ▼                    ▼
┌──────────────┐    ┌─────────────────────┐
│ Supabase     │    │ @cloudflare/        │
│ (Postgres)   │    │ playwright +        │
│              │    │ Browser Rendering   │
│ - resumes    │    │                     │
│ - versions   │    │ - form fill         │
│ - sessions   │    │ - resume upload     │
│ - messages   │    │ - Q&A answer        │
│ - user_profile│   │ - screenshot        │
│ - applications│   │ - submit            │
│ - qa_memory  │    └─────────────────────┘
│ - credentials│              │
│              │              ▼
└──────────────┘    ┌─────────────────────┐
                   │  Target ATS          │
                   │  (Greenhouse / Lever │
                   │   / Ashby / generic) │
                   └─────────────────────┘
```

## Components

### 1. Orchestrator
Single Worker handler triggered by Cron:
- Reads every session with `mode="auto"` and `status="ready"|"running"`
- For each user: enqueue `fetch_jobs` with their preferences
- Enforces `daily_cap` — won't enqueue more than N applies per rolling 24h

### 2. Queue handlers (existing + new)
| Queue message | Handler | Responsibility |
|---|---|---|
| `fetch_jobs` | `processFetchJobsJob` | Call Greenhouse/Lever/Remotive/Arbeitnow, dedupe, save to runtime store |
| `rank_jobs` | `processMatchJobsJob` | LLM + lexical scorer (PR C upgrade) produces top-N |
| `tailor_resume` | `processTailorResumeJob` | `tailorResumeForJob` → PDF via `renderResumePdf` |
| `apply_job` | `processApplyJob` | Browser-automate submission via `@cloudflare/playwright` |
| `notify_user` | `processNotifyUserJob` | Chat message + optional Resend email |

### 3. Browser automation
- Wrangler binding `[browser] binding = "BROWSER"` (paid CF plan required)
- Adapter pattern: `detectJobProvider(url)` → `applyGreenhouseStrategy` / `applyLeverStrategy` / `applyAshbyStrategy` / `applyGenericStrategy`
- Credentials (when required) unlocked via `revealCredential(session.credential_id)` → AES-256-GCM decrypt → Playwright login
- Screenshot at each step → stored in R2 → URL saved to `applications.screenshot_urls`

### 4. Q&A memory
Each custom form question encountered:
1. Normalize text (lowercase, strip punctuation)
2. Compute embedding via Workers AI `@cf/baai/bge-small-en-v1.5` (384-dim)
3. Query Vectorize index `qa-memory-{userId}` for nearest neighbor
4. If cosine > 0.92 → auto-fill, log to `qa_memory_hits`
5. Else → pause session, post chat message: "Need your answer to: '...'"
6. User replies → save `{question, question_embedding, answer}` → resume apply

### 5. Profile intake
Required fields before `mode="auto"` is allowed:
- Legal name, email, phone
- Work authorization: citizen / green-card / H1B / OPT / needs-sponsorship
- Location + relocation willingness
- Earliest start date, notice period
- Salary floor
- LinkedIn URL, portfolio URL, GitHub URL (optional but strongly recommended)

Optional EEO (voluntary per EEOC):
- Gender, race, veteran status, disability status
- Stored AES-256-GCM encrypted

## Data model additions

### `user_profiles` table
```
id, user_id, legal_first_name, legal_last_name, email, phone, location,
work_authorization, visa_sponsorship_needed, relocation_ok,
earliest_start_date, notice_period_weeks, salary_min, salary_max,
linkedin_url, portfolio_url, github_url,
eeo_gender_enc, eeo_race_enc, eeo_veteran_enc, eeo_disability_enc,
created_at, updated_at
```
RLS: owner-only.

### `qa_memory` table
```
id, user_id, question_text, question_normalized, question_embedding,
answer, question_type, source, times_used, last_used_at, created_at
```
Composite index: `(user_id, question_normalized)`. Optional Vectorize shadow for ANN.

### `applications` upgrades
Add: `ats_provider`, `screenshot_urls jsonb`, `dry_run boolean`,
`attempt_log jsonb` (array of step descriptions + timings),
`status ('queued'|'applying'|'submitted'|'needs_input'|'failed'|'dry_run_preview')`.

Unique constraint on `(user_id, source_job_key)` — idempotency.

## Runtime constraints

| Limit | Value | Implication |
|---|---|---|
| Worker CPU time per request | 30s (paid) / 10ms (free) | Must be on paid plan for browser work |
| Queue message TTL | 12 hours default | Retries naturally within SLA |
| Browser session | 10 min wall-clock | Enough for any single application |
| Workers AI rate limits | Per account | Batch embeddings in groups of 100 |
| Supabase row-limit | none realistically | RLS scales linearly |

## Security

- Credentials AES-256-GCM (existing, from credentials-vault PR)
- EEO answers use the same crypto helpers
- No job-board passwords sent to the model — only to the browser
- Screenshots uploaded to private R2 bucket, signed URLs for UI display (15min TTL)
- Hard circuit breaker: 5 consecutive failed applies for same user → pause mode + alert

## Observability

- Every queue handler logs: `{user_id, request_id, job_id, step, duration_ms, result}`
- `application_attempts` table replaces ad-hoc logs
- Screenshots at: page load, post-upload, pre-submit, post-submit
- Prometheus-style `/metrics` endpoint (paid plan perk — future PR)
