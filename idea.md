# AI Auto Job Apply Platform

## 1. Product Idea

Build an end-to-end job search and application platform that helps a user move from a raw resume to tracked job applications with minimal manual effort.

The platform will:

1. Accept a resume upload.
2. Parse the resume into structured profile data.
3. Discover relevant jobs from APIs and job sources.
4. Rank and match jobs using AI and semantic scoring.
5. Tailor the resume for each job while preserving truthfulness.
6. Queue and execute job applications through automation or supported APIs.
7. Track application outcomes and status changes.
8. Notify the user about progress, failures, and follow-up actions.

The key differentiator is not simple job scraping. The main value is the orchestration layer that turns job discovery into a structured, automated workflow with AI-based tailoring and application tracking.

---

## 2. Core Principle

Do not rebuild every capability from scratch.

Instead:

- Reuse existing open-source building blocks where they are strong.
- Wrap them in a production-oriented orchestration layer.
- Keep the user-facing product focused on simplicity and trust.

This means the platform is a system integrator plus workflow engine, not just a monolithic app.

---

## 3. User Problem

Job seekers spend time on repetitive work:

- Finding relevant jobs across many sources.
- Rewriting resumes for each role.
- Filling repetitive forms.
- Tracking applications in spreadsheets.
- Following up manually.

This platform reduces that work by automating the pipeline from resume ingestion to application submission and status tracking.

---

## 4. Target User

Primary users:

- Individual job seekers applying to many roles.
- Candidates who want better ATS fit without rewriting resumes manually.
- Power users who want structured automation and application history.

Secondary users:

- Career coaches helping clients apply at scale.
- Recruitment assistants managing multiple profiles.

---

## 5. Product Goals

The system should:

- Reduce manual application effort.
- Improve relevance of job matches.
- Produce tailored resumes that remain truthful.
- Support reliable automated processing through queues.
- Provide clear application visibility.
- Be secure enough to handle sensitive resume and account data.

---

## 6. Non-Goals

This project should not:

- Become a full ATS replacement.
- Scrape every site by default if a supported API exists.
- Generate misleading resume claims.
- Store unnecessary raw personal data.
- Run automation in an uncontrolled way without user approval.

---

## 7. High-Level Architecture

The system is organized as a pipeline:

1. Frontend collects user input and uploads the resume.
2. API layer receives requests and coordinates workflows.
3. Resume parser extracts structured data.
4. Job fetcher gathers roles from APIs and scraping sources.
5. Matching engine ranks jobs by fit.
6. Resume tailor generates a job-specific version.
7. Queue system schedules application jobs.
8. Apply worker submits applications using browser automation or APIs.
9. Database stores profiles, jobs, tailored resumes, and application state.
10. Notification layer informs the user of results.

This architecture is event-driven so that long-running tasks do not block the UI.

---

## 8. Recommended Tech Stack

### Frontend

- Next.js
- Tailwind CSS
- Cloudflare Pages for hosting

### API Layer

- Cloudflare Workers
- Workers AI for low-latency inference where possible

### Database and Storage

- Supabase Postgres
- Supabase Auth
- Supabase Storage

### Queue and Background Jobs

- Upstash Redis

### Automation

- Playwright for browser-driven application flows

### AI Providers

- Workers AI as the primary path
- OpenAI for fallback or higher-quality generation
- Claude as an optional alternative model path

---

## 9. System Modules

### 9.1 Resume Ingestion

Responsibilities:

- Receive uploaded resume files.
- Validate file type and size.
- Store temporary or permanent copies securely.
- Trigger parsing.

Inputs:

- PDF, DOCX, or other supported resume formats.

Outputs:

- Extracted text.
- Structured candidate profile.
- Normalized skills and experience data.

### 9.2 Resume Parser

Responsibilities:

- Extract contact details.
- Detect skills.
- Identify employers, titles, dates, and education.
- Infer total experience.
- Normalize structure for matching and tailoring.

Suggested behavior:

- Prefer deterministic parsing when possible.
- Use a fallback parser when the primary parser fails.
- Return both parsed JSON and confidence metadata.

### 9.3 Job Fetcher

Responsibilities:

- Fetch jobs from supported APIs.
- Scrape public job sources where allowed.
- Normalize job data into a common schema.

Sources:

- Greenhouse Job Board API.
- Lever postings API.
- Job scraping via `jobspy` for supported platforms.

Job fetcher output should include:

- Job title.
- Company.
- Location.
- Remote/on-site status.
- Description.
- Apply URL.
- Source metadata.

### 9.4 Matching Engine

Responsibilities:

- Score jobs against the candidate profile.
- Use semantic similarity plus rules-based filters.
- Rank jobs by estimated fit and relevance.

Signals:

- Skill overlap.
- Title similarity.
- Experience match.
- Location preference.
- Remote preference.
- Seniority fit.

The match score should be explainable so the user can understand why a role was recommended.

### 9.5 Resume Tailor

Responsibilities:

- Produce a job-specific resume version.
- Optimize for ATS readability.
- Emphasize relevant skills and experience.
- Preserve factual correctness.

Important rule:

- Never fabricate experience, degrees, employers, or skills.

The tailor should output structured resume JSON first, then render to PDF if needed.

### 9.6 PDF Generator

Responsibilities:

- Convert tailored resume JSON into a formatted PDF.
- Support consistent formatting for applications.

Possible implementation:

- ReportLab in Python.
- Another deterministic PDF renderer if layout quality becomes important.

### 9.7 Apply Worker

Responsibilities:

- Pull application jobs from the queue.
- Open the correct application channel.
- Fill out forms.
- Attach the tailored resume.
- Submit the application.
- Record success or failure.

Application channels:

- Direct ATS APIs when available.
- Browser automation with Playwright.
- LinkedIn-style automation only where technically and legally appropriate.

### 9.8 Notification Service

Responsibilities:

- Notify the user when jobs are matched.
- Notify on application success or failure.
- Notify on retry exhaustion or missing required data.

Channels:

- In-app notifications.
- Email.
- Optional browser push later.

---

## 10. Core Workflow

### Stage 1: Resume Upload

The user uploads a resume through the frontend.

### Stage 2: Parsing

The backend parses the resume into structured data and stores the profile.

### Stage 3: Job Discovery

The system fetches relevant jobs based on role, skills, location, and preferences.

### Stage 4: Matching

Each job receives a score and explanation.

### Stage 5: Tailoring

For selected jobs, the system generates a tailored resume version.

### Stage 6: Queueing

Application tasks are sent to Redis-backed queues.

### Stage 7: Apply

Workers process the queue and submit applications.

### Stage 8: Tracking

The system records job status, resume version used, timestamps, and result details.

### Stage 9: Notification

The user receives updates and can review the application history.

---

## 11. Data Model

### Users

Stores account identity and authentication linkage.

Fields:

- `id`
- `email`
- `created_at`

### Profiles

Stores parsed candidate data.

Fields:

- `user_id`
- `skills`
- `experience`
- `education`
- `summary`
- `location_preferences`

### Jobs

Stores normalized job records.

Fields:

- `id`
- `source`
- `title`
- `company`
- `location`
- `description`
- `apply_url`
- `metadata`

### Applications

Tracks each application attempt.

Fields:

- `id`
- `user_id`
- `job_id`
- `status`
- `applied_at`
- `resume_used`
- `error_message`

### Tailored Resumes

Stores job-specific resume versions.

Fields:

- `id`
- `user_id`
- `job_id`
- `resume_json`
- `pdf_url`
- `created_at`

---

## 12. Queue Design

Separate queues prevent long-running work from blocking the whole system.

Recommended queues:

- `match-queue`
- `tailor-queue`
- `apply-queue`
- `notify-queue`

Queue behavior:

- Retry transient failures.
- Track job status transitions.
- Dead-letter failed tasks after repeated errors.

---

## 13. API Surface

### `POST /api/parse`

Uploads and parses a resume.

Returns:

- Parsed profile JSON.
- Confidence metadata.

### `GET /api/jobs`

Returns fetched and normalized jobs.

### `POST /api/match`

Returns ranked jobs for a profile.

### `POST /api/tailor-resume`

Returns a tailored resume for a specific job.

### `POST /api/apply`

Queues an application attempt.

### `GET /api/applications`

Returns application history and current statuses.

### `POST /api/notify`

Triggers a notification event.

---

## 14. AI Strategy

The AI layer should be used for:

- Resume parsing fallback.
- Semantic job matching.
- Resume tailoring.
- ATS-focused phrasing improvement.
- Application message drafting when needed.

Preferred strategy:

1. Use deterministic code for structure and workflow.
2. Use AI only where language or semantic judgment is required.
3. Keep a provider abstraction so the model backend can change later.

Model selection should prioritize:

- Cost for bulk operations.
- Latency for interactive actions.
- Quality for tailoring steps.

---

## 15. Resume Tailoring Rules

Tailoring is the highest-value feature and the highest-risk area.

The system should:

- Reorder existing content to highlight relevant experience.
- Rewrite bullet points for clarity and ATS readability.
- Add job-relevant keywords only when supported by the original resume.
- Preserve truthfulness.
- Flag uncertain or missing data rather than inventing it.

Recommended guardrails:

- Maintain a source-of-truth profile.
- Compare generated claims to original resume facts.
- Reject hallucinated skills or experience.
- Provide an explanation of what changed.

---

## 16. Automation Strategy

Automation should be modular because application flows vary heavily by platform.

Layered approach:

1. Use direct APIs when available.
2. Use deterministic form-filling for simple ATS pages.
3. Use Playwright for browser-based flows.
4. Add site-specific adapters only when necessary.

This keeps the system maintainable and avoids overfitting the codebase to one platform.

---

## 17. Security and Privacy

This platform handles sensitive personal data, so security is first-class.

Required safeguards:

- Encrypt secrets and credentials.
- Use signed URLs for file access.
- Minimize storage of raw resume files.
- Restrict application credentials to server-side use.
- Use rate limiting on public endpoints.
- Keep audit logs for application actions.

Practical guidance:

- Do not expose automation credentials to the browser.
- Store only what is needed for product functionality.
- Let users delete data and resume artifacts.

---

## 18. Reliability Strategy

The main failure points are AI calls and browser automation.

Recommended mitigations:

- Retry transient errors up to three times.
- Fall back to alternate parsers or model providers.
- Cache job matching results.
- Deduplicate jobs across sources.
- Mark failed applications clearly instead of hiding them.

The system should degrade gracefully rather than stop entirely.

---

## 19. Scalability Strategy

The system should scale by separating synchronous user interactions from asynchronous work.

Scale bottlenecks:

- LLM latency and cost.
- Browser automation throughput.
- Job fetching volume.

Mitigations:

- Use queues and workers.
- Batch non-urgent tasks.
- Cache repeated matching results.
- Limit job volume per user session.

---

## 20. Deployment Plan

### Frontend

- Deploy to Cloudflare Pages.

### API

- Deploy lightweight API orchestration to Cloudflare Workers.

### Workers

- Run heavier background tasks on worker infrastructure that supports long-running automation.

### Database

- Use Supabase for Postgres, Auth, and Storage.

### Queue

- Use Upstash Redis for job scheduling.

The architecture should keep the frontend fast and the automation off the request path.

---

## 21. Suggested Repository Structure

```text
auto-apply/
  frontend/
  backend/
    api/
    services/
      resume_parser.py
      job_fetcher.py
      matcher.py
      resume_tailor.py
      apply/
        linkedin.py
  workers/
    apply_worker.py
  integrations/
    linkedin-bot/
    jobspy/
  orchestrator.py
```

This structure isolates product surfaces, core services, and automation workers.

---

## 22. Execution Phases

### Phase 1: Foundation

- Set up repo structure.
- Create frontend shell.
- Add auth and upload flow.

### Phase 2: Parsing and Matching

- Implement resume parsing.
- Add job fetching.
- Build ranking logic.

### Phase 3: Tailoring

- Add AI resume tailoring.
- Generate PDFs.
- Store tailored artifacts.

### Phase 4: Application Automation

- Add queue workers.
- Integrate Playwright or API-based apply flows.

### Phase 5: Tracking and Notifications

- Add status updates.
- Add notifications.
- Add history and audit views.

### Phase 6: Hardening

- Improve retries.
- Add monitoring.
- Add tests.
- Prepare deployment.

---

## 23. Testing Strategy

The project should include:

- Unit tests for parsing, matching, and queue logic.
- Integration tests for API and database interactions.
- E2E tests for upload-to-match and apply flows.

Critical test areas:

- Resume parsing output shape.
- Match ranking stability.
- Tailoring correctness and truthfulness checks.
- Queue retries and failure handling.
- Application status persistence.

---

## 24. Success Metrics

The platform is useful if it improves:

- Time from resume upload to first matched jobs.
- Number of relevant jobs surfaced per user.
- Application completion rate.
- User time saved per application.
- Tailoring quality and ATS relevance.

---

## 25. Final Product Summary

This platform combines:

- Resume parsing.
- Job discovery.
- Semantic matching.
- AI resume tailoring.
- Automation-based applications.
- Queue-driven orchestration.
- Persistent application tracking.

The product is best understood as an AI workflow system for job hunting, not just a scraper or a chatbot.

The long-term value comes from turning a messy manual process into a predictable, traceable pipeline.
