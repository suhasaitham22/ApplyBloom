# External References

All links verified live on 2026-04-24. Full list with bodies in
`~/applybloom-research/auto-apply-references.md` (local, not committed).

## Cloudflare platform

- **Workers Cron Triggers** — https://developers.cloudflare.com/workers/configuration/cron-triggers/
- **Queues** — https://developers.cloudflare.com/queues/
- **Browser Rendering + Playwright** — https://developers.cloudflare.com/browser-rendering/platform/playwright/
- **`@cloudflare/playwright`** — https://www.npmjs.com/package/@cloudflare/playwright
- **Workers AI `bge-small-en-v1.5`** (embeddings) — https://developers.cloudflare.com/workers-ai/models/bge-small-en-v1.5/
- **Vectorize** (vector DB) — https://developers.cloudflare.com/vectorize/

## ATS Public APIs

- **Greenhouse Job Board API** — https://developers.greenhouse.io/job-board.html
  - List: `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true`
  - Apply: `POST https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs/{id}` (Basic auth)
- **Lever Postings API** — https://github.com/lever/postings-api
  - List: `GET https://api.lever.co/v0/postings/{company}?mode=json`
  - Apply: `POST https://api.lever.co/v0/postings/{company}/{postingId}?key=...`

## Job aggregators

- **Remotive** — https://github.com/remotive-com/remote-jobs-api — `GET https://remotive.com/api/remote-jobs`
- **Arbeitnow** — https://arbeitnow.com/api/job-board-api — free, no auth
- **Adzuna** — https://developer.adzuna.com/activedocs — free tier 1k/mo
- **JSearch (RapidAPI)** — https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch — free tier 2.5k/mo

## Legal

- **hiQ Labs v. LinkedIn** (9th Cir. 2022) — https://en.wikipedia.org/wiki/HiQ_Labs_v._LinkedIn
- **EEOC EEO-1 Data Collection** — https://www.eeoc.gov/employers/eeo-data-collections

## Reference implementations

- **AIHawk** — https://github.com/feder-cr/Jobs_Applier_AI_Agent_AIHawk
- **applyagent** (PyPI) — https://pypi.org/project/applyagent/
- **Job Hunter AI (dev.to)** — https://dev.to/tanzilahmed/i-built-an-autonomous-job-application-agent-with-claude-ai-heres-how-it-works-31d9

## How to re-verify

```bash
# Any broken link in this doc
web_fetch "https://developers.greenhouse.io/job-board.html" --max-chars 400
```
