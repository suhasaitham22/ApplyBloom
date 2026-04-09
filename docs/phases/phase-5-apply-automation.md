# Phase 5 - Apply Automation

## Objective

Submit applications through browser automation or supported APIs using a queue-backed worker.

## Why This Phase Matters

This is the hardest operational part of the product.

It has the most failure modes:

- login changes
- multi-step forms
- CAPTCHAs
- dynamic field names
- resume uploads
- session expiry

## Reuse Strategy

- Use browser automation patterns from the LinkedIn auto-apply repos as a reference.
- Use [Playwright](https://playwright.dev/docs/intro) for the automation runtime.
- Use [Upstash Redis](https://upstash.com/docs/redis/howto/connectwithupstashredis) for idempotency and job coordination.

## Why Playwright

Playwright is a better fit than ad hoc scripting because it supports:

- Chromium, WebKit, and Firefox
- isolated browser contexts
- headless or headed operation
- reliable locators and auto-waiting behavior

That makes it appropriate for repeatable application workflows.

## Implementation Tasks

1. Create an `apply-queue`.
2. Route approved jobs into the queue.
3. Launch one browser context per application task.
4. Authenticate the user or connect the target service account.
5. Detect form structure and fill known fields.
6. Upload the tailored resume.
7. Complete multi-step forms.
8. Submit the application.
9. Store the result in `applications`.
10. Record screenshots or logs only when needed for debugging.

## Important Operational Rule

Browser automation must run in a dedicated worker service, not inside Cloudflare Workers.

The edge layer should only enqueue tasks and return status.

In practice, this means:

- the Cloudflare Worker remains the API/orchestration layer
- the Playwright runner is a separate Node deployable
- the backend stores job and resume context so the runner can resolve the application task safely

## Idempotency

Every application task must be protected against double submission.

Use a key composed of:

- `user_id`
- `job_id`
- `source`
- `apply_flow_version`

## Acceptance Criteria

- A queued application can be processed end-to-end.
- The worker can submit at least one known application flow reliably.
- Duplicate submissions are prevented.
- Failures are visible in the dashboard.

## Risks

- Website layout changes.
- Login or session challenges.
- CAPTCHA or bot-detection barriers.
- Queue retries causing duplicate attempts if idempotency is weak.

## Exit Condition

Do not scale auto-apply broadly until the worker is safe, observable, and idempotent.
