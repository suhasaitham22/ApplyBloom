-- ApplyBloom Studio — core schema
-- Run this via: supabase db push OR paste into the Supabase SQL editor.

-- =========================
-- Extensions
-- =========================
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- =========================
-- Helpers
-- =========================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- =========================
-- resumes
-- =========================
create table if not exists public.resumes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  raw_text        text,
  parsed          jsonb,
  storage_path    text,                                 -- path in storage bucket (nullable for paste-text resumes)
  file_type       text check (file_type in ('pdf','docx','txt','text','other') or file_type is null),
  version         integer not null default 1,
  is_base         boolean not null default false,
  parent_id       uuid references public.resumes(id) on delete set null,
  tailored_for_session_id uuid,                         -- forward-declared; FK added after sessions exists
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_resumes_user on public.resumes(user_id);
create index if not exists idx_resumes_parent on public.resumes(parent_id);
create trigger trg_resumes_updated_at before update on public.resumes
  for each row execute function set_updated_at();

-- =========================
-- sessions
-- =========================
create table if not exists public.sessions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  title                text not null,
  mode                 text not null check (mode in ('single','auto')),
  status               text not null check (status in ('idle','collecting','ready','running','paused','completed','cancelled','failed')),
  resume_id            uuid references public.resumes(id) on delete set null,
  tailored_resume_id   uuid references public.resumes(id) on delete set null,
  job                  jsonb,                           -- { title, company, description, url, source }
  preferences          jsonb not null default '{}'::jsonb, -- auto-apply: { experience_level, locations, remote, salary_min, … }
  system_prompt        text,                            -- optional per-session system prompt override
  daily_cap            integer default 10,
  applications_today   integer not null default 0,
  application_id       text,
  locked_at            timestamptz,
  completed_at         timestamptz,
  cancelled_at         timestamptz,
  paused_at            timestamptz,
  metadata             jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_sessions_user on public.sessions(user_id, status);

-- GLOBAL CONSTRAINT: only one running/collecting session per user at a time.
create unique index if not exists idx_one_active_session_per_user
  on public.sessions(user_id)
  where status in ('running','collecting');

create trigger trg_sessions_updated_at before update on public.sessions
  for each row execute function set_updated_at();

-- Back-fill resume → session FK now that sessions exists
alter table public.resumes
  drop constraint if exists resumes_tailored_for_session_fk,
  add constraint resumes_tailored_for_session_fk
    foreign key (tailored_for_session_id) references public.sessions(id) on delete set null;

-- =========================
-- chat_messages
-- =========================
create table if not exists public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system','action','thinking','error')),
  content         text not null,
  thinking        text,                                 -- optional separate thinking / reasoning block
  action_type     text,
  action_payload  jsonb,
  model           text,
  prompt_version  text,
  tokens_input    integer,
  tokens_output   integer,
  latency_ms      integer,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists idx_chat_messages_session on public.chat_messages(session_id, created_at);
create index if not exists idx_chat_messages_user on public.chat_messages(user_id, created_at);

-- =========================
-- job_queue (auto-apply targets)
-- =========================
create table if not exists public.job_queue (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references public.sessions(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  external_job_id  text,
  source           text,                                -- greenhouse, lever, manual, …
  title            text not null,
  company          text not null,
  location         text,
  remote           boolean,
  description      text,
  url              text,
  score            numeric,
  status           text not null check (status in ('pending','tailoring','applying','applied','skipped','failed')),
  tailored_resume_id uuid references public.resumes(id) on delete set null,
  error_message    text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_job_queue_session on public.job_queue(session_id, status);
create index if not exists idx_job_queue_user on public.job_queue(user_id, status);
create trigger trg_job_queue_updated_at before update on public.job_queue
  for each row execute function set_updated_at();

-- =========================
-- Row Level Security
-- =========================
alter table public.resumes       enable row level security;
alter table public.sessions      enable row level security;
alter table public.chat_messages enable row level security;
alter table public.job_queue     enable row level security;

-- resumes
drop policy if exists "resumes: own" on public.resumes;
create policy "resumes: own" on public.resumes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- sessions
drop policy if exists "sessions: own" on public.sessions;
create policy "sessions: own" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- chat_messages
drop policy if exists "chat: own" on public.chat_messages;
create policy "chat: own" on public.chat_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- job_queue
drop policy if exists "job_queue: own" on public.job_queue;
create policy "job_queue: own" on public.job_queue
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================
-- Storage bucket policy (run after creating bucket `resume-files` in Supabase Storage UI)
-- =========================
--   insert into storage.buckets (id, name, public) values ('resume-files', 'resume-files', false);
--
-- then:
--
--   create policy "resumes: own bucket read"
--     on storage.objects for select
--     using (bucket_id = 'resume-files' and (storage.foldername(name))[1] = auth.uid()::text);
--
--   create policy "resumes: own bucket write"
--     on storage.objects for insert
--     with check (bucket_id = 'resume-files' and (storage.foldername(name))[1] = auth.uid()::text);
--
--   create policy "resumes: own bucket delete"
--     on storage.objects for delete
--     using (bucket_id = 'resume-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- End migration 001_studio_core
