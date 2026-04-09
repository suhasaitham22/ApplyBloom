# ApplyBoom Product Modes

ApplyBoom should support two primary workflows.

## 1. Auto-Apply Mode

Purpose: take a resume and automatically apply to suitable jobs.

Flow:

1. User uploads a resume.
2. Backend parses the resume into structured profile data.
3. Backend discovers jobs from configured sources.
4. Backend filters and ranks jobs against the profile.
5. Backend applies to matching jobs automatically, within safety rules.
6. Backend records status and notifications.

Safety rules:

- minimum match score
- remote/location filters
- seniority filters
- company blacklist
- daily application cap
- duplicate application prevention
- failure isolation per job

## 2. Single-Job Tailor + Apply Mode

Purpose: tailor a resume for one specific job and apply only to that job.

Flow:

1. User selects one job.
2. Backend tailors the resume to the job.
3. Backend renders the tailored artifact.
4. Backend applies only to that job.
5. Backend stores the application result and notifications.

## Product Rule

The backend should treat auto-apply as the default batch workflow and single-job tailoring as the focused workflow.

