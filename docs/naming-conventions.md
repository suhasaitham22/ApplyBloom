# Naming Conventions

The goal is to make file paths explain what the code does without opening the file.

## 1. Core Principles

- Prefer long, explicit names over short generic ones.
- Name files by responsibility, not by implementation detail.
- Keep one primary responsibility per file.
- Avoid ambiguous names like `utils`, `helpers`, `common`, or `misc`.
- If a file grows too broad, split it immediately.

## 2. Naming Style

Use lowercase kebab-case for file names.

Examples:

- `resume-upload-form.tsx`
- `job-search-filters.tsx`
- `parse-resume-request.ts`
- `match-jobs-by-profile.ts`
- `tailor-resume.ts`
- `create-application-record.ts`
- `send-notification.ts`
- `verify-resend-webhook-signature.ts`
- `enqueue-parse-resume-job.ts`

Avoid:

- `form.tsx`
- `actions.ts`
- `service.ts`
- `index.ts` as a public feature file

## 3. Frontend File Naming

Frontend files should reflect user-facing or presentation responsibilities.

Recommended patterns:

- `app/(auth)/sign-in/page.tsx`
- `app/(dashboard)/resume-upload/page.tsx`
- `app/(dashboard)/job-matches/page.tsx`
- `components/resume-upload-form.tsx`
- `components/job-match-card.tsx`
- `components/application-status-timeline.tsx`
- `lib/supabase-auth-client.ts`
- `lib/fetch-user-applications.ts`

Rules:

- `page.tsx` is acceptable only for route entry points.
- Shared UI components should be named after the exact UI responsibility.
- Network helpers should state the backend action they call.

## 4. Backend File Naming

Backend files should reflect domain operations and side effects.

Recommended patterns:

- `api/v1/upload-resume.ts`
- `api/v1/get-job-matches.ts`
- `services/parse-resume.ts`
- `services/discover-jobs.ts`
- `services/rank-job-matches.ts`
- `services/tailor-resume.ts`
- `services/render-resume-pdf.ts`
- `workers/process-apply-job.ts`
- `workers/process-parse-job.ts`
- `integrations/resend/send-email-notification.ts`
- `services/store-application-event.ts`

Rules:

- The file name should tell you the business action.
- The file should not hide a critical side effect behind a generic name.
- One file should usually own one primary operation.

## 5. Queue and Worker Naming

Queue-related files must match the queue purpose.

Examples:

- `enqueue-parse-resume-job.ts`
- `process-parse-resume-job.ts`
- `enqueue-match-jobs-job.ts`
- `process-tailor-resume-job.ts`
- `process-apply-to-job.ts`

This makes queue ownership obvious during debugging.

## 6. Integration Naming

External provider adapters should be named by provider and function.

Examples:

- `jobspy-fetch-jobs.ts`
- `pyresparser-extract-profile.ts`
- `resend-send-application-email.ts`
- `submit-application.ts`
- `supabase-save-tailored-resume.ts`

Rules:

- Keep provider-specific code isolated from business logic.
- Never let provider names leak into unrelated files.

## 7. Domain Naming

Use domain language from the product:

- resume
- profile
- job
- match
- tailor
- application
- notification
- queue
- webhook
- worker

Avoid generic or vague terms:

- data
- stuff
- process
- manager
- handler

## 8. Error and Failure File Naming

Failure-handling files should be explicit.

Examples:

- `retry-transient-apply-failure.ts`
- `mark-parse-job-as-failed.ts`
- `classify-job-fetch-error.ts`
- `record-tailoring-validation-failure.ts`

## 9. Test File Naming

Test files should mirror the feature they validate.

Examples:

- `parse-resume.test.ts`
- `rank-job-matches.test.ts`
- `tailor-resume.test.ts`
- `process-apply-job.test.ts`

## 10. Split Rule

If a file contains:

- multiple queues
- multiple provider integrations
- multiple unrelated business actions
- both orchestration and side effects

split it.

The path should remain a map of the system, not a dumping ground.
