# Phase 2 - Resume Ingestion

## Objective

Turn an uploaded resume into a normalized candidate profile that can power matching and tailoring.

## Why This Phase Matters

The entire product depends on the quality of the parsed profile.

If the parser is weak, every later step becomes noisy:

- matching scores become unreliable
- tailoring becomes generic
- application autofill becomes brittle

## Reuse Strategy

- Use [pyresparser](https://github.com/OmkarPathak/pyresparser) as the primary parsing engine.
- Keep a fallback parser path available for low-confidence or failed documents.
- Store the original upload in Supabase Storage and the structured result in Postgres.

## Verified Parser Value

`pyresparser` is useful here because it is already aimed at extracting:

- name
- email
- phone
- skills
- degree
- experience
- company names
- college name
- designation

That makes it a strong first-pass extractor for profile creation.

## Implementation Tasks

1. Build an upload event that sends a new resume to the parse queue.
2. Download the file in a worker and extract text.
3. Run the primary parser.
4. If confidence is low, run the fallback parser.
5. Normalize the output into a strict profile JSON format.
6. Persist the profile in `profiles`.
7. Persist the parsed artifact in `resume_artifacts`.
8. Generate a lightweight validation report:
   - missing name
   - missing email
   - no detected skills
   - malformed dates

## Suggested Output Shape

```json
{
  "full_name": "",
  "email": "",
  "phone": "",
  "headline": "",
  "skills": [],
  "experience_years": 0,
  "roles": [],
  "education": [],
  "summary": "",
  "confidence": {
    "overall": 0.0
  }
}
```

## Privacy Rules

- Do not expose raw resume content to the browser unless the user explicitly requests a preview.
- Do not retain more raw file copies than necessary.
- Store a clear artifact reference for deletion requests.

## Acceptance Criteria

- Uploading a resume creates a normalized profile.
- The profile contains at least skills and experience information when available.
- Low-quality parse results are flagged instead of silently accepted.
- The user can edit profile fields manually.

## Risks

- Resume layouts that break extraction.
- OCR-like documents that need better text extraction.
- Parser dependency drift over time.

## Exit Condition

Do not begin job ranking until the profile can be trusted enough to represent the candidate consistently.
