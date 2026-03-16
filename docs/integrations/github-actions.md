---
id: github-actions
title: GitHub Actions & CI/CD
sidebar_position: 2
---

# GitHub Actions & CI/CD Integration

Trigger Agnox test runs from any CI/CD pipeline using the REST API and an API key. This guide covers GitHub Actions — the same pattern applies to GitLab CI, Azure DevOps, Jenkins, and any other CI system.

---

## Prerequisites

1. Generate an API key in **Settings → Profile → API Access**.
2. Add it as a secret in your CI provider (e.g., `AGNOX_API_KEY`).
3. Find your **Project ID** in **Settings → Run Settings → Execution Defaults**.

---

## Option A: Trigger Agnox Hosted Run

Let Agnox provision a Docker container and run your tests on its infrastructure:

```yaml
name: E2E Tests via Agnox
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Agnox Test Run
        run: |
          curl -X POST https://api.agnox.dev/api/ci/trigger \
            -H "Content-Type: application/json" \
            -H "x-api-key: ${{ secrets.AGNOX_API_KEY }}" \
            -d '{
              "projectId": "${{ secrets.AGNOX_PROJECT_ID }}",
              "image": "your-dockerhub-user/my-tests:latest",
              "folder": "tests/e2e",
              "config": {
                "environment": "staging",
                "baseUrl": "${{ secrets.TARGET_URL }}"
              },
              "ciContext": {
                "source": "github",
                "repository": "${{ github.repository }}",
                "prNumber": ${{ github.event.number || 0 }},
                "commitSha": "${{ github.sha }}"
              }
            }'
```

The endpoint returns `{ cycleId, taskId, status: "PENDING" }`. The cycle appears immediately in **Test Cycles** with a name derived from the repository and PR number.

---

## Option B: External CI with Playwright Reporter

Run tests in your own GitHub Actions environment and stream results to Agnox — no Docker image required:

```yaml
name: E2E Tests (External CI)
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
      - run: npm run build -w @agnox/playwright-reporter
      - run: npx playwright install --with-deps
      - name: Run Playwright tests
        env:
          AGNOX_API_KEY:    ${{ secrets.AGNOX_API_KEY }}
          AGNOX_PROJECT_ID: ${{ secrets.AGNOX_PROJECT_ID }}
        run: npx playwright test
```

See [Native Playwright Reporter →](./playwright-reporter) for configuration details.

---

## Required Secrets

| Secret | Description |
|--------|-------------|
| `AGNOX_API_KEY` | Your Agnox API key (Settings → Profile → API Access) |
| `AGNOX_PROJECT_ID` | Your project ID (Settings → Run Settings) |
| `TARGET_URL` | *(Optional)* The base URL of the application under test |

---

## Smart PR Routing

Enable **Smart PR Routing** in **Settings → Features** to have Agnox automatically determine which test folder to run based on the files changed in a push.

When configuring the webhook URL, append `&projectId=<projectId>` to ensure the correct project's run settings are used — this is **highly recommended** for multi-project organizations:

```
https://api.agnox.dev/api/webhooks/ci/pr?token=<orgId>&projectId=<projectId>
```

Without `projectId`, the endpoint falls back to the oldest project in the organization. See [Smart PR Routing →](../ai-capabilities/pr-routing) for full webhook setup instructions.

---

## Related

- [Playwright Reporter →](./playwright-reporter)
- [Smart PR Routing →](../ai-capabilities/pr-routing)
- [API Reference →](../api-reference/api-overview)
