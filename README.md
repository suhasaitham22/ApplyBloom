# ApplyBoom

ApplyBoom is an AI-assisted job application platform built as two separate codebases:

- `auto-apply-frontend`: Next.js UI
- `auto-apply-backend`: Cloudflare Workers API and worker orchestration

## What it does

- uploads and parses resumes
- discovers relevant jobs
- ranks matches with AI-assisted scoring
- tailors resumes per job
- queues application work
- tracks application status
- sends notifications

## Architecture rules

- No monorepo
- Clear frontend/backend separation
- File names describe the code responsibility
- Components are isolated so one failure does not break the whole system
- External GitHub repos are reference material only; the needed behavior is ported into this codebase

## Current status

The repository includes:

- product and architecture documentation
- backend API contract
- frontend and backend scaffolding
- service implementations
- worker processors
- tests for the implemented functionality

## Repositories

- Frontend: `auto-apply-frontend`
- Backend: `auto-apply-backend`

## Next step

Wire the real external providers:

- Cloudflare
- Supabase
- Clerk
- Resend
- Upstash
