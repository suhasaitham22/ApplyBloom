<p align="center">
  <img src="auto-apply-frontend/public/applybloom-logo.svg" alt="ApplyBloom logo" width="72" height="72" />
</p>

<h1 align="center">ApplyBloom</h1>

ApplyBloom is an AI-assisted job application platform split into two codebases:

- `auto-apply-frontend` (Next.js web app)
- `auto-apply-backend` (Cloudflare Worker API and async processors)

## Current auto-apply plan (source of truth)

**→ [`docs/auto-apply/`](./docs/auto-apply/)** — Architecture, phased delivery plan, decisions, and references for the AI-driven auto-apply pipeline. Read this first before touching any auto-apply code.

## Product workflows

- Auto-apply mode: upload resume, discover matching jobs, and queue apply actions.
- Single-job mode: pick one job, tailor resume for that job, then apply.

## Run locally

### Prerequisites

- Node.js 20+
- npm 10+

### 1) Start backend (Cloudflare Worker)

1. Open a terminal in `auto-apply-backend`.
2. Install dependencies:
   - `npm install`
3. Create `auto-apply-backend/.dev.vars`:

```bash
DEV_DEMO_USER_ID=local_demo_user
DEV_IMMEDIATE_QUEUE_PROCESSING=true
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=ApplyBloom <onboarding@resend.dev>
GREENHOUSE_BOARD_TOKENS=
LEVER_COMPANY_TOKENS=
```

4. Start backend:
   - `npm run dev`
5. Health check:
   - `http://127.0.0.1:8787/api/v1/health`

### 2) Start frontend (Next.js)

1. Open a second terminal in `auto-apply-frontend`.
2. Install dependencies:
   - `npm install`
3. Create/update `auto-apply-frontend/.env.local`:

```bash
NEXT_PUBLIC_BACKEND_API_BASE_URL=http://127.0.0.1:8787
NEXT_PUBLIC_DEMO_USER_ID=local_demo_user
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start frontend:
   - `npm run dev`
5. Open:
   - `http://localhost:3000`

## Local test commands

- Frontend tests:
  - `cd auto-apply-frontend`
  - `npm run test`
- Backend tests:
  - `cd auto-apply-backend`
  - `npm run test`

## Local troubleshooting

- `Cannot find module './xxx.js'` or RSC payload mismatch usually means stale Next build artifacts:
  - `cd auto-apply-frontend`
  - `npm run clean:next`
  - `npm run dev`
- If frontend cannot call backend, verify:
  - `NEXT_PUBLIC_BACKEND_API_BASE_URL=http://127.0.0.1:8787`
  - backend terminal is running `npm run dev`

## Architecture constraints

- Frontend and backend remain separate codebases.
- API edge remains stateless.
- Long-running work is handled by async processors.
- External GitHub repos are reference implementations; behavior is ported into ApplyBloom code.

## Documentation

- [System design](system-design.md)
- [Implementation idea](idea.md)
- [Resources and source links](resources.md)
- [Remaining integrations checklist](docs/remaining-integrations-checklist.md)
- [Branch protection setup](docs/branch-protection-setup.md)
- [Contributing guide](CONTRIBUTING.md)

## Contributing

Community contributions are welcome. Please start with [CONTRIBUTING.md](CONTRIBUTING.md) for setup, branch naming, test requirements, and pull request expectations.
