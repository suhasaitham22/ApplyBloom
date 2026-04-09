# auto-apply-frontend

Frontend repository for the AI Auto Job Apply Platform.

## Responsibilities

- authentication UI
- resume upload UI
- job match dashboard
- tailored resume preview
- application timeline
- notification center

## How this frontend is used

- users sign in
- users upload a resume
- users review ranked jobs
- users request tailored resumes
- users track application status
- users read notifications

## Rules

- Keep this repo UI-only.
- Do not place queue workers or automation logic here.
- Call the backend through documented `/api/v1` endpoints only.

## Recommended Stack

- Next.js
- Tailwind CSS
- Cloudflare Pages
- Supabase Auth client
- Clerk only if we later switch auth providers
