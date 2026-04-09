insert into storage.buckets (id, name, public)
values
  ('resume-ingest', 'resume-ingest', false),
  ('resume-artifacts', 'resume-artifacts', false),
  ('tailored-resumes', 'tailored-resumes', false),
  ('application-evidence', 'application-evidence', false)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

create policy "resume_artifacts_select_own_objects"
on storage.objects
for select
using (
  bucket_id = 'resume-artifacts'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "resume_artifacts_insert_own_objects"
on storage.objects
for insert
with check (
  bucket_id = 'resume-artifacts'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "resume_artifacts_update_own_objects"
on storage.objects
for update
using (
  bucket_id = 'resume-artifacts'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'resume-artifacts'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "resume_artifacts_delete_own_objects"
on storage.objects
for delete
using (
  bucket_id = 'resume-artifacts'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "resume_ingest_select_own_objects"
on storage.objects
for select
using (
  bucket_id = 'resume-ingest'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "resume_ingest_insert_own_objects"
on storage.objects
for insert
with check (
  bucket_id = 'resume-ingest'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "resume_ingest_update_own_objects"
on storage.objects
for update
using (
  bucket_id = 'resume-ingest'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'resume-ingest'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "resume_ingest_delete_own_objects"
on storage.objects
for delete
using (
  bucket_id = 'resume-ingest'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "tailored_resumes_select_own_objects"
on storage.objects
for select
using (
  bucket_id = 'tailored-resumes'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "tailored_resumes_insert_own_objects"
on storage.objects
for insert
with check (
  bucket_id = 'tailored-resumes'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "tailored_resumes_update_own_objects"
on storage.objects
for update
using (
  bucket_id = 'tailored-resumes'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'tailored-resumes'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "tailored_resumes_delete_own_objects"
on storage.objects
for delete
using (
  bucket_id = 'tailored-resumes'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "application_evidence_select_own_objects"
on storage.objects
for select
using (
  bucket_id = 'application-evidence'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "application_evidence_insert_own_objects"
on storage.objects
for insert
with check (
  bucket_id = 'application-evidence'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "application_evidence_update_own_objects"
on storage.objects
for update
using (
  bucket_id = 'application-evidence'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'application-evidence'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "application_evidence_delete_own_objects"
on storage.objects
for delete
using (
  bucket_id = 'application-evidence'
  and split_part(name, '/', 1) = auth.uid()::text
);
