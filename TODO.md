# ApplyBloom Rebuild — TODO

## User-provided later
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend)
- [ ] `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (backend)
- [ ] `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`
- [ ] Cloudflare Workers AI binding `AI` in `wrangler.toml` for production

## Degraded-mode behaviour until keys land
- Auth → session-less demo mode with banner "Demo mode — wire Supabase to persist data"
- Resend → email bodies rendered in a `/notifications` inbox panel
- Workers AI → local heuristic fallback so UI never hangs
