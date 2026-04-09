# Storage Decision

## Decision

Use Supabase Storage for file artifacts, but do not treat it as a long-term dump for raw user documents.

### Store

- original resume uploads
- tailored resume PDFs
- optional parse artifacts when useful for debugging or user review

### Do Not Store Long-Term

- unnecessary duplicate copies of raw resumes
- temporary intermediate files after processing
- browser automation screenshots unless needed for a failed run audit

## Policy

1. All file buckets must be private.
2. Access must happen through signed URLs or server-side service credentials.
3. Raw resume files should be retained only as long as needed for parsing and user access.
4. Generated artifacts may be retained longer because they are part of the user workflow.
5. Every stored file must have a deletion path.

## Recommended Buckets

- `resume-ingest`
- `resume-artifacts`
- `tailored-resumes`
- `application-evidence`

## Retention Guidance

- `resume-ingest`: short retention, ideally deleted after parse succeeds and the user has a parsed profile
- `resume-artifacts`: keep parsed JSON or normalized artifacts while the profile exists
- `tailored-resumes`: keep while the user actively uses the job application flow
- `application-evidence`: keep only for failed or audited apply runs

## Why This Is the Right Tradeoff

- Supabase Storage gives us auth integration and signed access.
- Private buckets reduce exposure.
- Short-lived raw uploads reduce sensitive data risk.
- Keeping tailored outputs supports user value.
- Avoiding long-term raw file retention reduces compliance and privacy burden.

## Implementation Rule

If a file is not needed for user value, debugging, or audit, do not store it.
