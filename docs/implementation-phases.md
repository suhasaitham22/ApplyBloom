# Implementation Phases

This is the execution map for the project. Each phase is designed to reuse existing repositories and managed services instead of introducing custom infrastructure unless necessary.

## Files

- [Research Summary](./research-summary.md)
- [Repository Boundaries](./repo-boundaries.md)
- [Naming Conventions](./naming-conventions.md)
- [Component Isolation](./component-isolation.md)
- [Storage Decision](./storage-decision.md)
- [Testing Strategy](./testing-strategy.md)
- [External Providers](./external-providers.md)
- [Product Modes](./product-modes.md)
- [Environment Variables](./environment-variables.md)
- [Repo Porting Tracker](./repo-reuse-tracker.md)
- [Repo Reuse Findings](./repo-reuse-findings.md)
- [Remaining Integrations Checklist](./remaining-integrations-checklist.md)
- [Reuse vs Porting Policy](./reuse-vs-porting-policy.md)
- [Backend API Contract](./backend-api-contract.md)
- [Phase 1 - Foundation](./phases/phase-1-foundation.md)
- [Phase 2 - Resume Ingestion](./phases/phase-2-resume-ingestion.md)
- [Phase 3 - Job Discovery](./phases/phase-3-job-discovery.md)
- [Phase 4 - Matching and Tailoring](./phases/phase-4-matching-and-tailoring.md)
- [Phase 5 - Apply Automation](./phases/phase-5-apply-automation.md)
- [Phase 6 - Tracking and Notifications](./phases/phase-6-tracking-notifications.md)
- [Phase 7 - Hardening and Deployment](./phases/phase-7-hardening-deployment.md)

## Delivery Order

1. Foundation and repo scaffold.
2. Resume parsing and user profile creation.
3. Job ingestion and normalization.
4. Matching and tailored resume generation.
5. Queue-backed application automation for both auto-apply and single-job modes.
6. Tracking, notifications, and audit logs.
7. Reliability, security, and deployment hardening.

## Working Rule

Do not advance to the next phase until the current phase has:

- a working implementation
- a repeatable test path
- a clear failure mode
- a storage schema that supports the next step

## Repo Rule

Frontend and backend must live in separate repositories.

Do not create a monorepo for this project.
