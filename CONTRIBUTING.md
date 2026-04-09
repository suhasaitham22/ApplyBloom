# Contributing to ApplyBloom

Thanks for contributing to ApplyBloom.

## Project structure

- `auto-apply-frontend`: Next.js product UI
- `auto-apply-backend`: Cloudflare Worker API and async processors

## Local setup

1. Follow the root [README.md](README.md) to run frontend and backend locally.
2. Run tests before opening a PR:
   - `cd auto-apply-frontend && npm run test`
   - `cd auto-apply-backend && npm run test`

## Branch naming

- Use descriptive branches:
  - `feat/<scope>-<short-description>`
  - `fix/<scope>-<short-description>`
  - `docs/<scope>-<short-description>`

## Pull request checklist

- Keep changes scoped to one concern.
- Preserve frontend/backend separation.
- Add or update tests when behavior changes.
- Update docs when commands, env vars, or flows change.
- Include screenshots for UI changes.

## Coding expectations

- Keep modules small and explicit.
- Prefer clear file names that describe responsibility.
- Avoid tightly coupling UI, orchestration, and provider adapters.
- Do not commit secrets or provider keys.

## Security

- Never commit `.env.local`, `.dev.vars`, API keys, tokens, or passwords.
- Use placeholder values in docs and examples.
