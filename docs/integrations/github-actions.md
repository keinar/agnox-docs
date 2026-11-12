---
id: github-actions
title: GitHub Actions & CI/CD
sidebar_position: 2
---

# GitHub Actions & CI/CD Integration

There are two ways to connect a CI pipeline to Agnox. This guide uses GitHub Actions; the same pattern works on GitLab CI, Azure DevOps, Jenkins, Bitbucket Pipelines and any other CI system.

| | **Option A — External CI (Reporter)** | **Option B — Agnox Hosted Run** |
|---|---|---|
| Where tests run | In your CI job | In an Agnox container, from your Docker image |
| What you need | `@agnox/playwright-reporter` in your Playwright project | A Docker image of your tests ([Docker setup →](./docker-setup)) |
| Counts toward | **External CI Runs** | **Agnox Hosted Runs** |

---

## Prerequisites

1. Generate an API key in **Settings → Profile → API Access** (shown only once).
2. Add it as a CI secret, e.g. `AGNOX_API_KEY`.
3. Copy your **Project ID** from **Settings → Run Settings → Execution Defaults** and store it as `AGNOX_PROJECT_ID`.

| Secret | Description |
|--------|-------------|
| `AGNOX_API_KEY` | Your Agnox API key |
| `AGNOX_PROJECT_ID` | Your project ID |
| `TARGET_URL` | *(Option B, optional)* Base URL of the application under test |

---

## Option A: External CI with the Playwright Reporter

Run tests in your own job and stream results — plus screenshots, videos and traces of failed tests — to Agnox.

```bash
npm install -D @agnox/playwright-reporter
```

Add it to `playwright.config.ts` (see [Native Playwright Reporter →](./playwright-reporter)), then:

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
      - run: npx playwright install --with-deps
      - name: Run Playwright tests
        env:
          AGNOX_API_KEY:    ${{ secrets.AGNOX_API_KEY }}
          AGNOX_PROJECT_ID: ${{ secrets.AGNOX_PROJECT_ID }}
        run: npx playwright test
```

Branch, commit, PR number and the job link are detected automatically. Artifacts of failed tests upload by default (`uploadArtifacts: 'failed-only'`, 25 MB per file, 150 MB per run).

---

## Option B: Trigger an Agnox Hosted Run

Agnox pulls your image and runs the tests in its own container — your CI job only sends one request:

```yaml
name: E2E Tests via Agnox
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Agnox Test Run
        run: |
          curl -sS --fail-with-body -X POST https://api.agnox.dev/api/ci/trigger \
            -H "Content-Type: application/json" \
            -H "x-api-key: ${{ secrets.AGNOX_API_KEY }}" \
            -d '{
              "projectId": "${{ secrets.AGNOX_PROJECT_ID }}",
              "image": "your-dockerhub-user/my-tests:latest",
              "command": "npx playwright test",
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

The response is `201` with `{ "success": true, "data": { "taskId": "...", "status": "PENDING" } }`. The run is recorded under **Executions**; add `"createCycle": true` to also create a Test Cycle (the response then includes `cycleId`), or `"cycleId": "<id>"` to add it to an existing cycle.

The full request schema and error codes are in the [CI & Webhooks API →](../api-reference/ci-and-webhooks).

> Hosted runs above your plan's concurrency limit wait in the queue (`PENDING`) and start as earlier runs finish. When the monthly **Agnox Hosted Runs** quota is reached, the request is rejected until the next month or an upgrade.

---

## Smart PR Routing

Enable **Smart PR Routing** in **Settings → Features** to let Agnox pick the test folder to run from the files changed in a push or pull request. Point your repository's webhook at:

```
https://api.agnox.dev/api/webhooks/ci/pr?token=<organizationId>&projectId=<projectId>
```

`projectId` is **highly recommended** for organizations with several projects — without it the oldest project's run settings are used. Every delivery must be signed with (or carry) your **Webhook Secret** from **Settings → Run Settings**. See [Smart PR Routing →](../ai-capabilities/pr-routing) for GitHub, GitLab, Bitbucket and Azure DevOps setup.

---

## Related

- [Native Playwright Reporter →](./playwright-reporter)
- [Docker Container Setup →](./docker-setup)
- [Smart PR Routing →](../ai-capabilities/pr-routing)
- [CI & Webhooks API →](../api-reference/ci-and-webhooks)
