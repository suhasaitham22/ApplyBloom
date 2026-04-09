# Phase 4 - Matching and Tailoring

## Objective

Rank jobs against the user's profile and generate truthful, job-specific resume variants.

## Why This Phase Matters

This is the product's main intelligence layer.

It is also the area where quality and trust matter most:

- bad matching wastes user time
- bad tailoring damages trust
- invented claims are unacceptable

## Reuse Strategy

- Use [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) for embeddings and lightweight generation.
- Keep matching logic deterministic where possible.
- Use AI to explain and tailor, not to replace the scoring pipeline.

## Matching Approach

Use a two-stage ranking model:

1. Hard filters
   - location
   - remote preference
   - seniority
   - visa/work authorization constraints
2. Semantic ranking
   - skill overlap
   - title similarity
   - description similarity
   - experience fit

This design produces more stable recommendations than pure LLM ranking.

## Tailoring Approach

The tailoring service should:

- rewrite bullets for the target role
- surface the most relevant experience first
- improve ATS phrasing
- preserve factual truth
- keep a clear diff for the user

## Guardrails

- Never add skills that are not supported by the source resume.
- Never fabricate roles, dates, or degrees.
- Prefer conservative rewriting over risky embellishment.
- Flag uncertain claims for manual review.

## Implementation Tasks

1. Generate embeddings for profiles and job descriptions.
2. Store scores and explanations for top matches.
3. Build a tailoring prompt that uses only verified profile facts.
4. Generate a structured tailored resume JSON first.
5. Render the tailored JSON into PDF.
6. Compare generated claims to source profile data.
7. Reject outputs that violate truthfulness rules.

## Suggested Outputs

### Match Record

```json
{
  "user_id": "",
  "job_id": "",
  "score": 0.0,
  "reason": "",
  "rank": 1
}
```

### Tailored Resume Record

```json
{
  "user_id": "",
  "job_id": "",
  "resume_json": {},
  "pdf_url": "",
  "change_summary": []
}
```

## Acceptance Criteria

- The system returns ranked jobs with explanations.
- The tailoring service produces a job-specific resume variant.
- The tailored resume remains faithful to the source profile.
- The user can compare original and tailored versions.

## Risks

- Embedding quality may not capture all domain nuance.
- Over-aggressive tailoring may introduce false claims.
- Generic prompts may produce weak ATS improvements.

## Exit Condition

Do not start auto-apply until the ranking and tailoring outputs are reviewable and trustworthy.
