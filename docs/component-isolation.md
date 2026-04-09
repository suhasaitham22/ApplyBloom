# Component Isolation

The system must be built so one component failure does not take down the full feature.

## 1. Isolation Goal

Each major feature should fail independently:

- resume parsing can fail without breaking job browsing
- job discovery can fail without breaking saved profiles
- tailoring can fail without breaking basic matching
- apply automation can fail without breaking notification history
- email delivery can fail without breaking application state

## 2. Separation Model

Keep these boundaries strict:

- frontend UI
- API orchestration
- parsing service
- job fetch service
- matching service
- tailoring service
- apply worker
- notification service

Each boundary should have its own file set, tests, and failure handling.

## 3. Failure Containment Rules

### 3.1 Frontend

- A failed backend call should show a local error state, not crash the app.
- UI state must tolerate partial data.
- A broken notification feed should not block the dashboard.

### 3.2 Backend API

- The API should validate and enqueue work, not do heavy processing inline.
- One endpoint failing should not affect unrelated endpoints.
- Timeouts should be short and explicit.

### 3.3 Workers

- Each queue processor should handle one job type.
- If a worker fails, only that job type should retry.
- A worker should never own unrelated side effects.

### 3.4 Integrations

- Each provider integration should be wrapped behind an adapter.
- A provider outage should degrade the feature, not crash the core app.
- A failed email send should not roll back the application record.

## 4. Required Patterns

### 4.1 Queue-Based Work

Use queues for:

- parsing
- job fetching
- ranking refresh
- tailoring
- apply automation
- notifications

This keeps the request path short and limits blast radius.

### 4.2 Idempotency

Every retryable action must be idempotent.

If a job is retried:

- it must not create duplicate applications
- it must not send duplicate emails
- it must not create duplicate tailored resumes

### 4.3 Circuit Breakers

If a provider starts failing repeatedly:

- stop calling it for a cool-down period
- mark the feature as degraded
- fall back to an alternate path when available

### 4.4 Timeouts

All external calls must have explicit timeouts.

Never allow a single slow provider call to block the system.

### 4.5 Graceful Degradation

When a component fails:

- return partial results when safe
- show the user what worked and what did not
- preserve existing records

## 5. Examples of Local Failure

### Resume Parser Failure

Impact:

- profile confidence drops
- user can still edit profile manually

Not impacted:

- existing jobs
- application history
- notifications

### Job Fetcher Failure

Impact:

- fresh jobs are delayed

Not impacted:

- stored profile
- past applications
- tailored resume artifacts

### Tailoring Failure

Impact:

- a tailored resume is not generated for that job

Not impacted:

- job match list
- profile data
- application timeline

### Apply Worker Failure

Impact:

- one application attempt fails or retries

Not impacted:

- other queued jobs
- dashboard history
- user notifications

### Notification Failure

Impact:

- email is delayed or retried

Not impacted:

- application status records
- matching results
- profile data

## 6. Code Organization Rule

Each domain should be implemented as:

- a small API surface
- one or more service files
- one or more worker files
- separate tests

Do not combine orchestration, provider logic, and storage writes in one large file.

## 7. Deployment Rule

Deploy components independently when possible:

- frontend deploys without backend code changes
- backend API deploys without rebuilding the UI
- worker updates deploy without frontend changes

## 8. Regression Rule

If one component changes:

- run only the tests for that component first
- run contract tests where boundaries are touched
- do not assume unrelated features are healthy

## 9. Maintenance Rule

If a component begins to feel fragile, split it before it becomes shared tribal knowledge.

The architecture should reward clarity and penalize coupling.
