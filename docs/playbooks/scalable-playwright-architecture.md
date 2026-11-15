---
id: scalable-playwright-architecture
title: Architecting Scalable Playwright Suites (1,000+ Specs)
sidebar_label: Scalable Playwright Architecture
sidebar_position: 1
description: How to structure a Playwright suite that stays fast, isolated and observable past 1,000 specs — modular fixtures, state isolation, meaningful test.step() blocks and a repo layout built for selective PR execution.
keywords: [playwright, test architecture, fixtures, page objects, test.step, parallel tests, test isolation, selective test execution]
---

# Architecting Scalable Playwright Suites (1,000+ Specs)

A Playwright suite with 50 specs forgives almost anything. At 1,000 specs, every shortcut costs you: a shared login adds minutes to every run, one leaked record makes ten unrelated tests flaky, and a 400-line spec with no structure turns every red build into an archaeology dig.

This playbook covers the four decisions that matter most once a suite grows: **how fixtures are composed**, **how state is isolated**, **how tests report what they did**, and **how the repository is laid out** so that CI only runs what a change can break.

---

## 1. Compose fixtures, don't inherit them

Base classes and global `beforeEach` hooks are the first thing to break at scale. Every test pays for setup it doesn't need, and nobody can tell which test depends on which piece of setup.

Playwright's fixtures solve this: a test declares what it needs, and only that is built.

```ts
// tests/fixtures/index.ts
import { test as base, expect } from '@playwright/test';
import { CheckoutPage } from '../pages/checkout-page';
import { createApiClient, type ApiClient } from '../support/api-client';

type Fixtures = {
  api: ApiClient;
  buyer: { email: string; password: string };
  checkout: CheckoutPage;
};

export const test = base.extend<Fixtures>({
  api: async ({ request }, use) => {
    await use(createApiClient(request));
  },

  // A fresh account per test, created through the API (fast) and removed afterwards.
  buyer: async ({ api }, use, testInfo) => {
    const buyer = await api.createUser({ tag: testInfo.testId });
    await use(buyer);
    await api.deleteUser(buyer.email);
  },

  checkout: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
});

export { expect };
```

Rules that keep fixtures healthy as the suite grows:

- **One import for tests.** Every spec imports `test` and `expect` from `tests/fixtures`, never from `@playwright/test` directly. When you add a fixture, every test can use it immediately.
- **Fixtures set up through the API, tests act through the UI.** Creating a user, seeding a cart or toggling a feature flag through the UI is slow and is not what the test is checking.
- **Worker-scoped fixtures for expensive, read-only setup.** Authentication state, a seeded catalogue or a database connection can be built once per worker with `{ scope: 'worker' }`. Anything a test mutates must be test-scoped.
- **Teardown lives in the fixture.** The code after `await use(...)` always runs, even when the test fails. That is where cleanup belongs, not in an `afterEach` that someone forgets to update.

### Authenticate once per worker

Signing in through the login form in every test is the most common avoidable cost in large suites. Sign in once per worker, save the storage state, and reuse it:

```ts
export const test = base.extend<{}, { workerStorageState: string }>({
  storageState: ({ workerStorageState }, use) => use(workerStorageState),

  workerStorageState: [async ({ browser }, use, workerInfo) => {
    const file = `.auth/worker-${workerInfo.workerIndex}.json`;
    const page = await browser.newPage({ storageState: undefined });
    await signInThroughApi(page, accountForWorker(workerInfo.workerIndex));
    await page.context().storageState({ path: file });
    await page.close();
    await use(file);
  }, { scope: 'worker' }],
});
```

One account per worker (not one for the whole run) keeps parallel workers from fighting over the same session, cart or settings.

---

## 2. Isolate state, or parallelism will expose you

Playwright runs files in parallel by default, and `fullyParallel: true` runs the tests inside a file in parallel too. At 1,000 specs you need both. That only works when **no test can see another test's data**.

| Anti-pattern | What happens at scale | Instead |
|---|---|---|
| Shared seeded user (`qa@example.com`) | Two workers change the same profile; one fails depending on timing | Create a user per test (fixture), or one per worker for read-only tests |
| Tests that depend on order (`test.describe.serial` everywhere) | One failure skips everything after it; the suite can't be sharded | Make each test set up its own preconditions |
| Asserting on global counts ("there are 3 orders") | Breaks whenever another test creates an order | Assert on data the test created, found by a unique tag |
| Cleaning up in `afterAll` | Skipped when a worker crashes; leaks pile up | Clean up in the fixture that created the data |

Two cheap habits help a lot:

- **Tag generated data with `testInfo.testId`.** When a leak does happen, you can find which test created it.
- **Never sleep.** `page.waitForTimeout()` hides race conditions until the CI machine is slower than your laptop. Wait for a state instead: `await expect(locator).toBeVisible()`, `page.waitForResponse(...)`, or `expect.poll(...)` for background work.

---

## 3. Write `test.step()` blocks that explain the test

When a 40-line test fails, the stack trace tells you the line. It doesn't tell you **what the user was trying to do**. `test.step()` does, and it costs nothing at run time.

```ts
test('AG-TC-118: Guest can check out with a new card', async ({ page, checkout, cart }) => {
  await test.step('Add a desk lamp to the cart', async () => {
    await page.goto('/products/desk-lamp');
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await expect(cart.line('Desk lamp')).toBeVisible();
  });

  await test.step('Check out as a guest', async () => {
    await checkout.asGuest(SHIPPING_ADDRESS);
  });

  await test.step('Pay with a new card and see the order number', async () => {
    await checkout.payWithCard(TEST_CARD);
    await expect(page.getByTestId('order-number')).toBeVisible();
  });
});
```

What makes a step useful:

- **Name the user's intent, not the code.** "Check out as a guest", not "click #guest-btn".
- **One step per manual step.** If the test came from a manual test case, keep its step names verbatim. Anyone who knows the manual case can then read the automated run.
- **Put the assertion for a step inside that step.** A failure then points at the step whose expectation broke.
- **Keep steps coarse.** Three to eight steps per test. A step for every click is noise.

With [`@agnox/playwright-reporter`](../integrations/playwright-reporter.md), each `test.step()` is streamed to Agnox as it runs. The Investigation Hub shows which step failed, and a run that came from a [Test Cycle](../core-features/test-cycles.md) reports progress step by step against the original manual case.

---

## 4. Lay out the repository for selective execution

Running everything on every pull request stops scaling long before 1,000 specs. The fix is to make it obvious from a file path **which tests a change can affect**, so CI can run that slice first.

```text
tests/
├── fixtures/             # test.extend(): the only place tests import test/expect from
├── pages/                # Page Objects, one per screen or component
├── support/              # API clients, data builders, helpers
├── checkout/             # one folder per product area…
│   ├── cart.spec.ts
│   ├── guest-checkout.spec.ts
│   └── payment.spec.ts
├── account/
│   ├── sign-in.spec.ts
│   └── password-reset.spec.ts
└── search/
    └── filters.spec.ts
```

Guidelines:

- **Mirror the product, not the test type.** `tests/checkout/` maps naturally to `src/checkout/`. `tests/e2e/` and `tests/regression/` tell a router nothing.
- **Keep a spec file under ~15 tests.** Small files shard evenly and keep the area each file covers obvious.
- **Tag cross-cutting tests.** `{ tag: ['@smoke'] }` or `@critical` lets you run a fast gate before the full slice.
- **Use stable titles.** Agnox links every result to its test case by the spec path plus the title path. Renaming a test creates a new test case, so treat titles as identifiers. Prefixing them with a test case key (`AG-TC-118: ...`) makes the link explicit.

[Smart PR Routing](../ai-capabilities/pr-routing.md) uses exactly this structure: it maps the files a push changed to the test folder most likely to catch a regression and queues just that folder. With a test manifest, the mapping is file-to-test rather than folder-level.

---

## 5. A configuration that holds up

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,       // one retry to classify flakiness — not to hide it
  workers: process.env.CI ? '50%' : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.BASE_URL,
    testIdAttribute: 'data-testid',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  reporter: [
    ['list'],
    ['@agnox/playwright-reporter', {
      apiKey: process.env.AGNOX_API_KEY!,
      projectId: process.env.AGNOX_PROJECT_ID!,
    }],
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

Notes:

- `retries: 1` in CI is enough to tell a flaky test from a broken one. More retries mostly hide problems; see [Flakiness Governance](./flakiness-governance-at-scale.md).
- `forbidOnly` stops a stray `test.only` from silently skipping the rest of the suite.
- `trace: 'retain-on-failure'` keeps traces small and always available for the tests that need them.

---

## Checklist

- [ ] Every spec imports `test`/`expect` from one fixtures module.
- [ ] Setup goes through the API; teardown lives in the fixture that created the data.
- [ ] Authentication happens once per worker, with one account per worker.
- [ ] `fullyParallel: true` passes locally with `--repeat-each=3`.
- [ ] No `waitForTimeout`; every wait is for a state.
- [ ] Each test has 3–8 named `test.step()` blocks, each with its own assertion.
- [ ] Spec folders mirror product areas; titles are stable and carry a test case key.

---

## Related

- [Playwright Reporter →](../integrations/playwright-reporter.md)
- [Smart PR Routing →](../ai-capabilities/pr-routing.md)
- [The 2027 Agentic QA Workflow →](./agentic-qa-workflow-mcp.md)
- [Flakiness Governance & Stability Engineering →](./flakiness-governance-at-scale.md)
