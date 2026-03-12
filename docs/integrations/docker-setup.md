---
id: docker-setup
title: Docker Container Setup
sidebar_position: 3
---

# Docker Container Setup

This guide explains how to prepare your Docker image to work with the Agnox Worker (Agnox Hosted mode).

---

## Container Protocol

The Worker service executes your automation container using a specific protocol. Your container **must** be configured to support it.

### How the Worker Runs Your Container

When you trigger a test execution, the Worker:

1. Pulls your Docker image
2. Runs: `/bin/sh /app/entrypoint.sh <folder>`
3. Injects environment variables (including `BASE_URL`)
4. Streams logs in real-time
5. Collects reports from predefined paths

### Required Arguments

Your `entrypoint.sh` script receives:

| Argument | Description |
|----------|-------------|
| `$1` | Folder path to run tests in (e.g., `tests/e2e`). If empty or `"all"`, run all tests. |

### Injected Environment Variables

| Variable | Description |
|----------|-------------|
| `BASE_URL` | Target website URL to test against |
| `TASK_ID` | Unique execution identifier |
| `CI` | Always `true` in platform execution |
| `FRAMEWORK_AGNOSTIC` | Always `true` |

---

## Standard Entrypoint Script

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

> The script **must** be located at `/app/entrypoint.sh` inside your container.

---

## Dockerfile Template

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

**Key requirements:**
1. `WORKDIR` must be `/app` — the Worker expects your code at this path
2. `entrypoint.sh` must be executable (`chmod +x`)
3. Do **not** add `ENTRYPOINT` or `CMD` — the Worker injects the entrypoint at runtime to handle environment variables and log streaming

---

## Report Output Paths

The Worker collects reports from these paths inside your container:

| Path | Report Type |
|------|-------------|
| `/app/playwright-report` | Playwright HTML report |
| `/app/pytest-report` | Pytest HTML report |
| `/app/mochawesome-report` | Mocha/Cypress report |
| `/app/allure-results` | Allure raw results |
| `/app/allure-report` | Generated Allure HTML report |

---

## Framework-Specific Examples

### Playwright (TypeScript)

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
# entrypoint.sh for Pytest
#!/bin/sh
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

### Container Fails to Start
- Verify `entrypoint.sh` exists at `/app/entrypoint.sh`
- Check file permissions (`chmod +x`)
- Use Unix line endings — Windows CRLF will break shell scripts

### Tests Not Running
- Ensure tests read `BASE_URL` from `process.env.BASE_URL`
- Verify the folder argument matches your test directory structure

### Reports Not Collected
- Reports must be written to `/app/<report-folder>`
- Wait for execution to reach `PASSED` or `FAILED` before checking for reports

---

## Related

- [Quick Start →](../getting-started/quick-start)
- [Playwright Reporter →](./playwright-reporter)
- [GitHub Actions →](./github-actions)
