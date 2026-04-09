# Research Summary

This document captures the verified building blocks that shape the implementation.

## Reusable Repositories

### JobSpy

- Repository: https://github.com/speedyapply/JobSpy
- Purpose in this project: multi-source job discovery and normalization.
- Verified value: a scraper library intended to pull listings from multiple job boards.

### pyresparser

- Repository: https://github.com/OmkarPathak/pyresparser
- Purpose in this project: primary resume parsing engine.
- Verified value: extracts structured resume data from uploaded files.

### Saasfly

- Repository: https://github.com/saasfly/saasfly
- Purpose in this project: frontend/product shell reference.
- Verified value: Next.js SaaS starter suitable for dashboard and auth patterns.

### LinkedIn auto-apply repos

- Prompt-supplied repository: https://github.com/nicolomantini/linkedin-easy-apply-bot
- Public search note: the exact repo was not cleanly surfaced in search.
- Purpose in this project: behavior reference for browser automation and application flows.

## Managed Services

### Cloudflare Pages

- Docs: https://developers.cloudflare.com/pages/get-started/
- Use: frontend hosting and preview deploys.

### Cloudflare Workers

- Use: stateless API orchestration, auth checks, queue writes, webhooks, and lightweight AI calls.

### Cloudflare Workers AI

- Docs: https://developers.cloudflare.com/workers-ai/
- Use: embeddings, extraction assistance, and low-latency AI tasks.

### Supabase

- Docs: https://supabase.com/docs/guides/getting-started/features
- RLS docs: https://supabase.com/docs/guides/database/postgres/row-level-security
- Use: Auth, Postgres, Storage, and user-scoped security.

### Upstash Redis

- Docs: https://upstash.com/docs/redis/howto/connectwithupstashredis
- Use: idempotency keys, queue coordination, and lightweight state.

### Resend

- Docs: https://resend.com/docs
- Use: user-facing email notifications and email event tracking.

### Playwright

- Docs: https://playwright.dev/docs/intro
- Pages docs: https://playwright.dev/docs/pages
- Use: browser automation in a dedicated worker service.

## Core Implementation Implications

1. Keep Cloudflare Workers stateless.
2. Keep browser automation out of the edge API path.
3. Use Supabase as the source of truth.
4. Use queues for anything long-running or retryable.
5. Preserve truthful resume generation.
6. Prefer official APIs before scraping when available.
