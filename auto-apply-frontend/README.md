# auto-apply-frontend

Next.js frontend for ApplyBloom.

## Run locally

1. Install dependencies:
   - `npm install`
2. Create `.env.local`:

```bash
NEXT_PUBLIC_BACKEND_API_BASE_URL=http://127.0.0.1:8787
NEXT_PUBLIC_DEMO_USER_ID=local_demo_user
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Start dev server:
   - `npm run dev`
4. Open:
   - `http://localhost:3000`

## Commands

- `npm run dev` -> start development server
- `npm run clean:next` -> clear stale Next cache/artifacts
- `npm run build` -> production build
- `npm run start` -> fresh production start
- `npm run test` -> run Vitest suite

## Scope

- UI only.
- Backend calls must use `/api/v1` endpoints.
- No queue or browser automation logic in this repo.
