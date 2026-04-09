# Implementation TODO

This is the ordered build list for the platform.

## Phase 1: Backend Foundation

- [ ] Finalize backend schema migrations
- [ ] Add Supabase RLS policies
- [ ] Finalize storage buckets and retention rules
- [ ] Add request validation helpers
- [ ] Add error response helpers
- [ ] Add backend health endpoint
- [ ] Add contract tests for endpoint shapes

## Phase 2: Resume Ingestion

- [ ] Implement resume upload registration
- [ ] Implement parse queue enqueueing
- [ ] Integrate primary parser
- [ ] Integrate fallback parser
- [ ] Normalize parsed profile shape
- [ ] Save profile to Postgres
- [ ] Delete raw ingest file after successful parse when allowed by retention policy
- [ ] Add tests for parsing, normalization, and retention behavior

## Phase 3: Job Discovery

- [ ] Implement job fetching service
- [ ] Integrate JobSpy adapter
- [ ] Integrate Greenhouse adapter
- [ ] Integrate Lever adapter
- [ ] Normalize job schema
- [ ] Deduplicate jobs
- [ ] Add tests for adapters, normalization, and deduplication

## Phase 4: Matching

- [ ] Implement profile/job embeddings
- [ ] Implement job scoring
- [ ] Implement ranking explanations
- [ ] Add tests for scoring stability and ranking rules

## Phase 5: Resume Tailoring

- [ ] Implement truthful tailoring service
- [ ] Add change summary generation
- [ ] Render tailored PDFs
- [ ] Store tailored artifacts in private buckets
- [ ] Add tests for truthfulness, formatting, and artifact creation

## Phase 6: Apply Automation

- [ ] Implement application record creation
- [ ] Implement queue consumers
- [ ] Implement Playwright worker adapter
- [ ] Add retry and idempotency protections
- [ ] Add tests for queue behavior and failure isolation

## Phase 7: Notifications

- [x] Integrate Resend
- [ ] Add delivery webhook handling
- [ ] Add notification history storage
- [ ] Add tests for email payloads and webhook verification

## Phase 8: Frontend

- [ ] Wire auth state
- [ ] Build resume upload UI
- [ ] Build matched jobs UI
- [ ] Build application history UI
- [ ] Build notifications UI
- [ ] Add component tests for each UI surface

## Phase 9: Deployment and Hardening

- [ ] Add CI for backend and frontend separately
- [ ] Add lint and typecheck gates
- [ ] Add unit tests to every new function
- [ ] Add integration tests for API contracts
- [ ] Add end-to-end tests for critical flows
- [ ] Add observability and alerting

## Build Rule

Never merge a feature without tests for the functions, endpoints, or components that feature introduces.
