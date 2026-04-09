# ApplyBoom

ApplyBoom is an AI-assisted job application platform built as two separate codebases:

- `auto-apply-frontend`: Next.js UI
- `auto-apply-backend`: Cloudflare Workers API and worker orchestration

## What it does

- uploads and parses resumes
- discovers relevant jobs from configured sources
- ranks matches with AI-assisted scoring
- tailors resumes per job
- queues application work
- tracks application status
- sends notifications

## How users use it while we build

1. Upload a resume in the frontend.
2. The backend parses it into structured profile data.
3. The system fetches and ranks matching jobs.
4. In auto-apply mode, the system automatically applies to matching jobs.
5. In single-job mode, the user selects a job, the system tailors the resume, and then applies only to that job.
6. Status updates and notifications are recorded in the dashboard.

## Product Modes

ApplyBoom has two main workflows:

- Auto-apply mode: resume upload triggers job discovery, ranking, and queued application execution for suitable jobs.
- Single-job tailor-apply mode: the user picks one job, the system tailors the resume for that job, and applies only there.

## Current status

The build currently has:

- resume parsing
- job matching against an internal demo catalog
- tailored resume generation
- application planning and queue scaffolding
- Supabase integration
- Resend integration
- adapter-based job source ingestion for Greenhouse and Lever
- a separate Playwright browser automation module for application submission

The next production dependencies are:

- queue provider wiring
- browser runner deployment
- optional AI fallback providers

## Authentication decision

We do not need Clerk for the MVP if we are already using Supabase Auth.

Clerk is a separate authentication and user-management product for Next.js apps. Clerk’s quickstart is centered on adding `@clerk/nextjs`, `clerkMiddleware()`, and `<ClerkProvider>` to provide auth state and user UI in Next.js. That is useful if we want Clerk to own sign-in, sign-up, and route protection. For ApplyBoom, that would duplicate what Supabase Auth already covers, so Clerk stays optional unless we explicitly switch auth ownership later.  

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

See [remaining integrations checklist](docs/remaining-integrations-checklist.md).
