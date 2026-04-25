# Auto-Apply Documentation

This folder is the source of truth for ApplyBloom's job-automation architecture.

| File | Purpose |
|---|---|
| [`architecture.md`](./architecture.md) | How auto-apply works end-to-end — components, data flow, runtime |
| [`phases.md`](./phases.md) | Phased delivery plan (PR A → PR D), what ships when |
| [`decisions.md`](./decisions.md) | Locked-in decisions + the tradeoffs behind each |
| [`references.md`](./references.md) | External sources — ATS APIs, Cloudflare docs, legal citations |

## TL;DR — what we're building

A Cloudflare-Workers-native pipeline that:

1. **Fetches** jobs from legit sources (Greenhouse + Lever ATS APIs, Remotive/Arbeitnow aggregators) on a schedule
2. **Ranks** them against the user's resume + preferences
3. **Tailors** the resume for each top match
4. **Applies** via `@cloudflare/playwright` — Greenhouse & Lever forms auto-submitted, others flagged for manual review
5. **Learns** answers to custom questions via Workers AI embeddings + user-confirmed Q&A memory

## What we explicitly do NOT do

- Never automate LinkedIn-logged-in actions (TOS + ban risk)
- Never fabricate EEO / demographic answers — user provides once, we reuse
- Never submit without explicit user consent on the first 3 applications (dry-run mode)

See [`decisions.md`](./decisions.md) for the reasoning.
