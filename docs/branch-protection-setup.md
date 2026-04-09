# Branch Protection Setup (GitHub)

Use these settings for `main` to enforce code review and prevent direct pushes.

## Recommended rule (Rulesets or Branch protection)

Target branch: `main`

Enable:

- Require a pull request before merging
- Require approvals: `2` (or your preferred minimum)
- Dismiss stale approvals when new commits are pushed
- Require review from Code Owners
- Require conversation resolution before merging
- Require status checks to pass before merging
- Restrict who can push to matching branches (maintainers only)
- Block force pushes
- Block branch deletion
- Do not allow bypassing the above settings

## Required status checks

After the first CI run, add these checks as required:

- `Frontend Tests`
- `Backend Tests`

## Notes

- `CODEOWNERS` is defined at `.github/CODEOWNERS`.
- PR template is defined at `.github/pull_request_template.md`.
- CI workflow is defined at `.github/workflows/ci.yml`.
