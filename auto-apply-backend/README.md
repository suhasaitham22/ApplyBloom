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

