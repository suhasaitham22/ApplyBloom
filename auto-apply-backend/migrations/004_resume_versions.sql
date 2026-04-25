-- Migration 004: resume version history
-- Snapshot every parsed-resume change so users can see what the AI changed
-- and roll back to a previous state.

create table if not exists public.resume_versions (
  id             uuid primary key default gen_random_uuid(),
  resume_id      uuid not null references public.resumes(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  version        int  not null,
  parsed         jsonb,
  raw_text       text,
  created_at     timestamptz not null default now(),
  created_by     text not null check (created_by in ('user','ai','import','system')),
  change_summary text,
  ops            jsonb,
  message_id     uuid references public.chat_messages(id) on delete set null,
  unique (resume_id, version)
);

create index if not exists resume_versions_resume_idx
  on public.resume_versions (resume_id, version desc);

create index if not exists resume_versions_user_idx
  on public.resume_versions (user_id, created_at desc);

alter table public.resume_versions enable row level security;

drop policy if exists "resume_versions owner read"  on public.resume_versions;
drop policy if exists "resume_versions owner write" on public.resume_versions;

create policy "resume_versions owner read"
  on public.resume_versions for select
  using (user_id = auth.uid());

create policy "resume_versions owner write"
  on public.resume_versions for insert
  with check (user_id = auth.uid());
