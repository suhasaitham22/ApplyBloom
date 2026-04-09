# Phase 6 - Tracking and Notifications

## Objective

Make the application pipeline visible to the user through status tracking and email notifications.

## Why This Phase Matters

Automation without visibility is hard to trust.

Users need to know:

- what was matched
- what was tailored
- what was submitted
- what failed
- what needs attention

## Reuse Strategy

- Use [Resend](https://resend.com/docs) for transactional email.
- Use Supabase Postgres for application state and notification history.
- Use Supabase Auth to scope notifications to the right user.

## Implementation Tasks

1. Define explicit application state transitions.
2. Write every state change to Postgres.
3. Add a notification record for major events:
   - new high-match job
   - tailored resume ready
   - application submitted
   - application failed
   - retry exhausted
4. Send transactional emails through Resend.
5. Add a webhook handler for email delivery events.
6. Surface a timeline in the UI.
7. Allow users to mark notifications as read.

## Suggested Application States

```text
queued -> matching -> tailoring -> ready_to_apply -> applying -> submitted
queued -> matching -> tailoring -> ready_to_apply -> applying -> failed
```

Add terminal states as needed:

- `submitted`
- `failed`
- `needs_review`
- `archived`

## Email Strategy

Use Resend for:

- submission confirmations
- failure alerts
- weekly summaries
- high-value match digests

Keep email content short and actionable.

## Acceptance Criteria

- Application status updates are visible in the dashboard.
- Users receive email notifications for key milestones.
- The system records delivery events and failures.
- Notification state is tied to the correct user.

## Risks

- Too many emails causing fatigue.
- Missing webhook handling for delivery state.
- Confusing user status if application transitions are not explicit.

## Exit Condition

Do not consider the product complete until the user can trace each application from match to outcome.
