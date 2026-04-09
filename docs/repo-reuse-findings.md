# Repo Reuse Findings

This document captures the current reuse decision for the external GitHub repos referenced in the project.

## JobSpy

- Reuse decision: **port the behavior**
- Good for:
  - source adapters
  - multi-source job search
  - normalization
  - deduplication
- Why:
  - the org explicitly positions it as a jobs scraper library for multiple sources
  - it fits our discovery layer well
- What to avoid:
  - importing it as a runtime dependency

## pyresparser

- Reuse decision: **port only the useful parsing ideas**
- Good for:
  - structured resume extraction patterns
  - confidence-style output
- Concerns:
  - the repo shows older dependency pressure and open setup/config issues
  - that makes it better as a reference than a direct foundation
- What to port:
  - data-shape ideas
  - fallback extraction flow
  - validation/normalization patterns

## LinkedIn Easy Apply bot repos

- Reuse decision: **port the automation workflow, not the package**
- Good for:
  - browser flow sequencing
  - form filling logic
  - retry and idempotency patterns
  - handling Easy Apply edge cases
- What to port:
  - site adapter concepts
  - question-answering flow
  - submission state tracking

## semantic-job-search

- Reuse decision: **reuse matching concepts, not runtime code**
- Good for:
  - scoring approach
  - embedding-based relevance
  - explanation generation
- What to port:
  - ranker design
  - explanation structure
  - similarity heuristics

## saasfly

- Reuse decision: **reference only for UI structure**
- Good for:
  - dashboard patterns
  - authentication page patterns
  - SaaS layout conventions
- What to port:
  - nothing directly at runtime

