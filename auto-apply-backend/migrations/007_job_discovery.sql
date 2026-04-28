-- Phase C: job discovery.
-- discovered_jobs — single row per (source, source_job_id) across all users.
-- job_matches — per-user ranking + status (new/saved/rejected/queued_apply).
-- User inserts the apply_queue row from a job_match (front-end button or chat).

create table if not exists public.discovered_jobs (
  id                 uuid primary key default gen_random_uuid(),
  source             text not null check (source in ('greenhouse','lever','remotive','arbeitnow','other')),
  source_job_id      text not null,
  company            text,
  title              text not null,
  location           text,
  description        text,
  apply_url          text not null,
  ats_provider       text check (ats_provider in ('greenhouse','lever','ashby','generic')),
  salary_min         integer,
  salary_max         integer,
  remote             boolean,
  tags               text[],
  posted_at          timestamptz,
  fetched_at         timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (source, source_job_id)
);

create index if not exists idx_disc_jobs_fetched on public.discovered_jobs(fetched_at desc);
create index if not exists idx_disc_jobs_title on public.discovered_jobs using gin(to_tsvector('english', coalesce(title,'')));
create index if not exists idx_disc_jobs_desc on public.discovered_jobs using gin(to_tsvector('english', coalesce(description,'')));

drop trigger if exists trg_disc_jobs_updated_at on public.discovered_jobs;
create trigger trg_disc_jobs_updated_at before update on public.discovered_jobs
  for each row execute function set_updated_at();

-- discovered_jobs is non-user-scoped shared cache; RLS allows SELECT to everyone authed.
alter table public.discovered_jobs enable row level security;
drop policy if exists dj_all_read on public.discovered_jobs;
create policy dj_all_read on public.discovered_jobs
  for select using (true);

-- Per-user matches: ranked view + action state.
create table if not exists public.job_matches (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  job_id             uuid not null references public.discovered_jobs(id) on delete cascade,
  score              double precision not null default 0,
  score_breakdown    jsonb not null default '{}'::jsonb,
  status             text not null default 'new'
                       check (status in ('new','saved','rejected','queued_apply','applied')),
  matched_at         timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, job_id)
);

create index if not exists idx_job_matches_user_score on public.job_matches(user_id, score desc);
create index if not exists idx_job_matches_user_status on public.job_matches(user_id, status);

drop trigger if exists trg_job_matches_updated_at on public.job_matches;
create trigger trg_job_matches_updated_at before update on public.job_matches
  for each row execute function set_updated_at();

alter table public.job_matches enable row level security;
drop policy if exists jm_user_all on public.job_matches;
create policy jm_user_all on public.job_matches
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
