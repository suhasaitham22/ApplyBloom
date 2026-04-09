# Phase 3 - Job Discovery

## Objective

Collect jobs from multiple sources, normalize them, and keep a deduplicated catalog ready for matching.

## Why This Phase Matters

The product should recommend jobs from real sources, not just generic search results.

This phase turns source-specific APIs and scrapers into one consistent internal job schema.

## Reuse Strategy

- Use [JobSpy](https://github.com/speedyapply/JobSpy) as the multi-source discovery layer.
- Use official job board APIs where available, especially Greenhouse and Lever.
- Keep source metadata so the system can explain where each job came from.

## What JobSpy Contributes

JobSpy is valuable because it already targets multi-source job collection. The design should use it for:

- keyword search
- location search
- remote role discovery
- source aggregation
- apply URL capture

## Implementation Tasks

1. Define a canonical job schema in Postgres.
2. Build source adapters for:
   - JobSpy
   - Greenhouse boards
   - Lever postings
3. Normalize all source payloads into the canonical schema.
4. Deduplicate jobs using:
   - source job id
   - company
   - title
   - apply URL hash
5. Store the raw source payload for debugging.
6. Build user-specific filters:
   - location
   - remote/hybrid
   - seniority
   - keyword preferences
7. Add a refresh schedule so job discovery runs continuously without blocking the UI.

## Suggested Job Record

```json
{
  "source": "jobspy|greenhouse|lever|manual",
  "source_job_id": "",
  "title": "",
  "company": "",
  "location": "",
  "remote": true,
  "description": "",
  "apply_url": "",
  "posted_at": "",
  "raw_payload": {}
}
```

## Acceptance Criteria

- The system can fetch jobs from at least one scraper and one official API.
- Jobs are deduplicated.
- Each job record has a stable canonical identity.
- A user can browse fetched jobs in the UI.

## Risks

- Scraper instability when source sites change.
- Duplicate job records across sources.
- Stale job data if refresh cadence is too slow.

## Exit Condition

Do not begin matching until the job catalog is normalized and deduplicated enough to rank reliably.
