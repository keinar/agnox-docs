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

> **Not sure which to choose?** Start with the **Passive Reporter** (Option C below) if you already run Playwright in a CI pipeline — it requires zero infrastructure changes.
>
> Each mode has its own monthly quota on your plan: **Agnox Hosted Runs** and **External CI Runs**. See [Plans & Quotas →](../core-features/organization#billing--plans).

---

## Option A: Agnox CLI (Zero-Config Setup)

The Agnox CLI deep-scans your project and auto-generates a production-ready `Dockerfile` and `entrypoint.sh`:

```bash
npx @agnox/agnox-cli@latest init
```

The CLI detects your framework, browser channels, and system dependencies — then builds and pushes a multi-platform Docker image to Docker Hub automatically.

:::info Enterprise: Private Registries
Enterprise teams often store automation images in a **private container registry** — AWS ECR, GitHub Container Registry (GHCR), Google Artifact Registry (GAR), or a self-hosted registry — rather than public Docker Hub. This is the recommended approach for protecting proprietary test code and enforcing access control.

Append the `-r` / `--registry` flag to `init` with your registry host:

```bash
# GitHub Container Registry
npx @agnox/agnox-cli@latest init -r ghcr.io

# AWS Elastic Container Registry
npx @agnox/agnox-cli@latest init -r 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Google Artifact Registry
npx @agnox/agnox-cli@latest init -r us-docker.pkg.dev/my-project/my-repo
```

The CLI will automatically:
1. **Prompt for credentials** and perform `docker login` against the target registry (including credential-helper flows for ECR and GAR).
2. **Tag the built image** with the correct fully-qualified registry path.
3. **Push the image** — no manual `docker tag` or `docker push` steps required.

After the push, enter the fully-qualified image name (e.g. `ghcr.io/my-org/my-automation:latest`) in **Settings → Run Settings → Docker Image** as you would with any other image.
:::

### Continuous Integration (CI/CD)

To update your Docker image seamlessly in your CI/CD pipeline, use the `push` command:

```bash
npx @agnox/agnox-cli@latest push -i <image_tag>
```

This allows you to update the connected image tag programmatically, ensuring Agnox always executes against your latest test suite version.

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
# Match the container's CPU quota: Agnox injects PLAYWRIGHT_WORKERS (2 on hosted runs).
# Without it Playwright sizes its worker pool from the host CPUs and can run out of memory.
WORKERS_FLAG=""
if [ -n "$PLAYWRIGHT_WORKERS" ]; then
    WORKERS_FLAG="--workers=$PLAYWRIGHT_WORKERS"
fi

if [ -z "$FOLDER_PATH" ] || [ "$FOLDER_PATH" = "all" ]; then
    npx playwright test $WORKERS_FLAG
else
    npx playwright test "$FOLDER_PATH" $WORKERS_FLAG
fi
```

> Agnox generates the Allure report from `allure-results` for you — no `allure generate` step needed.

Create `Dockerfile`:

```dockerfile
# Use the Playwright image matching the @playwright/test version in package.json
FROM mcr.microsoft.com/playwright:v1.50.0-jammy
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN chmod +x /app/entrypoint.sh

# Do NOT add ENTRYPOINT or CMD — Agnox starts /app/entrypoint.sh itself
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

Build a multi-arch image so it runs natively on every Agnox runner:

```bash
docker buildx create --use   # one-time
docker buildx build --platform linux/amd64,linux/arm64 \
  -t your-dockerhub-user/my-automation:latest --push .
```

> A plain `docker build` only targets the architecture of the machine you build on. See [Docker Setup →](../integrations/docker-setup) for details.

### Step 3 — Create Account & Configure Project

1. Sign up at [agnox.dev](https://agnox.dev) — your organization is created automatically.
2. Go to **Settings → Run Settings** → **Create New Project**.
3. Enter your **Docker image** (`your-dockerhub-user/my-automation:latest`) and **test folder**.

### Step 4 — Generate an API Key

1. Go to **Settings → Profile → API Access**.
2. Click **Generate New Key**, name it (e.g., "GitHub Actions"), and copy it immediately.

### Step 5 — Run Tests

**Via Dashboard:** Click **Run Test** → select project and environment → **Start Execution**.

**Via GitHub Actions (or any CI):**
```yaml
name: Run E2E Tests
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Tests via Agnox
        run: |
          curl -sS --fail-with-body -X POST https://api.agnox.dev/api/ci/trigger \
            -H "Content-Type: application/json" \
            -H "x-api-key: ${{ secrets.AGNOX_API_KEY }}" \
            -d '{
              "projectId": "${{ secrets.AGNOX_PROJECT_ID }}",
              "image": "your-dockerhub-user/my-automation:latest",
              "command": "npx playwright test",
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

See the [CI & Webhooks API →](../api-reference/ci-and-webhooks) for every field.

---

## Option C: Native Playwright Reporter (No Docker Required)

Stream live results from your existing Playwright setup directly to Agnox — no Docker image, no container provisioning.

### Step 1 — Install

```bash
npm install -D @agnox/playwright-reporter
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
  - run: npx playwright install --with-deps
  - name: Run Playwright tests
    env:
      AGNOX_API_KEY:    ${{ secrets.AGNOX_API_KEY }}
      AGNOX_PROJECT_ID: ${{ secrets.AGNOX_PROJECT_ID }}
    run: npx playwright test
```

Results appear in the Dashboard under the **External CI** source filter. From v2.3.0, **screenshots, videos and traces of failed tests upload automatically** to the run's Artifacts tab (`uploadArtifacts: 'failed-only'` by default; `'all'` or `'none'` to change it; 25 MB per file, 150 MB per run).

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
The package is not installed where Playwright runs. Add it to `devDependencies` with `npm install -D @agnox/playwright-reporter` and run `npm ci` before `npx playwright test`.

### Image Has No Build for the Runner's Platform
Rebuild with `docker buildx build --platform linux/amd64,linux/arm64 ... --push`.

---

## Next Steps

- [Playwright Reporter →](../integrations/playwright-reporter) — full reporter configuration reference
- [Docker Setup →](../integrations/docker-setup) — detailed container protocol
- [AI Features →](../ai-capabilities/configuration) — enable the AI Quality Orchestrator
