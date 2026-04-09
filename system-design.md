# AI Auto Job Apply Platform - System Design

## 1. Design Goal

Build a production system that turns a user's resume into:

1. Structured candidate data.
2. Relevant job recommendations.
3. Job-specific tailored resumes.
4. Automated application attempts.
5. Persistent application tracking.
6. User notifications and auditability.

The platform should reuse existing open-source repositories and managed services instead of rebuilding every subsystem from scratch.

The codebase should be split into two separate repositories:

- `frontend` repo for the product UI
- `backend` repo for APIs, workers, queues, parsing, matching, tailoring, and automation

This is a deliberate non-monorepo design to keep responsibilities clear and deployments independent.

---

## 2. Verified Building Blocks

### 2.1 Job Discovery

- [`speedyapply/JobSpy`](https://github.com/speedyapply/JobSpy) is a jobs scraper library for pulling listings from multiple job boards.

Use this repo as the base for multi-source job ingestion and normalization.

### 2.2 Resume Parsing

- [`OmkarPathak/pyresparser`](https://github.com/OmkarPathak/pyresparser) exports structured resume data.

Use this as the first parsing path because it already extracts skills, experience, company names, degree, and related fields.

### 2.3 Resume Parsing Fallback

- An alternative `resume-parser` layer should be available as a fallback parser if the primary parser fails.

The exact public repo linked in the prompt was not surfaced cleanly in search, so the design treats this as a swappable fallback parser service rather than assuming a single implementation.

### 2.4 LinkedIn / Auto-Apply Automation

- The exact LinkedIn auto-apply repo linked in the prompt was not surfaced cleanly in public search.
- Public LinkedIn automation bots commonly use Selenium or similar browser automation to submit Easy Apply flows.
- The main architectural lesson from these repos is not the UI, but the automation pattern:
  - login/session management
  - form filling
  - multi-step application handling
  - resume upload
  - question answering

Use the repository code as a foundation for a dedicated apply worker, not inside the edge API layer.

### 2.5 Matching / Semantic Search

- The prompt’s semantic matching repo name was not surfaced reliably in public search.
- The design therefore treats semantic matching as a dedicated service layer backed by embeddings and similarity search.

In practice, this layer can be implemented using Workers AI embeddings plus a relational vector store.

### 2.6 Frontend Scaffold

- [`saasfly`](https://github.com/saasfly/saasfly) is a Next.js SaaS starter.

Use it as a UI scaffold reference for auth, dashboard layout, and product shell if the structure fits, but do not let the starter dictate the core architecture.

### 2.7 Platform Services

- [Cloudflare Workers](https://workers.cloudflare.com/) for edge API orchestration.
- [Cloudflare Pages](https://pages.cloudflare.com/) for the frontend.
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) for embeddings, structured generation, extraction, and lightweight inference.
- [Supabase](https://supabase.com/) for Postgres, Auth, Storage, and realtime state.
- [Upstash Redis](https://upstash.com/) for queueing and job coordination.
- [Resend](https://resend.com/docs) for user notifications and email status events.

---

## 3. System Architecture

```text
User
  -> Next.js frontend on Cloudflare Pages
  -> Cloudflare Worker API
  -> Supabase Auth + Postgres + Storage
  -> Upstash queues
  -> Background services
      -> Resume parser service
      -> Job fetcher service
      -> Matching service
      -> Resume tailoring service
      -> Apply worker service
  -> Resend notifications
```

### Key Architectural Rule

Keep the request path short.

Anything that can take more than a few hundred milliseconds or can fail independently should move to a queue-backed background workflow.

This is especially important for:

- parsing fallbacks
- job fetching
- job ranking at scale
- resume tailoring
- browser automation
- email notifications

---

## 4. Service Responsibilities

### 4.1 Frontend

Stack:

- Next.js
- Tailwind CSS
- Cloudflare Pages

Responsibilities:

- user sign up and sign in
- resume upload
- job preferences
- ranked job feed
- tailored resume preview
- application status dashboard
- notifications and history

Frontend should be a product shell, not the place where business logic lives.

### 4.2 API Gateway / Orchestrator

Stack:

- Cloudflare Workers

Responsibilities:

- authenticate requests
- validate inputs
- create and update application records
- enqueue background jobs
- expose user-facing JSON APIs
- coordinate model calls and service calls

The Worker layer should stay stateless and small.

### 4.3 Resume Parsing Service

Primary:

- `pyresparser`

Fallback:

- alternate parser service

Responsibilities:

- accept a raw resume file
- extract text and structure
- normalize skills, titles, dates, companies, and education
- emit confidence values and parse warnings

Suggested output shape:

```json
{
  "name": "",
  "email": "",
  "phone": "",
  "skills": [],
  "experience_years": 0,
  "roles": [],
  "education": [],
  "summary": "",
  "confidence": {
    "overall": 0.0,
    "skills": 0.0,
    "experience": 0.0
  }
}
```

### 4.4 Job Fetcher Service

Primary source:

- `JobSpy`

Secondary sources:

- Greenhouse job boards
- Lever postings API
- company career pages when needed

Responsibilities:

- search for jobs by keyword, location, and seniority
- normalize many sources into one schema
- deduplicate postings
- preserve source metadata and apply URLs

Suggested job schema:

```json
{
  "source": "jobspy|greenhouse|lever|manual",
  "source_job_id": "",
  "title": "",
  "company": "",
  "location": "",
  "remote": true,
  "description": "",
  "apply_url": "",
  "posted_at": "",
  "salary_min": null,
  "salary_max": null
}
```

### 4.5 Matching Service

This is the semantic layer that ranks jobs against the profile.

Responsibilities:

- embed resume profile and job description
- compute similarity
- apply hard filters for location, seniority, remote, salary, and visa constraints
- explain why a job was ranked highly

Recommended implementation:

1. Create embeddings from resume summary, skills, and experience bullets.
2. Create embeddings for job descriptions.
3. Store vectors in Postgres with `pgvector` or an equivalent vector index.
4. Rerank using deterministic rules and an LLM-based explanation layer.

Why this design:

- embeddings handle broad semantic similarity
- rules handle user constraints
- explanations make the ranking trustworthy

### 4.6 Resume Tailoring Service

This is the highest-value AI feature.

Responsibilities:

- rewrite resume bullets for the target role
- reorder content to emphasize relevant work
- adapt summaries and skill sections
- generate ATS-friendly phrasing
- preserve truthfulness

Guardrails:

- never invent employers, titles, degrees, or skills
- only surface evidence-backed claims
- flag missing evidence rather than hallucinating

Recommended output:

1. Tailored resume JSON
2. Rendered PDF
3. Change summary for the user

### 4.7 Apply Worker Service

Do not run browser automation in Cloudflare Workers.

Use a separate long-running worker service for:

- Playwright-based apply flows
- LinkedIn Easy Apply style forms
- multi-step ATS forms
- credentialed browser sessions

Responsibilities:

- consume application jobs from the queue
- launch an isolated browser context
- log into the target site if needed
- attach tailored resume
- answer required questions from structured profile data
- submit application
- write outcome back to Supabase

Use the existing LinkedIn automation repo as the behavioral base, but isolate it behind a service boundary so failures do not affect the API.

### 4.8 Notification Service

Use Resend for email notifications.

Responsibilities:

- notify on successful application submission
- notify on failed retries
- notify when new high-match jobs arrive
- notify when a tailored resume is ready
- send weekly digest emails if the user opts in

Use webhook events from Resend to track deliverability and bounce state.

---

## 5. Data Model

Use Supabase Postgres as the source of truth.

### 5.1 `users`

Managed primarily by Supabase Auth.

Fields:

- `id`
- `email`
- `created_at`

### 5.2 `profiles`

The parsed and normalized candidate profile.

Fields:

- `user_id`
- `full_name`
- `headline`
- `skills`
- `years_experience`
- `location_preferences`
- `work_authorization`
- `resume_source_file_id`

### 5.3 `resume_artifacts`

Stores parsed and tailored artifacts.

Fields:

- `id`
- `user_id`
- `type` (`parsed`, `tailored_json`, `tailored_pdf`)
- `job_id`
- `storage_path`
- `created_at`

### 5.4 `jobs`

Normalized job catalog.

Fields:

- `id`
- `source`
- `source_job_id`
- `title`
- `company`
- `location`
- `remote`
- `description`
- `apply_url`
- `raw_payload`
- `embedding`

### 5.5 `job_matches`

Stores ranked matches per user.

Fields:

- `user_id`
- `job_id`
- `score`
- `explanation`
- `rank`
- `created_at`

### 5.6 `applications`

Application state machine.

Fields:

- `id`
- `user_id`
- `job_id`
- `status`
- `applied_at`
- `resume_artifact_id`
- `error_code`
- `error_message`
- `external_reference`

### 5.7 `notifications`

Stores notification history and read state.

Fields:

- `user_id`
- `type`
- `title`
- `body`
- `read_at`
- `delivery_provider`

### 5.8 `automation_accounts`

Optional, if the user connects supported accounts.

Fields:

- `user_id`
- `provider`
- `encrypted_credential_ref`
- `last_verified_at`

---

## 6. Queue Design

Use Upstash Redis to separate fast user actions from slow work.

Recommended queues:

- `parse-queue`
- `fetch-jobs-queue`
- `match-queue`
- `tailor-queue`
- `apply-queue`
- `notify-queue`

### Queue Flow

1. Resume upload triggers `parse-queue`.
2. Parsed profile triggers `fetch-jobs-queue`.
3. Fetched jobs trigger `match-queue`.
4. Selected matches trigger `tailor-queue`.
5. Tailored resumes trigger `apply-queue`.
6. Application outcomes trigger `notify-queue`.

### Retry Policy

- retry transient failures 3 times
- add exponential backoff
- write a dead-letter record after repeated failures

### Idempotency

Every queue job should have an idempotency key:

- `user_id`
- `job_id`
- `stage`
- `source_hash`

This prevents duplicate applications and duplicate emails.

---

## 7. AI and Model Strategy

### 7.1 Workers AI as Primary

Use Workers AI for:

- embeddings
- summarization
- extraction assistance
- structured generation
- job explanation text

Cloudflare documents Workers AI as serverless ML on its network, available from Workers or Pages, which makes it a good low-latency default for edge orchestration.

### 7.2 Fallback Providers

Use OpenAI or Claude only when:

- the output quality matters more than cost
- the prompt is long or difficult
- a Workers AI model does not fit the task

### 7.3 Where AI Should and Should Not Run

Should run:

- resume tailoring
- semantic ranking explanations
- extraction fallback
- question answering for application forms

Should not run:

- core auth logic
- queue state transitions
- permission enforcement
- deduplication

Those should be deterministic code.

---

## 8. Storage Strategy

### 8.1 Supabase Storage

Use for:

- original resumes
- parsed JSON exports
- tailored PDFs

Benefits:

- integrated with Postgres
- signed URLs
- row-level access control

### 8.2 RLS

Enable Row Level Security on exposed tables.

Supabase explicitly recommends RLS for browser-facing access and notes that it integrates with Auth for end-to-end user security.

Policy principle:

- users can read their own profiles, matches, and applications
- workers with service credentials can bypass RLS for system tasks

### 8.3 Optional Artifact Store

If PDF volume grows, move bulk artifacts to Cloudflare R2 later.

That is an optimization, not a requirement for MVP.

---

## 9. API Surface

### `POST /api/resume/upload`

Uploads a resume and starts parsing.

### `POST /api/profile/rebuild`

Re-runs parsing if the resume changes.

### `GET /api/jobs`

Returns recommended jobs for the signed-in user.

### `POST /api/jobs/match`

Kicks off matching for a user profile and filter set.

### `POST /api/resume/tailor`

Starts tailoring for a specific job.

### `POST /api/applications/apply`

Enqueues an application.

### `GET /api/applications`

Returns application history and current status.

### `POST /api/notifications/read`

Marks notifications as read.

### `POST /api/webhooks/resend`

Receives delivery/bounce events from Resend.

---

## 10. Workflow Details

### 10.1 Upload Flow

1. User signs in with Supabase Auth.
2. User uploads resume through the frontend.
3. File is stored in Supabase Storage.
4. API writes a `resume_artifacts` record.
5. Parse job is enqueued.

### 10.2 Parse Flow

1. Parse worker downloads the file.
2. `pyresparser` attempts extraction.
3. If parse confidence is low, fallback parser is invoked.
4. Normalized profile is written to `profiles`.
5. Resume vectors are generated.

### 10.3 Job Fetch Flow

1. Matching inputs define title, location, seniority, and work mode.
2. JobSpy fetches from supported boards.
3. Greenhouse and Lever APIs fill gaps where available.
4. Results are normalized and deduplicated.
5. Jobs are upserted into `jobs`.

### 10.4 Matching Flow

1. Resume and job description embeddings are generated.
2. Similarity scores are computed.
3. Hard filters remove bad fits.
4. A final score and explanation are stored.
5. Top matches are returned to the UI.

### 10.5 Tailoring Flow

1. User selects a job or auto-tailor rule.
2. Tailor service receives job and profile JSON.
3. AI rewrites bullets and summary.
4. Truthfulness checks compare generated claims with source data.
5. Tailored JSON and PDF are stored.

### 10.6 Apply Flow

1. User approves an application or enables auto-apply rules.
2. Application record is created.
3. Apply job is enqueued.
4. Apply worker opens the target site with Playwright.
5. Resume and answers are filled in.
6. Submit result is written back to Supabase.
7. Resend sends the result notification.

---

## 11. Why This Split Works

### Cloudflare Workers

Best for:

- fast orchestration
- edge API responses
- lightweight AI calls
- stateless service logic

### Supabase

Best for:

- auth
- relational source of truth
- row-level access control
- file storage
- realtime updates

### Upstash

Best for:

- queueing
- rate-limiting style coordination
- distributed job execution

### Resend

Best for:

- email notifications
- delivery tracking
- event-driven user messaging

### Dedicated Automation Worker

Best for:

- browser sessions
- long-running form filling
- site-specific apply flows

This division keeps the system maintainable and avoids forcing browser automation into a serverless edge runtime where it does not belong.

---

## 12. Security Model

### Principles

- keep raw credentials out of the browser
- encrypt stored secrets
- use signed URLs for files
- enforce RLS on user-owned tables
- use service credentials only in server components

### Sensitive Data

- resume files
- phone numbers
- email addresses
- job application credentials
- ATS answers

### Application Safety

Auto-apply must be opt-in.

The platform should support:

- manual approval per application
- auto-apply only for trusted filters
- explicit rejection of untruthful claims

This is necessary both for quality and for user trust.

---

## 13. Observability

Track:

- parse success rate
- tailing success rate
- match latency
- job fetch latency
- application submit success rate
- email delivery status
- retry counts
- dead-letter counts

Add logs at every stage with correlation IDs:

- `user_id`
- `job_id`
- `application_id`
- `request_id`

---

## 14. Failure Handling

### Parse Failures

- fallback parser
- send user a warning
- allow manual profile edits

### Job Fetch Failures

- retry source-specific errors
- fall back to alternate sources
- cache previous jobs

### Tailoring Failures

- fall back to a simpler resume rewrite
- preserve original resume if generation is not valid

### Apply Failures

- record the failure reason
- stop retries if the issue looks structural
- require human review for repeated site-specific failures

### Email Failures

- retry temporary bounces
- mark hard bounces in notification records
- stop sending to bad addresses after repeated failures

---

## 15. Deployment Topology

```text
Cloudflare Pages
  -> Next.js frontend

Cloudflare Workers
  -> API gateway
  -> AI orchestration
  -> webhook receivers

Supabase
  -> auth
  -> postgres
  -> storage
  -> realtime

Upstash Redis
  -> queues
  -> idempotency / coordination

Dedicated Apply Worker
  -> Playwright automation
  -> repo-based bot adaptation

Resend
  -> notifications
  -> webhook events
```

### Recommended Runtime Boundaries

- frontend deploys independently
- API deploys independently
- parser/matching/tailoring can be split into small services or worker jobs
- browser automation deploys separately from everything else

---

## 16. Suggested Repo Reuse Map

### Use As-Is or Mostly As-Is

- `JobSpy` for job discovery adapters and normalization patterns
- `pyresparser` for resume extraction
- `saasfly` for frontend/dashboard structure reference

### Use as a Reference, Not a Direct Copy

- LinkedIn auto-apply repos
- semantic matching repos

These repos are useful for behavior and patterns, but the final implementation should be refactored into a service-oriented architecture.

### Replace with Custom Service Boundaries

- orchestration
- queue handling
- truthfulness checks
- audit logs
- application state machine

Those are product-specific and should be owned by this codebase.

## 17. Repository Model

### Frontend Repo

Owns:

- Next.js app
- auth UI
- upload UI
- jobs dashboard
- application history
- notification center

### Backend Repo

Owns:

- Cloudflare Workers API
- resume parsing jobs
- job discovery jobs
- matching jobs
- tailoring jobs
- apply workers
- webhooks
- database migrations
- queue consumers

### Shared Interface

The frontend talks to the backend only through:

- authenticated HTTP APIs
- signed upload URLs
- webhook callbacks
- database records exposed through controlled endpoints

Do not share runtime code between the repositories unless it is unavoidable and versioned as a contract package.

---

## 18. Implementation Plan

### Phase 1: Foundation

- Next.js frontend
- Supabase auth
- upload flow
- storage model

### Phase 2: Parsing and Matching

- `pyresparser` integration
- fallback parser
- job fetch pipeline
- job scoring

### Phase 3: Tailoring

- AI tailoring service
- PDF generation
- truthfulness validation

### Phase 4: Apply Automation

- Playwright worker
- LinkedIn / ATS adapters
- application state machine

### Phase 5: Notifications and Realtime

- Resend email flow
- realtime status updates
- application dashboard

### Phase 6: Hardening

- retries
- rate limits
- logging
- tests
- deployment automation

---

## 19. Best-Fit MVP Version

The MVP should not try to automate every job source and every application flow.

Start with:

- one strong parser path
- JobSpy plus 1-2 official job board APIs
- ranking and resume tailoring
- manual approval before application submission
- email notifications

Then add browser automation once the profile, matching, and tailoring experience is stable.

This sequence reduces risk and gives the product value before the hardest automation work lands.

---

## 20. Final Recommendation

The best production design is:

- Cloudflare Pages for UI
- Cloudflare Workers for orchestration
- Supabase for auth, storage, and source-of-truth data
- Upstash for queues
- Workers AI for embeddings and lightweight AI tasks
- Resend for notifications
- a dedicated Playwright worker for auto-apply
- open-source repos reused as adapters and foundations, not copied wholesale

That gives you a maintainable platform with a clean split between product logic, AI work, and browser automation.
