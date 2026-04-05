---
id: domains/tdd
name: Test-Driven Development
version: "1.0.0"
description: TDD workflow with red-green-refactor and test design principles.
language: null
tags: [tdd, testing, workflow]
depends_on: []
capabilities: [tdd, test-first, refactor]
parameters: []
tools: []
constraints: []
---

# Test-Driven Development

A workflow for building software by writing tests first and letting them drive design.

## Red-Green-Refactor Loop

1. **Red** — Write a failing test that describes one desired behavior.
2. **Green** — Write the minimum code to make the test pass.
3. **Refactor** — Improve structure while keeping tests green.

Each iteration should take minutes, not hours. If the red step feels too large, shrink the scope.

## When to Use TDD

Use TDD when:
- The behavior is well-understood and you need confidence in correctness.
- You're adding logic to an area with regression risk.
- You're working with pure functions, algorithms, or business rules.

Skip or adapt when:
- Exploring an unfamiliar problem space (write a spike first, delete it, then TDD).
- Building UI-heavy code — pair TDD with visual review.
- The cost of setting up a test exceeds its value (trivial glue code).

## Writing Good Tests First

- One behavior per test.
- Arrange-Act-Assert structure; blank lines separate phases.
- Names read as specifications: `returns_empty_list_when_no_active_users`.
- Tests should fail for one clear reason.
- Prefer values over mocks; prefer fakes over mocks; use mocks only at true external boundaries.

## The "Simplest Thing That Could Possibly Work"

In the green step, resist the urge to write the "real" implementation. Return a constant, hardcode a value, use a naive loop. Let the next red test force generalization.

This isn't about permanently naive code — it's about being honest about what's tested vs. what's speculation. Each new test removes a hack.

## Refactor Ruthlessly

With a green bar, you can:
- Extract functions, rename variables, reshape data.
- Collapse duplication (Rule of Three: refactor on the third occurrence).
- Improve names, clarify intent.

Never refactor with red tests. Fix tests first, then refactor.

## Outside-In vs Inside-Out

- **Inside-out (classicist)**: Start at the core domain, build outward. Tests use real collaborators as they emerge.
- **Outside-in (London school)**: Start at the user-facing behavior, mock collaborators, drop to the next layer. Works well for service-shaped code with clear seams.

Most teams benefit from a hybrid: outside-in to frame the scenario, inside-out for the internal logic.

## Test Pyramid

- Many fast unit tests over pure logic.
- Fewer integration tests over collaborators (DB, HTTP).
- A small number of E2E tests exercising critical user flows.

Invert the pyramid only when you have evidence that integration tests catch more real bugs — and pay the speed cost knowingly.

## Anti-Patterns

- Tests that mirror the implementation (white-box coupled tests) break on every refactor.
- Over-mocking: tests pass while the system is broken.
- Shared mutable test state across tests.
- Snapshot tests as a substitute for assertions.
- Commenting out failing tests.

## Measuring Success

- All new behavior has tests.
- Test suite runs in seconds to minutes, not hours.
- Flaky tests are fixed or deleted, never ignored.
- Tests survive refactors — if they don't, they were coupled to implementation.
