---
id: quick-start
title: Quick Start
sidebar_position: 2
---

# Quick Start

Connect your test automation project to Agnox and run your first test in minutes.

---

## Choose Your Integration Mode

Agnox supports two distinct ways to run and observe your tests:

| | **Agnox Hosted** | **External CI (Passive Reporter)** |
|---|---|---|
| **How it works** | Agnox provisions a Docker container, executes your tests, and streams results back | Your CI pipeline runs tests natively; a lightweight reporter streams results to Agnox |
| **Requires Docker image** | Yes — push your image to Docker Hub | No — works with any existing Playwright setup |
| **CI pipeline** | Optional (trigger via Dashboard, API, or CI webhook) | Required |
| **Best for** | Full isolation, multi-framework, scheduled runs | Teams already running Playwright in GitHub Actions, GitLab CI, or locally |

> **Not sure which to choose?** Start with the **Passive Reporter** (Option D below) if you already run Playwright in a CI pipeline — it requires zero infrastructure changes.

---

## Option A: Agnox CLI (Zero-Config Setup)

The Agnox CLI deep-scans your project and auto-generates a production-ready `Dockerfile` and `entrypoint.sh`:

```bash
npx @agnox/agnox-cli@latest init
```

The CLI detects your framework, browser channels, and system dependencies — then builds and pushes a multi-platform Docker image to Docker Hub automatically.

---

## Option B: Manual Docker Setup (Agnox Hosted)

### Step 1 — Prepare Your Container

Create `entrypoint.sh` at your project root:

```bash
#!/bin/sh
FOLDER_PATH=$1
echo "Starting Agnox test run..."

# Remove local .env to enforce platform-injected environment variables
if [ -f .env ]; then
    rm .env
fi

# Run tests
if [ -z "$FOLDER_PATH" ] || [ "$FOLDER_PATH" = "all" ]; then
    npx playwright test
else
    npx playwright test "$FOLDER_PATH"
fi

# Generate Allure report
npx allure generate allure-results --clean -o allure-report
```

Create `Dockerfile`:

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-jammy
WORKDIR /app

COPY package*.json ./
RUN npm ci
RUN npm install -g allure-commandline

COPY . .
RUN chmod +x /app/entrypoint.sh

# Do NOT add ENTRYPOINT or CMD — the Agnox Worker injects them at runtime
```

Configure your test framework to read `BASE_URL` from the environment:

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],
});
```

### Step 2 — Build & Push

```bash
docker build -t your-dockerhub-user/my-automation:latest .
docker push your-dockerhub-user/my-automation:latest
```

### Step 3 — Create Account & Configure Project

1. Sign up at [agnox.dev](https://agnox.dev) — your organization is created automatically.
2. Go to **Settings → Run Settings** → **Create New Project**.
3. Enter your **Docker image** (`your-dockerhub-user/my-automation:latest`) and **test folder**.

### Step 4 — Generate an API Key

1. Go to **Settings → Profile → API Access**.
2. Click **Generate New Key**, name it (e.g., "GitHub Actions"), and copy it immediately.

### Step 5 — Run Tests

**Via Dashboard:** Click **Run Test** → select project and environment → **Start Execution**.

**Via API:**
```bash
curl -X POST https://api.agnox.dev/api/executions \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "your-dockerhub-user/my-automation:latest",
    "command": "npx playwright test",
    "environment": "staging",
    "baseUrl": "https://staging.myapp.com",
    "folder": "tests/e2e"
  }'
```

**Via GitHub Actions:**
```yaml
name: Run E2E Tests
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Tests via Agnox
        run: |
          curl -X POST https://api.agnox.dev/api/ci/trigger \
            -H "Content-Type: application/json" \
            -H "x-api-key: ${{ secrets.AGNOX_API_KEY }}" \
            -d '{
              "projectId": "${{ secrets.AGNOX_PROJECT_ID }}",
              "image": "your-dockerhub-user/my-automation:latest",
              "folder": "tests/e2e",
              "config": { "environment": "staging", "baseUrl": "${{ secrets.TARGET_URL }}" },
              "ciContext": {
                "source": "github",
                "repository": "${{ github.repository }}",
                "prNumber": ${{ github.event.number || 0 }},
                "commitSha": "${{ github.sha }}"
              }
            }'
```

---

## Option D: Native Playwright Reporter (No Docker Required)

Stream live results from your existing Playwright setup directly to Agnox — no Docker image, no container provisioning.

### Step 1 — Install

```bash
npm install --save-dev @agnox/playwright-reporter
```

### Step 2 — Configure Playwright

> `import 'dotenv/config'` must be the **first line** of `playwright.config.ts`.

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
      // environment: 'staging',   // optional
      // runName: 'PR smoke tests', // optional label in Dashboard
    }],
  ],
});
```

### Step 3 — Add to CI

```yaml
# .github/workflows/e2e.yml
steps:
  - uses: actions/checkout@v4
  - run: npm ci
  - run: npm run build -w @agnox/playwright-reporter
  - run: npx playwright install --with-deps
  - name: Run Playwright tests
    env:
      AGNOX_API_KEY:    ${{ secrets.AGNOX_API_KEY }}
      AGNOX_PROJECT_ID: ${{ secrets.AGNOX_PROJECT_ID }}
    run: npx playwright test
```

Results appear in the Dashboard under the **External CI** source filter.

**Zero-Crash Guarantee:** If the Agnox API is unreachable or your credentials are wrong, the reporter silently becomes a no-op. Your CI pipeline will never fail because of this reporter.

---

## Troubleshooting

### Container Fails to Start
- Verify `entrypoint.sh` exists at `/app/entrypoint.sh`
- Ensure the file has Unix line endings (not Windows CRLF)
- Check that `chmod +x` ran successfully during the build

### Reporter is Silent Locally
- Ensure `import 'dotenv/config'` is the **first line** of `playwright.config.ts`
- Do **not** set `baseUrl` on the reporter to your app URL — omit it entirely
- Enable `debug: true` in reporter config to see what it's attempting

### `MODULE_NOT_FOUND` for `@agnox/playwright-reporter` in CI
```yaml
- run: npm ci
- run: npm run build -w @agnox/playwright-reporter   # add this
- run: npx playwright test
```

---

## Next Steps

- [Playwright Reporter →](../integrations/playwright-reporter) — full reporter configuration reference
- [Docker Setup →](../integrations/docker-setup) — detailed container protocol
- [AI Features →](../ai-capabilities/configuration) — enable the AI Quality Orchestrator
