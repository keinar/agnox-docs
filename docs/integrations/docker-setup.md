---
id: docker-setup
title: Docker Container Setup
sidebar_position: 3
---

# Docker Container Setup (Agnox Hosted Runs)

**Agnox Hosted Runs** execute your tests in an Agnox-managed container, started from a Docker image of your test project. This guide shows how to build that image, push it to a registry, and connect it to your project.

> Already running Playwright in your own CI? You don't need an image — use the [Playwright Reporter →](./playwright-reporter) (External CI runs) instead.

---

## Option 1: Agnox CLI (Recommended)

```bash
npx @agnox/agnox-cli@latest init
```

The CLI detects your framework (Playwright for TypeScript/Node.js, Pytest for Python), pins the matching Playwright base image, generates `Dockerfile`, `entrypoint.sh` and `.dockerignore`, and builds and pushes a **multi-arch** image (`linux/amd64` + `linux/arm64`).

- **Private registries** (GHCR, AWS ECR, Google Artifact Registry, self-hosted): `npx @agnox/agnox-cli@latest init -r ghcr.io` — the CLI logs in, tags and pushes for you.
- **Update the image from CI:** `npx @agnox/agnox-cli@latest push -i <image_tag>`.

---

## Option 2: Manual Setup

### How Agnox runs your container

For each run, Agnox:

1. Pulls your image.
2. Runs `/bin/sh /app/entrypoint.sh <folder>` — your image's own `ENTRYPOINT` / `CMD` are not used.
3. Injects environment variables (below) and streams the output live to the dashboard.
4. Collects reports and artifacts from fixed paths when the container exits, and generates the Allure report for you.

### Step 1 — `entrypoint.sh`

Create `entrypoint.sh` at your project root:

```bash
#!/bin/sh
FOLDER_PATH=$1

# Use the configuration Agnox injects, not a local .env
if [ -f .env ]; then
    rm .env
fi

# Match the container's CPU quota (Agnox injects PLAYWRIGHT_WORKERS)
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

- `$1` is the test folder chosen in the dashboard or API (e.g. `tests/e2e`); empty or `all` means the whole suite.
- Do not prefix the test command with `exec`.
- Save the file with **Unix (LF) line endings** — Windows CRLF breaks shell scripts.
- No `allure generate` step is needed: Agnox builds the Allure report from `allure-results`.

### Step 2 — `Dockerfile`

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

Requirements:

1. `WORKDIR` must be `/app`, and the script must be at `/app/entrypoint.sh`.
2. `entrypoint.sh` must be executable (`chmod +x`).
3. No `ENTRYPOINT` or `CMD`.

### Step 3 — Read `BASE_URL` in your tests

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],
});
```

### Step 4 — Build and push

Build a **multi-arch image** so it runs natively on any Agnox runner — no emulation, faster startup, and no "wrong architecture" errors:

```bash
# One-time: create a builder that can produce multi-platform images
docker buildx create --use

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-dockerhub-user/my-tests:latest \
  --push .
```

> **Tip:** a plain `docker build` only produces an image for the machine you build on (e.g. `arm64` on Apple Silicon, `amd64` on most CI runners). If Agnox reports that your image has no build for the runner's platform, rebuild it with `--platform linux/amd64,linux/arm64` as above.

### Step 5 — Connect the image to your project

1. Go to **Settings → Run Settings** and select (or create) your project.
2. Enter the **Docker image** (e.g. `your-dockerhub-user/my-tests:latest`).
3. Set the **environment URLs** (Development, Staging, Production) — the selected one is injected as `BASE_URL`.
4. Optionally set a **default test folder**.
5. Add credentials your tests need in **Settings → Env Variables** (encrypted with AES-256-GCM; values marked **Secret** are redacted from logs).

Launch a run with **Run Test** in the dashboard, from CI ([GitHub Actions →](./github-actions)), on a [schedule](../core-features/scheduling), or from a Test Cycle.

---

## Injected Environment Variables

| Variable | Description |
|----------|-------------|
| `BASE_URL` | URL of the selected environment |
| `TASK_ID` | Unique ID of the run |
| `CI` | Always `true` |
| `FRAMEWORK_AGNOSTIC` | Always `true` |
| `PLAYWRIGHT_WORKERS` | Recommended Playwright worker count for the container's CPU quota |
| *Your project variables* | Everything defined in **Settings → Env Variables** for the project |

---

## Report & Artifact Paths

Agnox collects these folders from `/app` when the run ends:

| Path | Content |
|------|---------|
| `/app/playwright-report` | Playwright HTML report |
| `/app/test-results` | Screenshots, videos, traces |
| `/app/allure-results` | Allure raw results (Agnox generates the Allure report) |
| `/app/allure-report` | A pre-generated Allure report, if you create one |
| `/app/pytest-report` | Pytest HTML report |
| `/app/mochawesome-report` | Mocha / Cypress report |

Reports and artifacts are kept for your plan's [retention period](../core-features/organization#billing--plans).

---

## Framework Examples

### Pytest

```python
# conftest.py
import os
import pytest

@pytest.fixture(scope='session')
def base_url():
    return os.environ.get('BASE_URL', 'http://localhost:3000')
```

```bash
#!/bin/sh
# entrypoint.sh for Pytest
FOLDER_PATH=$1
if [ -z "$FOLDER_PATH" ] || [ "$FOLDER_PATH" = "all" ]; then
    pytest --html=/app/pytest-report/report.html --self-contained-html
else
    pytest "$FOLDER_PATH" --html=/app/pytest-report/report.html --self-contained-html
fi
```

### Cypress

```javascript
// cypress.config.js
module.exports = {
  e2e: {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  },
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'mochawesome-report',
    html: true,
  },
};
```

---

## Troubleshooting

### `npm ci` fails in a monorepo / workspace project

**Symptom:** `npm error code ENOWORKSPACES`, `Cannot read properties of null (reading 'matches')`, or a missing `package.json` in a parent directory.

**Cause:** your lockfile links local workspace packages (e.g. `file:../../packages/...`) that are outside the Docker build context.

**Fix:** replace `RUN npm ci` with `RUN npm install` in the Dockerfile. Keep `npm ci` for standalone projects.

### The image is built for the wrong platform

**Symptom:** the run fails with a message that the image has no build for the runner's platform, or with `exec format error`.

**Fix:** rebuild and push a multi-arch image with `docker buildx build --platform linux/amd64,linux/arm64 ... --push` (see Step 4).

### The container fails to start

- `entrypoint.sh` must exist at `/app/entrypoint.sh` and be executable.
- Use Unix (LF) line endings.

### Tests don't hit the right site

- Read `process.env.BASE_URL` in your config.
- Check the environment URLs in **Settings → Run Settings**.

### Reports or screenshots are missing

- Write them under `/app` to the paths listed above.
- Reports are available once the run reaches a final status.

---

## Related

- [Quick Start →](../getting-started/quick-start)
- [GitHub Actions & CI/CD →](./github-actions)
- [Playwright Reporter →](./playwright-reporter)
