# Remaining Integrations Checklist

This is the current integration priority order for ApplyBloom.

## 1. Job Source Ingestion

Priority: highest

Why:

- Auto-apply mode needs real jobs, not just the internal demo catalog.
- Without ingestion, the system cannot discover jobs at scale.

What to integrate:

- JobSpy ported behavior
- Greenhouse job boards
- Lever job boards

## 2. Apply Automation Worker

Priority: highest

Why:

- This is what turns matched jobs into actual applications.
- It is the main automation feature of the product.
- The code path must stay separate from the Cloudflare Worker API.

What to integrate:

- Playwright-based browser runner
- site-specific apply adapters
- browser state isolation
- retry and idempotency protections

## 3. Queue Provider

Priority: high

Why:

- The backend already has queue-shaped logic.
- Production needs a durable queue backend.

What to integrate:

- Upstash Redis

## 4. Production Auth Decision

Priority: medium

Why:

- We already have Supabase in place.
- Clerk is optional and should only be added if auth ownership changes.

What to decide:

- keep Supabase Auth
- or move auth to Clerk later

## 5. AI Fallback Providers

Priority: medium

Why:

- Tailoring and ranking can be improved with better model fallbacks.

What to integrate:

- Workers AI
- OpenAI
- Claude

## 6. Observability / Production Hardening

Priority: medium

Why:

- We need reliable failure tracking once real automation is enabled.

What to integrate:

- request tracing
- queue failure visibility
- delivery event history
- application audit logs
