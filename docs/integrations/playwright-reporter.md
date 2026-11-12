---
id: playwright-reporter
title: Native Playwright Reporter
sidebar_position: 1
---

# Native Playwright Reporter

Stream live Playwright results from your existing CI pipeline (or your laptop) straight to the Agnox dashboard — **no Docker image required**. Runs reported this way are **External CI runs**.

---

## Installation

```bash
npm install -D @agnox/playwright-reporter
```

```bash
# yarn
yarn add -D @agnox/playwright-reporter

# pnpm
pnpm add -D @agnox/playwright-reporter
```

Requires `@playwright/test` 1.40 or later and Node.js 18 or later. The package is published pre-built on npm — no build step is needed.

---

## Configuration

> `import 'dotenv/config'` must be the **first line** of `playwright.config.ts` if you load credentials from a local `.env` file, so they exist when Playwright evaluates the reporter config.

```typescript
import 'dotenv/config'; // ← MUST be first
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Attachments the reporter uploads (see "Artifacts" below)
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: [
    ['list'], // keep your existing reporters
    ['@agnox/playwright-reporter', {
      apiKey:    process.env.AGNOX_API_KEY!,
      projectId: process.env.AGNOX_PROJECT_ID!,
      // environment: 'staging',          // 'development' | 'staging' | 'production'
      // runName: 'nightly suite',        // label shown in the Dashboard
      // uploadArtifacts: 'failed-only',  // 'failed-only' (default) | 'all' | 'none'
      // createCycle: true,               // also create a Test Cycle for this run
      // cycleId: '<cycle id>',           // add this run to an existing Test Cycle
      // debug: true,                     // log reporter activity to stderr
    }],
  ],
});
```

### Options

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `apiKey` | string | Yes | — | Your Agnox API key. |
| `projectId` | string | Yes | — | The Agnox project the run belongs to. |
| `baseUrl` | string | No | `https://api.agnox.dev` | The Agnox API URL. **Not** your application's URL — leave it unset. |
| `runName` | string | No | — | Label for the run (also the Test Cycle name when `createCycle` is on). |
| `environment` | `'development' \| 'staging' \| 'production'` | No | `'production'` | Environment recorded on the run. |
| `uploadArtifacts` | `'failed-only' \| 'all' \| 'none'` | No | `'failed-only'` | Which tests' screenshots, videos and traces are uploaded. See [Artifacts](#artifacts-screenshots-videos-traces). |
| `createCycle` | boolean | No | `false` | Also create a Test Cycle for this run. |
| `cycleId` | string | No | — | Add the run to an existing Test Cycle of the same project. Takes precedence over `createCycle`. |
| `flushIntervalMs` | number | No | `2000` | How often buffered events are sent. |
| `maxBatchSize` | number | No | `50` | Events per batch before an early flush. |
| `debug` | boolean | No | `false` | Log reporter activity to stderr. |

### Finding your credentials

- **API key:** **Settings → Profile → API Access** → **Generate New Key**. The key is shown once — store it as a CI secret.
- **Project ID:** **Settings → Run Settings** → select your project → **Execution Defaults**.

---

## How It Works

1. When Playwright starts, the reporter opens a session with Agnox.
2. While tests run, results and log lines are sent in small batches every 2 seconds — they appear live in the dashboard.
3. Screenshots, videos and traces of failed tests are uploaded in the background.
4. When Playwright finishes, the run is closed with its final status.

Runs appear on the Dashboard under the **External CI** source filter, with the branch, commit, PR number and CI job link detected automatically on **GitHub Actions**, **GitLab CI**, **Azure DevOps** and **Jenkins** (any other `CI=true` environment is recorded as generic).

### Test Cycles are opt-in

Runs are recorded as executions only, so CI does not flood the **Test Cycles** page. To also track a run as a Test Cycle:

- `createCycle: true` — creates a new cycle named after `runName`; it appears on the **CI / Automated** tab and completes when the run finishes.
- `cycleId: '<id>'` — adds the run to an **existing** cycle in the same project; the cycle's summary is recounted from all its items.

An unknown `cycleId`, or one from another project, is rejected (`400` / `404`) before anything is recorded.

> **Upgrading from 2.1.x or earlier:** older versions created a Test Cycle for every run. Pass `createCycle: true` to keep that behaviour.

---

## Artifacts (Screenshots, Videos, Traces)

From **v2.3.0** the reporter automatically uploads the files Playwright attaches to your tests. They appear in the run's **Artifacts** tab in the Investigation Hub — exactly like the artifacts of an Agnox Hosted run. Turn the attachments on in `playwright.config.ts` as usual (`screenshot`, `video`, `trace` — see the example above).

| Rule | Value |
|------|-------|
| Which tests | **`'failed-only'` (default):** failed and timed-out tests, including the failed attempts of a flaky test. Passing tests upload nothing. `'all'` uploads every test's attachments; `'none'` turns uploads off. |
| File types | `.png`, `.jpg`, `.jpeg`, `.webp`, `.webm`, `.mp4`, `.zip` (traces), `.md`, `.txt`, `.json` |
| Per file | **25 MB** — larger files are skipped (visible with `debug: true`) |
| Per run | **150 MB** in total |
| Storage | Uploads count toward your organization's storage. When the storage quota is used up, the reporter stops uploading for the rest of the run — test results are still reported. |
| Retention | Artifacts are kept as long as the run — see [plan retention](../core-features/organization#billing--plans). |

Uploads run in the background, three at a time, while your tests run. When the run ends, pending uploads get at most 20 seconds.

---

## CI Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run Playwright tests
        env:
          AGNOX_API_KEY:    ${{ secrets.AGNOX_API_KEY }}
          AGNOX_PROJECT_ID: ${{ secrets.AGNOX_PROJECT_ID }}
        run: npx playwright test
```

More CI examples: [GitHub Actions & CI/CD →](./github-actions)

---

## Enabling Runtime Context (Recommended)

Import `test` and `expect` from the reporter instead of `@playwright/test` to upgrade AI Root Cause Analysis from log parsing to structured, failure-time diagnostics. At the moment a test fails, the reporter captures:

- the page URL and `<title>`;
- page errors and `console.error()` messages;
- failed network requests (`4xx` / `5xx` or connection errors);
- an ARIA snapshot of the page (capped at 8 KB);
- up to 50 test-id values on the page (your `testIdAttribute`, default `data-testid`), used for **locator repair suggestions**.

Passing tests have no overhead, and **no test file changes** — update the shared fixtures file your tests import from:

```diff
// tests/fixtures/base.ts  ← a fixtures file, not a test file
- import { test, expect } from '@playwright/test';
+ import { test, expect } from '@agnox/playwright-reporter';
```

The exported `test` is a drop-in replacement: it adds an automatic fixture that runs for every test and attaches the captured context to the failure.

---

## Zero-Crash Guarantee

**Your test suite never fails because of this reporter.**

- If Agnox is unreachable or your credentials are wrong, the reporter becomes a no-op after one retry.
- A batch that fails to deliver is dropped; after two failures in a row the reporter stops sending for the rest of the run.
- Reporter errors are never thrown to Playwright.
- Finishing the run is capped: at most **20 seconds** are added to your CI job.

The worst case is a run that does not appear in Agnox. Green builds stay green.

---

## Filtering by Source

Use the **Source** filter on the Dashboard to tell runs apart:

- **Agnox Hosted** — runs executed in an Agnox container from your Docker image. They count toward your plan's **Agnox Hosted Runs**.
- **External CI** — runs reported by `@agnox/playwright-reporter`. They count toward your plan's **External CI Runs**.

See [Plans & Quotas →](../core-features/organization#billing--plans).

---

## Troubleshooting

### No data in the Dashboard

1. **`dotenv/config` must be the first line** of `playwright.config.ts` when credentials come from a `.env` file.
2. **Do not set `baseUrl` to your application's URL.** The reporter's `baseUrl` is the Agnox API (`https://api.agnox.dev`) and is already the default. Your app's URL goes in Playwright's `use.baseURL`.
3. Temporarily set `debug: true` to see what the reporter is doing.

### `Cannot find module '@agnox/playwright-reporter'`

The package is not installed in the environment that runs Playwright. Make sure it is in your `devDependencies` (`npm install -D @agnox/playwright-reporter`) and that your CI runs `npm ci` before `npx playwright test`.

### Screenshots or videos are missing from the Artifacts tab

- Check that Playwright actually produces them (`screenshot`, `video`, `trace` in `use`).
- With the default `'failed-only'`, passing tests upload nothing.
- Files over 25 MB, and files beyond 150 MB per run, are skipped; uploads also stop when your organization's storage is full.
- Upgrade to v2.3.0 or later: `npm install -D @agnox/playwright-reporter@latest`.

---

## Related

- [Integrations Overview →](./overview)
- [Quick Start →](../getting-started/quick-start)
- [GitHub Actions & CI/CD →](./github-actions)
- [Docker Container Setup (Agnox Hosted) →](./docker-setup)
