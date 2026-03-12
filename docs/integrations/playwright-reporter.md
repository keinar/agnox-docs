---
id: playwright-reporter
title: Native Playwright Reporter
sidebar_position: 1
---

# Native Playwright Reporter

Stream live Playwright results directly to your Agnox dashboard from your existing CI pipelines — **no Docker container required**.

---

## How It Works

1. When Playwright starts, the reporter calls `/api/ingest/setup` and receives a `sessionId`.
2. As tests run, events (`test-begin`, `test-end`, `log`) are batched and sent to `/api/ingest/event` every 2 seconds.
3. When Playwright finishes, the reporter calls `/api/ingest/teardown` — the execution record is created and appears in the Dashboard.

Results appear under the **External CI** source filter in the Dashboard.

---

## Installation

```bash
npm install --save-dev @agnox/playwright-reporter
```

---

## Configuration

> `import 'dotenv/config'` must be the **first line** of `playwright.config.ts` so environment variables are available when Playwright evaluates the reporter config.

```typescript
import 'dotenv/config'; // ← MUST be first
import { defineConfig } from '@playwright/test';
import AgnoxReporter from '@agnox/playwright-reporter';

export default defineConfig({
  reporter: [
    ['list'],
    [AgnoxReporter, {
      apiKey:    process.env.AGNOX_API_KEY!,
      projectId: process.env.AGNOX_PROJECT_ID!,
      // environment: 'staging',    // optional: 'development' | 'staging' | 'production'
      // runName: 'nightly suite',  // optional: label shown in the Dashboard
      // debug: true,               // optional: logs reporter activity to stdout
    }],
  ],
});
```

**Find your credentials:**
- **API Key:** Settings → Profile → API Access
- **Project ID:** Settings → Run Settings → select your project → Execution Defaults section

---

## CI Integration

```yaml
# .github/workflows/e2e.yml
steps:
  - uses: actions/checkout@v4
  - run: npm ci
  - run: npm run build -w @agnox/playwright-reporter  # build the workspace package
  - run: npx playwright install --with-deps
  - name: Run Playwright tests
    env:
      AGNOX_API_KEY:    ${{ secrets.AGNOX_API_KEY }}
      AGNOX_PROJECT_ID: ${{ secrets.AGNOX_PROJECT_ID }}
    run: npx playwright test
```

The reporter auto-detects **GitHub Actions**, **GitLab CI**, **Azure DevOps**, and **Jenkins** — repository, branch, PR number, and commit SHA are attached to every run automatically.

---

## Zero-Crash Guarantee

The reporter is built on a "Do No Harm" principle. If the Agnox API is unreachable or your credentials are wrong, the reporter **silently becomes a no-op**. Your CI pipeline will never fail because of this reporter. The worst-case outcome is that the run simply does not appear in Agnox.

---

## Reliability Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Flush interval | 2 seconds | How often batched events are sent |
| Batch size | 50 events | Maximum events per batch |

---

## Filtering by Source

Use the **Source** filter on the Dashboard to distinguish:
- **Agnox Hosted** — runs executed inside Docker containers orchestrated by Agnox
- **External CI** — runs streamed by `@agnox/playwright-reporter` from your CI pipelines

---

## Troubleshooting

### Reporter is Silent — No Data in Dashboard

**Check 1 — `dotenv/config` must be the first line of `playwright.config.ts`.**

```typescript
import 'dotenv/config'; // ← FIRST line, before anything else
```

**Check 2 — Do not set `baseUrl` to your app URL.**

The reporter's `baseUrl` is the URL of the **Agnox API** (`https://api.agnox.dev`), not your application. Omit it entirely — the default is correct for most users:

```typescript
[AgnoxReporter, {
  apiKey:    process.env.AGNOX_API_KEY!,
  projectId: process.env.AGNOX_PROJECT_ID!,
  // Do NOT set baseUrl to your app URL
}],
```

**Enable debug mode temporarily:**
```typescript
[AgnoxReporter, { apiKey: '...', projectId: '...', debug: true }],
```

### `MODULE_NOT_FOUND` in CI

The compiled `dist/` folder is git-ignored. Build the package in CI before running Playwright:

```yaml
- run: npm ci
- run: npm run build -w @agnox/playwright-reporter   # ← add this
- run: npx playwright test
```

---

## Related

- [Quick Start →](../getting-started/quick-start)
- [Docker Setup →](./docker-setup)
- [GitHub Actions →](./github-actions)
