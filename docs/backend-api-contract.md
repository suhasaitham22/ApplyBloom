# Backend API Contract

This contract defines the boundary between the frontend repository and the backend repository.

Principles:

- The frontend stays thin and declarative.
- The backend owns business logic, orchestration, queues, parsing, matching, tailoring, and automation.
- All long-running work is asynchronous.
- All user-owned data is scoped by authentication and authorization rules.
- All externally visible endpoints are versioned.

## 1. API Versioning

Base path:

- `/api/v1`

Versioning rules:

- Never break existing request/response shapes inside a version.
- Add optional fields instead of changing required ones.
- Introduce a new version for incompatible changes.

## 2. Authentication

The backend expects Supabase-authenticated users.

Frontend responsibilities:

- sign in and sign out via Supabase Auth
- attach the user session to API requests

Backend responsibilities:

- verify the user session
- reject requests without a valid identity
- scope all reads and writes to the authenticated user

Server-to-server requests:

- use service credentials
- never expose service credentials to the frontend

## 3. Common Headers

Every request should support:

- `Authorization: Bearer <access_token>`
- `X-Request-Id: <client_or_server_generated_id>`
- `Idempotency-Key: <stable_key_for_retryable_actions>`

## 4. Standard Response Format

Success:

```json
{
  "data": {},
  "meta": {
    "request_id": "req_123"
  }
}
```

Error:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Missing resume file",
    "details": {}
  },
  "meta": {
    "request_id": "req_123"
  }
}
```

## 5. Error Codes

Use stable backend error codes:

- `validation_error`
- `unauthorized`
- `forbidden`
- `not_found`
- `conflict`
- `rate_limited`
- `parse_failed`
- `job_fetch_failed`
- `match_failed`
- `tailor_failed`
- `apply_failed`
- `notification_failed`
- `internal_error`

## 6. Core Data Shapes

### 6.1 Profile

```json
{
  "id": "profile_123",
  "user_id": "user_123",
  "full_name": "Jane Doe",
  "headline": "Backend Engineer",
  "skills": ["Python", "Postgres", "Cloudflare Workers"],
  "years_experience": 5,
  "location_preferences": ["Remote", "San Francisco, CA"],
  "work_authorization": "US",
  "summary": "Short profile summary",
  "confidence": {
    "overall": 0.92
  }
}
```

### 6.2 Job

```json
{
  "id": "job_123",
  "source": "jobspy",
  "source_job_id": "abc123",
  "title": "Backend Engineer",
  "company": "Example Inc",
  "location": "Remote",
  "remote": true,
  "description": "Long job description",
  "apply_url": "https://example.com/apply",
  "posted_at": "2026-04-06T00:00:00Z"
}
```

### 6.3 Match

```json
{
  "user_id": "user_123",
  "job_id": "job_123",
  "score": 0.87,
  "rank": 1,
  "reason": "Strong overlap in Python, Postgres, and automation."
}
```

### 6.4 Tailored Resume

```json
{
  "id": "resume_123",
  "user_id": "user_123",
  "job_id": "job_123",
  "resume_json": {},
  "pdf_url": "https://storage.example/resume.pdf",
  "change_summary": [
    "Reordered experience bullets to highlight backend work",
    "Emphasized matching skills already present in the source resume"
  ]
}
```

### 6.5 Application

```json
{
  "id": "app_123",
  "user_id": "user_123",
  "job_id": "job_123",
  "status": "queued",
  "applied_at": null,
  "resume_artifact_id": "resume_123",
  "error_code": null,
  "error_message": null
}
```

## 7. Endpoint Contract

### 7.1 Resume Upload

`POST /api/v1/resume/upload`

Purpose:

- create a resume artifact
- trigger parsing

Request:

```json
{
  "file_name": "resume.pdf",
  "file_type": "application/pdf",
  "storage_path": "uploads/user_123/resume.pdf",
  "resume_text": "optional raw text for demo or local processing"
}
```

Response:

```json
{
  "data": {
    "artifact_id": "resume_123",
    "status": "queued"
  }
}
```

Notes:

- The actual file upload should use a signed upload URL or direct storage flow.
- This endpoint only registers the upload and queues parsing.

### 7.2 Profile Get

`GET /api/v1/profile`

Purpose:

- fetch the current user profile

Response:

```json
{
  "data": {
    "profile": {}
  }
}
```

### 7.3 Profile Update

`PATCH /api/v1/profile`

Purpose:

- allow manual correction of parsed profile fields

Request:

```json
{
  "headline": "Backend Engineer",
  "location_preferences": ["Remote"]
}
```

### 7.4 Job Search

`GET /api/v1/jobs`

Query parameters:

- `query`
- `location`
- `remote`
- `source`
- `limit`
- `cursor`

Purpose:

- return normalized jobs

### 7.5 Match Jobs

`POST /api/v1/match`

Purpose:

- run or refresh ranking for a user profile

Request:

```json
{
  "limit": 20,
  "filters": {
    "remote": true,
    "location": "USA"
  }
}
```

Response:

```json
{
  "data": {
    "matches": []
  }
}
```

### 7.6 Tailor Resume

`POST /api/v1/resume/tailor`

Purpose:

- generate a job-specific resume variant

Request:

```json
{
  "job_id": "job_123",
  "mode": "manual"
}
```

Response:

```json
{
  "data": {
    "resume_artifact_id": "resume_123",
    "status": "queued"
  }
}
```

### 7.7 Application Create

`POST /api/v1/applications`

Purpose:

- create an application record and enqueue the apply worker

Request:

```json
{
  "job_id": "job_123",
  "resume_artifact_id": "resume_123",
  "apply_mode": "manual_review"
}
```

Apply modes:

- `manual_review`
- `auto_apply`
- `save_for_later`

### 7.8 Application List

`GET /api/v1/applications`

Purpose:

- list application history

### 7.9 Application Detail

`GET /api/v1/applications/:id`

Purpose:

- fetch one application and its status timeline

### 7.10 Notification List

`GET /api/v1/notifications`

Purpose:

- list notification history for the current user

### 7.11 Notification Read

`POST /api/v1/notifications/:id/read`

Purpose:

- mark one notification as read

### 7.12 Webhook: Resend

`POST /api/v1/webhooks/resend`

Purpose:

- receive delivery, bounce, and complaint events

Verification:

- require webhook signature verification

### 7.13 Webhook: Worker Events

`POST /api/v1/webhooks/worker-events`

Purpose:

- receive job completion events from background workers

## 8. Queue Job Contracts

### 8.1 Parse Job

```json
{
  "type": "parse_resume",
  "user_id": "user_123",
  "artifact_id": "resume_123",
  "request_id": "req_123"
}
```

### 8.2 Fetch Jobs Job

```json
{
  "type": "fetch_jobs",
  "user_id": "user_123",
  "profile_id": "profile_123",
  "filters": {
    "query": "backend engineer",
    "location": "Remote"
  }
}
```

### 8.3 Match Job

```json
{
  "type": "match_jobs",
  "user_id": "user_123",
  "profile_id": "profile_123",
  "job_ids": ["job_123", "job_456"]
}
```

### 8.4 Tailor Job

```json
{
  "type": "tailor_resume",
  "user_id": "user_123",
  "profile_id": "profile_123",
  "job_id": "job_123"
}
```

### 8.5 Apply Job

```json
{
  "type": "apply_to_job",
  "user_id": "user_123",
  "job_id": "job_123",
  "resume_artifact_id": "resume_123",
  "apply_mode": "manual_review"
}
```

## 9. State Machine Rules

Application states:

- `queued`
- `matching`
- `tailoring`
- `ready_to_apply`
- `applying`
- `submitted`
- `failed`
- `needs_review`
- `archived`

Rules:

- transitions must be recorded in the database
- retries should not create duplicate state transitions
- terminal states are immutable except by a new explicit action

## 10. Idempotency Rules

The backend should treat these actions as idempotent:

- resume upload registration
- parse job enqueue
- job match refresh
- tailoring refresh
- application enqueue

Idempotency key recommendation:

- `user_id`
- `job_id`
- `endpoint`
- `intent`

## 11. Frontend Usage Rules

The frontend should only:

- call the API
- render data
- submit user actions
- show progress states

The frontend should not:

- embed parsing logic
- run matching logic
- run queue workers
- talk directly to job scraping libraries
- contain application automation logic

## 12. Backend Implementation Notes

The backend repository should contain:

- API handlers
- service implementations
- queue consumers
- database migrations
- worker entrypoints
- webhook handlers
- provider adapters

Recommended backend folder pattern:

```text
backend/
  api/
  services/
  workers/
  adapters/
  migrations/
  tests/
```

## 13. Contract Review Rule

Any change to:

- request payloads
- response payloads
- queue job shapes
- application states
- notification events

must be updated in this contract before frontend code is written against it.
