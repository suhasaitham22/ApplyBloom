# Phase 1 - Foundation

## Objective

Set up the production skeleton so the rest of the system has stable boundaries:

- frontend shell
- auth
- storage
- database schema
- environment management
- deployment targets

## Why This Phase Comes First

Every later step depends on:

- authenticated users
- a place to store resume files
- a relational source of truth
- a predictable app layout

If this phase is weak, parsing, matching, and automation will all become harder to maintain.

## Reuse Strategy

- Use [Saasfly](https://github.com/saasfly/saasfly) as a starting reference for a Next.js SaaS dashboard structure.
- Use [Cloudflare Pages](https://developers.cloudflare.com/pages/get-started/) for frontend deployment.
- Use [Cloudflare Workers](https://workers.cloudflare.com/) for API orchestration.
- Use [Supabase Auth, Postgres, and Storage](https://supabase.com/docs/guides/getting-started/features) as the data layer.
- Treat [Backend API Contract](../backend-api-contract.md) as the source of truth for frontend/backend interaction.

## Implementation Tasks

1. Create the monorepo or workspace layout.
2. Add the `frontend/`, `backend/`, `workers/`, and `docs/` directories.
3. Configure environment variables for Supabase, Cloudflare, Upstash, and Resend.
4. Define the first database migrations:
   - `profiles`
   - `resume_artifacts`
   - `jobs`
   - `applications`
   - `notifications`
5. Enable Row Level Security on all user-owned tables.
6. Create storage buckets for raw resumes and generated PDFs.
7. Add the basic authenticated app shell:
   - sign in
   - sign out
   - upload resume
   - dashboard placeholder

## Data Contracts

The foundation should establish these stable identifiers:

- `user_id`
- `job_id`
- `application_id`
- `resume_artifact_id`
- `request_id`

These IDs will be used across queues, workers, and notifications.

## Acceptance Criteria

- A signed-in user can reach the dashboard.
- The user can upload a resume file.
- The file lands in Supabase Storage.
- The database has a row for the uploaded artifact.
- RLS blocks access to other users' rows.
- The frontend and API can deploy separately.
- The frontend only depends on documented backend endpoints.

## Risks

- Missing env isolation between local, preview, and production.
- Over-coupling the frontend to worker internals.
- Skipping RLS and exposing user data too early.

## Exit Condition

Do not start parsing or job discovery until the app can reliably authenticate a user and store a file with a corresponding database record.
