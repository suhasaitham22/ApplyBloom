alter table public.profiles enable row level security;
alter table public.resume_artifacts enable row level security;
alter table public.jobs enable row level security;
alter table public.job_matches enable row level security;
alter table public.applications enable row level security;
alter table public.notifications enable row level security;
alter table public.automation_accounts enable row level security;
alter table public.application_events enable row level security;

create policy "profiles_select_own_row"
on public.profiles
for select
using (auth.uid() = user_id);

create policy "profiles_insert_own_row"
on public.profiles
for insert
with check (auth.uid() = user_id);

create policy "profiles_update_own_row"
on public.profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "resume_artifacts_select_own_rows"
on public.resume_artifacts
for select
using (auth.uid() = user_id);

create policy "resume_artifacts_insert_own_rows"
on public.resume_artifacts
for insert
with check (auth.uid() = user_id);

create policy "resume_artifacts_update_own_rows"
on public.resume_artifacts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "jobs_select_authenticated_users"
on public.jobs
for select
using (auth.uid() is not null);

create policy "job_matches_select_own_rows"
on public.job_matches
for select
using (auth.uid() = user_id);

create policy "job_matches_insert_own_rows"
on public.job_matches
for insert
with check (auth.uid() = user_id);

create policy "job_matches_update_own_rows"
on public.job_matches
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "applications_select_own_rows"
on public.applications
for select
using (auth.uid() = user_id);

create policy "applications_insert_own_rows"
on public.applications
for insert
with check (auth.uid() = user_id);

create policy "applications_update_own_rows"
on public.applications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "notifications_select_own_rows"
on public.notifications
for select
using (auth.uid() = user_id);

create policy "notifications_update_own_rows"
on public.notifications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "automation_accounts_select_own_rows"
on public.automation_accounts
for select
using (auth.uid() = user_id);

create policy "automation_accounts_insert_own_rows"
on public.automation_accounts
for insert
with check (auth.uid() = user_id);

create policy "automation_accounts_update_own_rows"
on public.automation_accounts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "application_events_select_own_application_rows"
on public.application_events
for select
using (
  exists (
    select 1
    from public.applications a
    where a.id = application_events.application_id
      and a.user_id = auth.uid()
  )
);
