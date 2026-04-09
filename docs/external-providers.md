# External Providers

This document tracks what we need from each external provider before a full production integration is possible.

## 1. Cloudflare

### Needed From Cloudflare

- Cloudflare Pages project for the frontend
- Cloudflare Workers deployment for the backend API
- Workers AI access for embeddings and lightweight generation
- Durable environment variables and secrets management

### What We Need to Build

- API hosting for the backend contract
- edge request routing
- webhook handling
- lightweight AI calls

### Notes

- Keep browser automation out of Workers.
- Use Workers for orchestration only.

## 2. Supabase

### Needed From Supabase

- Project URL
- Project ref
- anon key for frontend auth/client usage
- service role key for backend server-side operations
- Auth configuration
- Storage buckets
- Postgres database
- database password or access token for CLI linking

### What We Need to Build

- auth session handling
- private file storage
- row-level security
- source-of-truth tables
- signed upload and download access

### Storage Rules

- store raw resume uploads only as long as needed
- keep artifact buckets private
- use signed URLs or authenticated access only

## 3. Resend

### Needed From Resend

- API key
- verified sending domain
- webhook signing secret
- optional from email identity for local testing

### What We Need to Build

- application status emails
- notification digests
- delivery event handling
- bounce/compliance event handling
- safe local secret storage in ignored env files

### Notes

- keep templates componentized
- track delivery state in the database

## 4. Clerk

### Needed From Clerk

- publishable key
- secret key
- frontend auth configuration
- JWT/session strategy if backend verification is needed

### What We Need to Build

- sign-in and sign-out flows
- authenticated route protection
- user identity propagation to backend requests

### Notes

- If Clerk is used instead of Supabase Auth, we must align the auth contract and backend token verification path accordingly.
- Do not duplicate auth systems.

## 5. JobSpy Repository

### Needed From JobSpy

- dependency access or vendored code
- source-specific scraper behavior
- normalization patterns

### What We Need to Build

- job fetch adapter
- normalization layer
- deduplication logic
- source error isolation

## 6. pyresparser Repository

### Needed From pyresparser

- parser execution or vendored logic
- text extraction and structured output

### What We Need to Build

- resume parsing adapter
- confidence scoring
- normalization
- fallback parse handling

## 7. Playwright

### Needed From Playwright

- browser automation runtime
- browser context isolation
- locator-based interactions

### What We Need to Build

- dedicated apply worker
- site-specific form adapters
- failure screenshots only for debugging
- retry and idempotency logic

## 8. OpenAI / Anthropic

### Needed From Model Providers

- API keys
- model access
- rate limit awareness

### What We Need to Build

- resume tailoring fallback
- ranking explanations
- structured extraction fallback
- quality checks

## 9. Provider Tracking Rule

Before integrating a provider, record:

- what secret or key is required
- which service owns the integration
- what data leaves our system
- what failure mode should be isolated
- what tests must exist before merge
