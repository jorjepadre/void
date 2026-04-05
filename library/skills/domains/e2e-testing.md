---
id: domains/e2e-testing
name: End-to-End Testing
version: "1.0.0"
description: E2E testing patterns for reliable, maintainable user-flow tests.
language: null
tags: [e2e, testing, integration]
depends_on: []
capabilities: [e2e-testing, browser-automation]
parameters: []
tools: []
constraints: []
---

# End-to-End Testing

Patterns for writing E2E tests that are valuable, reliable, and not a maintenance burden.

## When to Use E2E

E2E tests exercise the full stack through the user interface. Reserve them for:
- Critical user journeys (signup, checkout, primary workflows).
- Cross-system integrations that only manifest when wired together.
- Smoke tests against deployed environments.

Don't use E2E to compensate for missing unit tests.

## Tool Selection

- **Playwright** — modern, fast, strong cross-browser support, auto-waiting.
- **Cypress** — developer experience in-browser, good for web apps.
- **Selenium** — legacy but widely supported.
- **Mobile**: Appium, Detox (React Native), Maestro.

Auto-waiting is critical. Avoid tools that require manual sleeps.

## Writing Stable Tests

- Select elements by user-facing attributes: role, label, text. Test IDs as a fallback.
- Avoid CSS selectors tied to styling — they break on refactors.
- Wait for state, not time: `waitForLoadState`, `expect(locator).toBeVisible()`.
- Never use `sleep`/`wait(ms)`; use explicit waits on conditions.

## Test Data Management

- Seed data via API calls or DB fixtures before the test, not through the UI.
- Each test creates and cleans up its own data — no shared state.
- Use unique identifiers (timestamps, UUIDs) to avoid collisions in parallel runs.

## Page Objects / Fixtures

- Page Object pattern wraps selectors and interactions per page.
- Playwright fixtures encapsulate setup: authenticated user, seeded products, etc.
- Keep assertions in tests, not page objects.

```typescript
test('user can place order', async ({ authenticatedPage, seededCart }) => {
  await authenticatedPage.goto('/cart');
  await authenticatedPage.getByRole('button', { name: 'Checkout' }).click();
  await expect(authenticatedPage.getByText('Order confirmed')).toBeVisible();
});
```

## Authentication

- Programmatically log in via API/cookies once, reuse session across tests.
- Avoid logging in through the UI in every test — slow and flaky.

## Environment Strategy

- Dedicated E2E environment that matches production configuration.
- Deterministic data via seeding or resets between runs.
- Feature flags controllable from tests.

## Handling Flakiness

- Retry only known-flaky categories (network, third-party); don't retry blindly.
- Quarantine flaky tests with a time-boxed fix deadline.
- Investigate root causes: timing, data, ordering, or leaked state.
- Run suite in random order to surface inter-test dependencies.

## Performance

- Parallelize aggressively — E2E suites grow slow fast.
- Shard across machines in CI.
- Keep per-test setup cheap; share expensive fixtures where safe.

## Coverage Targets

- 3–10 core journeys is usually enough.
- Track which flows are covered, not line coverage.
- Don't chase coverage metrics at the E2E level.

## Debugging

- Screenshots and traces on failure.
- Video recording for CI.
- `--headed --slowMo` locally to observe behavior.
- Playwright trace viewer or Cypress time-travel debugger.

## Common Pitfalls

- Testing the framework, not the product.
- Asserting on DOM structure instead of user-visible behavior.
- Creating a test for every unit-testable rule.
- Ignoring flakiness until it's unbearable.
