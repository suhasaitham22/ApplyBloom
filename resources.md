# Resources

This project is designed to reuse existing repositories, APIs, and platform services instead of rebuilding every component from scratch.

## Frontend and Hosting

- Next.js: https://nextjs.org/
- Tailwind CSS: https://tailwindcss.com/
- Cloudflare Pages: https://pages.cloudflare.com/

## Backend and AI Platform

- Cloudflare Workers: https://workers.cloudflare.com/
- Workers AI: https://developers.cloudflare.com/workers-ai/

## Database, Auth, and Storage

- Supabase: https://supabase.com/

## Queue System

- Upstash Redis: https://upstash.com/

## Automation

- Playwright: https://playwright.dev/

## AI / LLM Providers

- Workers AI: https://developers.cloudflare.com/workers-ai/
- OpenAI: https://platform.openai.com/
- Claude: https://www.anthropic.com/

## Reusable GitHub Repositories

- jobspy: https://github.com/speedyapply/jobspy
- pyresparser: https://github.com/OmkarPathak/pyresparser
- resume-parser: https://github.com/AnasAito/resume-parser
- linkedin-easy-apply-bot: https://github.com/nicolomantini/linkedin-easy-apply-bot
- semantic-job-search: https://github.com/ashishpatel26/semantic-job-search
- SaaSFly Next.js SaaS Starter: https://github.com/saasfly/saasfly

## Job APIs

- Greenhouse Job Board API: https://developers.greenhouse.io/job-board.html
- Lever API: https://github.com/lever/postings-api

## Intended Reuse Strategy

- Use `jobspy` and the job board APIs for job discovery.
- Use `pyresparser` or `resume-parser` for resume extraction where they are reliable.
- Use `semantic-job-search` patterns for ranking and matching.
- Use `linkedin-easy-apply-bot` or Playwright-based automation as an apply worker foundation.
- Use `saasfly` only as a frontend or product scaffold reference if the structure fits the final stack.
