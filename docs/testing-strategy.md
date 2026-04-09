# Testing Strategy

Testing must be treated as a first-class implementation requirement.

## 1. Required Test Coverage

Every new piece of functionality must have tests.

That includes:

- pure functions
- service functions
- request handlers
- queue processors
- provider adapters
- UI components
- webhook handlers
- migrations where feasible

## 2. Test Layers

### 2.1 Unit Tests

Use for:

- parsing normalization
- matching score calculation
- tailoring rules
- error classification
- idempotency key generation
- file naming and path builders

### 2.2 Contract Tests

Use for:

- backend endpoint request/response shapes
- queue job payloads
- webhook payload verification
- frontend API client expectations

### 2.3 Integration Tests

Use for:

- Supabase reads and writes
- storage file access behavior
- queue enqueue and dequeue behavior
- Resend webhook handling
- provider adapter boundaries

### 2.4 End-to-End Tests

Use for:

- resume upload to parsed profile
- job discovery to match list
- tailored resume generation
- application creation to status update
- notification delivery and read state

## 3. Coverage Rule

If a file contains logic, it needs a corresponding test file.

If a feature touches multiple files, the feature needs:

- one or more unit tests
- at least one contract or integration test
- an end-to-end test if it is user-facing

## 4. Failure Path Tests

Test failure cases, not only success cases.

Required failure coverage:

- missing input validation
- invalid auth
- duplicate application submit
- parse failure
- job fetch failure
- tailoring validation failure
- apply worker failure
- email delivery failure
- webhook signature failure

## 5. Frontend Testing

Frontend components should be tested for:

- rendering
- loading states
- error states
- interaction behavior
- contract compatibility with backend payloads

## 6. Backend Testing

Backend handlers should be tested for:

- correct status codes
- validated inputs
- idempotency behavior
- queue enqueue behavior
- authorization boundaries

Workers should be tested for:

- job processing
- retries
- failure isolation
- state updates

## 7. Minimum Bar Before Merge

Before a change merges, verify:

1. Type checks pass.
2. Relevant tests pass.
3. Contract changes are reflected in docs.
4. Failure paths have coverage.
5. No unrelated component was broken.

## 8. Practical Rule

No functionality without tests.

If a change is too small to test, it is probably too small to justify merging by itself, or it should be merged together with the unit that makes it testable.
