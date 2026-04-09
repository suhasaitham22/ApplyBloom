# Phase 7 - Hardening and Deployment

## Objective

Make the system reliable enough for real usage.

## Why This Phase Matters

The platform touches sensitive data and long-running workflows.

Without hardening, the product will fail in ways that are expensive to diagnose:

- parser drift
- queue duplication
- stale job data
- browser automation flakiness
- notification delivery gaps

## Reuse Strategy

- Keep Cloudflare Workers for edge orchestration.
- Keep Cloudflare Pages for frontend deployment.
- Keep Supabase as the source of truth with RLS.
- Keep Upstash for queue coordination.
- Keep Resend for email events.

## Implementation Tasks

1. Add structured logging with correlation IDs.
2. Add retries with backoff for transient failures.
3. Add dead-letter handling for repeated failures.
4. Add metrics for:
   - parse success rate
   - job fetch success rate
   - match latency
   - tailoring latency
   - application success rate
   - email delivery rate
5. Add rate limiting on public endpoints.
6. Add secrets management for all providers.
7. Add CI checks for linting, tests, and schema validation.
8. Add preview environments for frontend and API changes.

## Security Tasks

- enforce RLS on all user-facing tables
- keep credentials server-side
- sign file URLs
- allow user data deletion
- minimize retention of raw resumes and automation artifacts

## Acceptance Criteria

- The app can be deployed repeatedly without manual cleanup.
- A failed worker job is visible and recoverable.
- Logs can trace a single application end-to-end.
- User data remains scoped and protected.

## Risks

- Silent failures in third-party services.
- Repeated automation failures against target sites.
- Incomplete observability causing debugging delays.

## Exit Condition

This phase is done when the platform can run in production with clear logs, safe retries, and recoverable failures.
