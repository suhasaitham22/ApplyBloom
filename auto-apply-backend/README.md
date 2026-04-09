# auto-apply-backend

Backend repository for the AI Auto Job Apply Platform.

## Responsibilities

- API orchestration
- resume parsing
- job discovery
- semantic matching
- resume tailoring
- application automation
- notifications
- webhooks
- queue consumers
- database migrations

## How this backend is used

- accepts resume uploads from the frontend
- parses resumes into structured profiles
- discovers and ranks jobs
- supports auto-apply batch orchestration
- supports single-job tailor + apply orchestration
- produces tailored resume artifacts
- queues application work
- records application and notification state
- handles webhook events from providers

## Rules

- Keep the API edge stateless.
- Keep long-running work behind queues.
- Keep browser automation in a dedicated worker boundary.
- Keep provider integrations behind explicit adapter files.

## Recommended Stack

- Cloudflare Workers
- Supabase
- Upstash Redis
- Resend
- Playwright worker service
- Clerk only if auth ownership changes away from Supabase
