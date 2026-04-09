# Reuse vs Porting Policy

## Decision

Do not import external GitHub repos as runtime dependencies.

Instead:

1. Inspect the external repo behavior.
2. Port the needed functionality into our own codebase.
3. Keep the implementation aligned with our contract, naming, and isolation rules.
4. Test the ported implementation directly inside our repos.

## Why

Direct dependency on unrelated external repos makes the system harder to:

- version
- test
- audit
- deploy
- refactor

Porting the relevant behavior gives us:

- full ownership
- fewer transitive surprises
- better naming
- better isolation
- tests that match our product contract

## What to Port

### Job Discovery

Port the functionality we need from JobSpy into our own job discovery service.

### Resume Parsing

Port the parsing flow we need from `pyresparser` and any fallback parser into our own parsing service.

### Apply Automation

Port the browser automation behavior we need from the LinkedIn bot repo into our own apply worker.

### Semantic Matching

Port the matching concepts we need from semantic-job-search into our own ranking service.

### Frontend Scaffold Patterns

Use `saasfly` only as a visual and structural reference, then implement the actual UI in our own frontend repo.

## Rule

External repos are references, not runtime dependencies.

