# Repository Boundaries

The project should be split into two separate codebases:

1. `auto-apply-frontend`
2. `auto-apply-backend`

This is intentional. It keeps the system simpler to maintain than a monorepo and creates a hard boundary between product UI and backend automation.

## Why Not a Monorepo

A monorepo would blur responsibility boundaries and make the automation stack harder to evolve independently.

This project has very different runtime needs:

- the frontend is a fast, mostly static product surface
- the backend is a service layer with queues, workers, storage, and automation

Keeping them separate reduces coupling and deployment risk.

## Frontend Repository

### Responsibilities

- user interface
- auth client integration
- resume upload UI
- jobs dashboard
- application tracking views
- settings and notifications

### Technology

- Next.js
- Tailwind CSS
- Cloudflare Pages
- Supabase client libraries

### Should Not Contain

- browser automation workers
- queue consumers
- long-running background jobs
- source-of-truth business logic

## Backend Repository

### Responsibilities

- API orchestration
- auth verification
- file ingestion
- parsing jobs
- matching jobs
- tailoring jobs
- apply workers
- notification dispatch
- webhooks
- database migrations

### Technology

- Cloudflare Workers
- Supabase service integration
- Upstash Redis
- Resend
- Playwright worker service
- AI provider adapters

### Should Not Contain

- frontend pages
- UI components
- client-side state management

## Shared Contract

The two repositories communicate through stable contracts:

- REST or webhook APIs
- signed upload references
- database record identifiers
- queue job payloads
- notification event payloads

Canonical reference:

- [Backend API Contract](./backend-api-contract.md)

## Maintainability Rules

- Keep the backend stateless at the API edge.
- Keep business logic in backend services, not in UI components.
- Keep frontend calls thin and declarative.
- Add shared types only when necessary, and prefer copied contracts over deep coupling.
- Make deployment of one repo possible without redeploying the other.
- Follow [Naming Conventions](./naming-conventions.md).
- Follow [Component Isolation](./component-isolation.md).
- Follow [Storage Decision](./storage-decision.md).
- Follow [Testing Strategy](./testing-strategy.md).
- Track [External Providers](./external-providers.md).
- Track [Environment Variables](./environment-variables.md).
- Track [Repo Porting Tracker](./repo-reuse-tracker.md).
- Follow [Reuse vs Porting Policy](./reuse-vs-porting-policy.md).

## Suggested Folder Shape Inside Each Repo

### Frontend Repo

```text
frontend/
  app/
  components/
  lib/
  styles/
  tests/
```

### Backend Repo

```text
backend/
  api/
  services/
  workers/
  integrations/
  migrations/
  tests/
```

## Decision

Use two repositories, not one monorepo.

This is the cleanest structure for long-term maintainability, independent scaling, and safer deployment.
