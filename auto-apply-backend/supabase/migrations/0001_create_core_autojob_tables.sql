create extension if not exists pgcrypto;
create extension if not exists vector;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'application_status'
  ) then
    create type application_status as enum (
      'queued',
      'matching',
      'tailoring',
      'ready_to_apply',
      'applying',
      'submitted',
      'failed',
      'needs_review',
      'archived'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'artifact_type'
  ) then
    create type artifact_type as enum (
      'raw_resume',
      'parsed_profile',
      'tailored_resume_json',
      'tailored_resume_pdf'
    );
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text,
  headline text,
  email text,
  phone text,
  skills jsonb not null default '[]'::jsonb,
  years_experience numeric(4, 1) not null default 0,
  location_preferences jsonb not null default '[]'::jsonb,
  work_authorization text,
  summary text,
  resume_source_file_id uuid,
  confidence jsonb not null default '{"overall": 0}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resume_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid,
  type artifact_type not null,
  storage_path text not null,
  storage_bucket text not null default 'resume-artifacts',
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_job_id text not null,
  title text not null,
  company text not null,
  location text,
  remote boolean not null default false,
  description text not null,
  apply_url text not null,
  posted_at timestamptz,
  salary_min numeric,
  salary_max numeric,
  raw_payload jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_job_id)
);

create table if not exists public.job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  score numeric(5, 4) not null,
  rank integer not null,
  reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  status application_status not null default 'queued',
  applied_at timestamptz,
  resume_artifact_id uuid references public.resume_artifacts (id) on delete set null,
  error_code text,
  error_message text,
  external_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  delivery_provider text,
  provider_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  encrypted_credential_ref text not null,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  event_type text not null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_user_id on public.profiles (user_id);
create index if not exists idx_resume_artifacts_user_id on public.resume_artifacts (user_id);
create index if not exists idx_resume_artifacts_job_id on public.resume_artifacts (job_id);
create index if not exists idx_jobs_source on public.jobs (source);
create index if not exists idx_jobs_source_job_id on public.jobs (source_job_id);
create index if not exists idx_job_matches_user_id on public.job_matches (user_id);
create index if not exists idx_job_matches_job_id on public.job_matches (job_id);
create index if not exists idx_applications_user_id on public.applications (user_id);
create index if not exists idx_applications_job_id on public.applications (job_id);
create index if not exists idx_notifications_user_id on public.notifications (user_id);
create index if not exists idx_automation_accounts_user_id on public.automation_accounts (user_id);
create index if not exists idx_application_events_application_id on public.application_events (application_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_resume_artifacts_set_updated_at on public.resume_artifacts;
create trigger trg_resume_artifacts_set_updated_at
before update on public.resume_artifacts
for each row execute function public.set_updated_at();

drop trigger if exists trg_jobs_set_updated_at on public.jobs;
create trigger trg_jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

drop trigger if exists trg_job_matches_set_updated_at on public.job_matches;
create trigger trg_job_matches_set_updated_at
before update on public.job_matches
for each row execute function public.set_updated_at();

drop trigger if exists trg_applications_set_updated_at on public.applications;
create trigger trg_applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

drop trigger if exists trg_notifications_set_updated_at on public.notifications;
create trigger trg_notifications_set_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

drop trigger if exists trg_automation_accounts_set_updated_at on public.automation_accounts;
create trigger trg_automation_accounts_set_updated_at
before update on public.automation_accounts
for each row execute function public.set_updated_at();
