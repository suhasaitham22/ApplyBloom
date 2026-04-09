# Environment Variables

This project should keep provider configuration explicit and versioned in docs.

## Frontend Repository

### Required

- `NEXT_PUBLIC_BACKEND_API_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Optional

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_DEMO_USER_ID`

## Backend Repository

### Required

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_REF`
- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `WORKERS_AI_ACCOUNT_ID`
- `WORKERS_AI_API_TOKEN`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Optional

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `DEV_DEMO_USER_ID`
- `DEV_IMMEDIATE_QUEUE_PROCESSING`
- `RESEND_FROM_EMAIL`
- `SUPABASE_DB_PASSWORD` for local CLI linking only

## Provider Mapping

### Cloudflare

Needs:

- account id
- API token
- Workers AI access

### Supabase

Needs:

- project URL
- project ref
- anon key
- service role key
- database password for `supabase link`

### Resend

Needs:

- API key
- webhook secret

### Clerk

Needs:

- publishable key
- secret key

### Upstash

Needs:

- REST URL
- REST token

### OpenAI / Anthropic

Needs:

- API key for each provider that is enabled
