---
id: domains/code-review
name: Code Review
version: "1.0.0"
description: Structured code review checklist covering correctness, design, and maintainability.
language: null
tags: [code-review, quality, process]
depends_on: []
capabilities: [review, feedback, quality-gate]
parameters: []
tools: []
constraints: []
---

# Code Review

A repeatable approach to reviewing code for correctness, clarity, and maintainability.

## Goals of Review

- Catch defects before they reach users.
- Share context across the team — reviews are how knowledge spreads.
- Keep the codebase consistent and evolvable.
- Mentor without gatekeeping.

## Review Order

1. Read the PR description and linked ticket first. Understand the intent.
2. Skim the file list to form a mental map of scope.
3. Read changes in a logical order (entry point to implementation), not file order.
4. Run the code locally if the change is non-trivial.
5. Leave comments grouped by severity.

## Checklist

### Correctness
- Does it solve the stated problem? Any edge cases missed?
- Null/empty/boundary inputs handled?
- Concurrent access considered (threads, async, DB transactions)?
- Error paths tested? Do failures leave the system in a consistent state?
- Off-by-one, integer overflow, timezone, locale pitfalls?

### Design
- Single responsibility per function/class/module?
- Abstractions earn their keep or are they speculation?
- Naming matches domain language?
- Public API minimal and intentional?
- Coupling: would changing one thing cascade?

### Tests
- New behavior has new tests?
- Tests describe behavior, not implementation?
- Do tests fail for the right reason if the feature regresses?
- Flaky patterns avoided (time, randomness, network)?

### Security
- Input validated at trust boundaries?
- Authz checks present where needed?
- Secrets not logged or committed?
- SQL/command/template injection avoided?

### Performance
- Any new O(n²) loops on unbounded input?
- DB queries: N+1, missing indexes, over-fetching?
- Caching correct (invalidation, staleness)?

### Maintainability
- Comments explain *why*, not *what*?
- Dead code removed?
- Public API documented?
- Breaking changes called out with migration notes?

## Comment Etiquette

- Ask questions before asserting ("Did you consider..." over "This is wrong").
- Distinguish blocking from optional: prefix with `nit:`, `question:`, `suggestion:`, or `blocking:`.
- Explain *why* when requesting changes.
- Approve small, safe changes freely; deep reviews for risky ones.

## Red Flags

- Large, mixed-purpose PRs. Request a split.
- "Temporary" workarounds with no ticket.
- Commented-out code.
- TODOs without an owner or date.
- New global mutable state.
- Copy-paste without deduplication.

## Finishing the Review

- Summarize findings at the top of the review.
- State clearly: approve, request changes, or comment.
- Follow up after merge if issues were deferred.
