# Repo Porting Tracker

This document tracks which external GitHub repos should be used as references for porting behavior into our own codebase.

## 1. JobSpy

- Repository: https://github.com/speedyapply/JobSpy
- Use when: designing the job discovery service
- Port into: our own job discovery implementation
- Replaces: importing the external repo at runtime
- Current decision: yes, port the source-adapter and normalization ideas
- Keep code for:
  - source adapters
  - normalization
  - deduplication
  - error handling

## 2. pyresparser

- Repository: https://github.com/OmkarPathak/pyresparser
- Use when: designing resume parsing
- Port into: our own resume parsing implementation
- Replaces: importing the external repo at runtime
- Current decision: partial port only, use as a reference for parsing shape and fallback behavior
- Keep code for:
  - confidence checks
  - normalization
  - fallback handling
  - storage lifecycle

## 3. resume-parser fallback

- Repository: referenced in the prompt as a fallback parsing option
- Use when: pyresparser-style parsing fails or produces low-confidence output
- Port into: our own fallback parsing implementation

## 4. linkedin-easy-apply-bot

- Repository: https://github.com/nicolomantini/linkedin-easy-apply-bot
- Use when: designing the apply worker
- Port into: our own browser automation implementation
- Replaces: importing the external repo at runtime
- Current decision: yes, port the browser workflow and application state machine
- Keep code for:
  - idempotency
  - session boundaries
  - retry strategy
  - state tracking

## 5. semantic-job-search

- Repository: https://github.com/ashishpatel26/semantic-job-search
- Use when: designing ranking and matching patterns
- Port into: our own ranking service
- Replaces: importing the external repo at runtime
- Current decision: port concepts, not runtime code
- Keep code for:
  - embeddings
  - scoring
  - explanation generation

## 6. saasfly

- Repository: https://github.com/saasfly/saasfly
- Use when: the frontend needs a mature SaaS layout or auth scaffold reference
- Port into: our own frontend implementation style
- Replaces: copying the repo directly into runtime dependencies
- Current decision: reference only
- Keep code for:
  - product-specific UI
  - contract-driven API calls
  - dashboard states

## 7. Reuse Rule

Only port behavior from these repos when:

- the external repo already solves the problem well
- the behavior fits our contract
- the implementation can be isolated behind our own service boundary
- there is a test plan for the ported code in our repo
