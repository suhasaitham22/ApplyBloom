-- Provider credentials vault — encrypted login details for job boards / ATS
-- Encryption: AES-256-GCM at the application layer. DB stores ciphertext + IV only.

create table if not exists public.provider_credentials (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  provider          text not null check (provider in ('greenhouse','lever','workday','linkedin','indeed','wellfound','generic','other')),
  label             text,
  username_enc      text not null,
  password_enc      text not null,
  extra_enc         text,
  last_used_at      timestamptz,
  usage_count       integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_provider_creds_user on public.provider_credentials(user_id);
-- Unique per (user, provider, label) — null label treated as empty
create unique index if not exists idx_provider_creds_unique
  on public.provider_credentials(user_id, provider, coalesce(label, ''));
drop trigger if exists trg_provider_creds_updated_at on public.provider_credentials;
create trigger trg_provider_creds_updated_at before update on public.provider_credentials
  for each row execute function set_updated_at();

alter table public.provider_credentials enable row level security;
drop policy if exists pcred_user_all on public.provider_credentials;
create policy pcred_user_all on public.provider_credentials
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.credential_access_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  credential_id   uuid not null references public.provider_credentials(id) on delete cascade,
  action          text not null check (action in ('reveal','use_for_apply','update','delete')),
  request_id      text,
  ip              text,
  user_agent      text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_cred_access_log_user on public.credential_access_log(user_id, created_at desc);
create index if not exists idx_cred_access_log_cred on public.credential_access_log(credential_id, created_at desc);

alter table public.credential_access_log enable row level security;
drop policy if exists cal_user_select on public.credential_access_log;
create policy cal_user_select on public.credential_access_log
  for select using (user_id = auth.uid());

alter table public.sessions
  add column if not exists credential_id uuid references public.provider_credentials(id) on delete set null;
