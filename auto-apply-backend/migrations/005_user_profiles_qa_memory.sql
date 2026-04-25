-- Phase A: user_profiles + qa_memory
-- user_profiles: required before mode=auto is allowed. EEO fields are AES-256-GCM encrypted.
-- qa_memory: reusable answers to per-application questions with embedding for similarity match.

create table if not exists public.user_profiles (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null unique references auth.users(id) on delete cascade,
  legal_first_name           text,
  legal_last_name            text,
  email                      text,
  phone                      text,
  location                   text,
  work_authorization         text check (work_authorization in ('citizen','green_card','h1b','opt','stem_opt','needs_sponsorship','other')),
  visa_sponsorship_needed    boolean,
  relocation_ok              boolean,
  earliest_start_date        date,
  notice_period_weeks        integer,
  salary_min                 integer,
  salary_max                 integer,
  linkedin_url               text,
  portfolio_url              text,
  github_url                 text,
  eeo_gender_enc             text,
  eeo_race_enc               text,
  eeo_veteran_enc            text,
  eeo_disability_enc         text,
  completed_at               timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at before update on public.user_profiles
  for each row execute function set_updated_at();

alter table public.user_profiles enable row level security;
drop policy if exists up_user_all on public.user_profiles;
create policy up_user_all on public.user_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Q&A memory: answers to per-application custom questions.
-- question_embedding is 384-dim float8[] from @cf/baai/bge-small-en-v1.5.
create table if not exists public.qa_memory (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  question_text         text not null,
  question_normalized   text not null,
  question_embedding    double precision[],
  answer                text not null,
  question_type         text check (question_type in ('short_text','long_text','single_choice','multi_choice','boolean','number','url','date','file')),
  source                text check (source in ('user','inferred_from_profile','imported')),
  times_used            integer not null default 0,
  last_used_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_qa_memory_user_norm on public.qa_memory(user_id, question_normalized);
create unique index if not exists idx_qa_memory_unique_per_user on public.qa_memory(user_id, question_normalized);

drop trigger if exists trg_qa_memory_updated_at on public.qa_memory;
create trigger trg_qa_memory_updated_at before update on public.qa_memory
  for each row execute function set_updated_at();

alter table public.qa_memory enable row level security;
drop policy if exists qa_user_all on public.qa_memory;
create policy qa_user_all on public.qa_memory
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
