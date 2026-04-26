-- Phase B: apply_queue (browser-extension-driven automation) + qa_pending + session_events
--
-- Extension long-polls for queued rows, claims one atomically, runs the ATS strategy,
-- reports back via POST. Novel Q&A questions create qa_pending rows which the user
-- answers from chat or dashboard.
-- session_events is an append-only log used by the SSE stream (chat + dashboard).

create table if not exists public.apply_queue (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  session_id         uuid references public.sessions(id) on delete set null,
  job_key            text not null,          -- source-specific dedup key (e.g. greenhouse job id)
  ats_provider       text not null check (ats_provider in ('greenhouse','lever','ashby','generic')),
  apply_url          text not null,
  job_title          text,
  company            text,
  resume_id          uuid references public.resumes(id) on delete set null,
  credential_id      uuid references public.provider_credentials(id) on delete set null,
  dry_run            boolean not null default false,
  status             text not null default 'queued'
                       check (status in ('queued','claimed','running','needs_input','submitted','failed','cancelled','paused')),
  priority           integer not null default 0,   -- single-mode applies bump priority above auto-mode batches
  error              text,
  screenshot_urls    jsonb not null default '[]'::jsonb,
  attempt_log        jsonb not null default '[]'::jsonb,
  claimed_by         text,                   -- extension deviceId
  claimed_at         timestamptz,
  started_at         timestamptz,
  finished_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, job_key)
);

create index if not exists idx_apply_queue_user_status on public.apply_queue(user_id, status);
create index if not exists idx_apply_queue_claim_ready
  on public.apply_queue(user_id, priority desc, created_at asc)
  where status = 'queued';
create index if not exists idx_apply_queue_session on public.apply_queue(session_id);

drop trigger if exists trg_apply_queue_updated_at on public.apply_queue;
create trigger trg_apply_queue_updated_at before update on public.apply_queue
  for each row execute function set_updated_at();

alter table public.apply_queue enable row level security;
drop policy if exists aq_user_all on public.apply_queue;
create policy aq_user_all on public.apply_queue
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Pending Q&A questions surfaced by the extension during an apply run.
-- When apply_queue.status = 'needs_input' there MUST be at least one open qa_pending
-- row for it; answering flips apply_queue back to 'running' and extension resumes.
create table if not exists public.qa_pending (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  apply_id           uuid not null references public.apply_queue(id) on delete cascade,
  session_id         uuid references public.sessions(id) on delete set null,
  question_text      text not null,
  question_type      text check (question_type in ('short_text','long_text','single_choice','multi_choice','boolean','number','url','date','file')),
  options            jsonb,
  suggested_answer   text,                   -- from qa_memory.findSimilarAnswer, verdict=suggest
  suggested_verdict  text check (suggested_verdict in ('auto','suggest','ask')),
  answer             text,
  answered_at        timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists idx_qa_pending_open on public.qa_pending(user_id, apply_id) where answered_at is null;
create index if not exists idx_qa_pending_session on public.qa_pending(session_id);

alter table public.qa_pending enable row level security;
drop policy if exists qp_user_all on public.qa_pending;
create policy qp_user_all on public.qa_pending
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Append-only event log used by SSE. Chat messages stay in chat_messages;
-- this table is for automation status (apply started / step / done / error).
create table if not exists public.session_events (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  session_id         uuid references public.sessions(id) on delete set null,
  apply_id           uuid references public.apply_queue(id) on delete cascade,
  kind               text not null,         -- 'apply_queued'|'apply_claimed'|'apply_step'|'apply_screenshot'|'apply_needs_input'|'apply_submitted'|'apply_failed'|'qa_asked'|'qa_answered'
  payload            jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

create index if not exists idx_session_events_session_ts on public.session_events(session_id, created_at desc);
create index if not exists idx_session_events_user_ts on public.session_events(user_id, created_at desc);

alter table public.session_events enable row level security;
drop policy if exists se_user_select on public.session_events;
create policy se_user_select on public.session_events
  for select using (user_id = auth.uid());
drop policy if exists se_user_insert on public.session_events;
create policy se_user_insert on public.session_events
  for insert with check (user_id = auth.uid());
