---
id: agnox-hosted
title: Agnox Hosted
sidebar_position: 1.5
description: Run your test suite on Agnox-managed workers from a Docker image, and how it compares with reporting from your own CI.
---

# Agnox Hosted

Agnox runs tests in one of two execution models:

- **External CI**: your tests run in your own pipeline (GitHub Actions, GitLab CI, Jenkins and others) or on a laptop, and [`@agnox/playwright-reporter`](./playwright-reporter) streams the results to Agnox.
- **Agnox Hosted**: Agnox runs your tests for you, on its own workers.

This page explains Agnox Hosted and helps you choose between the two.

---

## What Is Agnox Hosted

Agnox Hosted is managed test execution inside Agnox. You package your test project as a Docker image once. Agnox then pulls the image, starts a container for each run, injects your environment URL and environment variables, streams the console output live to the dashboard, and collects reports and artifacts when the container exits.

You do not run CI runners, worker machines or job queues for your tests. You do maintain the Docker image of your test project, and the [Agnox CLI](./docker-setup#option-1-agnox-cli-recommended) generates the `Dockerfile` and `entrypoint.sh`, builds a multi-arch image and pushes it for you:

```bash
npx @agnox/agnox-cli@latest init
```

Agnox runs whatever command your image's `entrypoint.sh` runs, so Agnox Hosted is not limited to Playwright. The [Docker setup guide](./docker-setup#framework-examples) has examples for Playwright, Pytest and Cypress.

You can start a hosted run from:

- the dashboard (**Run Test**)
- a CRON schedule, or a schedule's **Run Now** action
- the CI trigger API, `POST /api/ci/trigger`
- the [`agnox trigger`](../developer-tools/cli#agnox-trigger) CLI command
- the [Smart PR Routing](../ai-capabilities/pr-routing) webhook
- a [Test Cycle](../core-features/test-cycles) that includes automated items

---

## External CI vs. Agnox Hosted

| | **External CI** | **Agnox Hosted** |
|---|---|---|
| **Where tests run** | Your own runners: GitHub Actions, GitLab CI, Jenkins, Azure DevOps, Bitbucket Pipelines, or a laptop | Agnox-managed workers, in a container started from your Docker image |
| **Setup required** | Add `@agnox/playwright-reporter` to `playwright.config.ts` and set an API key and project ID | A Docker image of your tests, connected in **Settings → Run Settings**, plus environment URLs and variables in Agnox |
| **Private network, VPN or hardware access** | Yes. Tests reach whatever your runner can reach | No. Containers reach only what Agnox's infrastructure can reach. For private targets use External CI or [self-host Agnox](../getting-started/security-and-data-storage#self-hosting) |
| **Configuration and secrets** | Stay in your CI's secret store | Stored per project in **Settings → Env Variables**. Secret values are encrypted at rest and redacted from run output |
| **Scheduling and manual triggers** | Your CI's own triggers and cron | CRON schedules, **Run Test** and **Run Now** in the dashboard, the CI trigger API and the `agnox trigger` CLI command |
| **Concurrency and queues** | Set by your CI. Agnox does not limit concurrent External CI runs | Concurrent hosted runs are limited by your plan. Runs over the limit wait as `PENDING` and start as earlier runs finish |
| **Monthly quota** | **External CI Runs** | **Agnox Hosted Runs** |
| **Dashboard, history, flakiness detection and MCP** | Yes | Yes |

Both models record runs in the same dashboard and history, link results to test cases by the same stable test key, and feed the same stability tracking, quarantine and [MCP server](../developer-tools/mcp-server). The differences:

- Both have an **Artifacts** tab. Hosted runs also get an Allure report that Agnox generates. External CI runs upload artifacts with reporter 2.3.0 or later.
- External CI reporting is available for Playwright today. Agnox Hosted runs any framework your image's `entrypoint.sh` can start.
- Smart PR Routing starts hosted runs, and its test manifest is built from hosted runs.
- Runs the reporter sends from a developer machine are [Local runs](./playwright-reporter#local-vs-external-ci-runs) and are left out of metrics.

Plan limits for both quotas and for concurrency are listed in [Plans & Quotas](../core-features/organization#billing--plans).

---

## When to Choose Each Model

### Choose External CI when

- You already run your tests in a CI pipeline and want results, analytics and MCP in Agnox without changing where tests run.
- Your tests need a private network, a VPN, on-premise services or physical hardware.
- You want Agnox only for analytics, flakiness detection and MCP access.

### Choose Agnox Hosted when

- You have no CI infrastructure for tests and do not want to run any.
- You want to start runs and schedule suites directly from the dashboard.
- You want non-Playwright suites (for example Pytest) to run inside Agnox.

### Use both together

The two models work side by side in the same project. Each run is labeled with its source, and you can filter by it on the dashboard. A common setup:

- **Pull request checks** run in your existing CI with the Playwright reporter, so results sit next to the build.
- **Nightly regression and smoke suites** run on Agnox Hosted from a CRON schedule, with no pipeline to maintain.

---

## How to Get Started

1. **Build and push your test image.** Run `npx @agnox/agnox-cli@latest init`, or follow the manual steps in [Docker Container Setup](./docker-setup). Private registries (GHCR, AWS ECR, Google Artifact Registry) are supported.
2. **Connect the image to a project.** In **Settings → Run Settings**, select or create a project, enter the Docker image and test folder, and set the environment URLs. See [Configuring Your First Project](../getting-started/installation#configuring-your-first-project).
3. **Add environment variables and secrets.** In **Settings → Env Variables**, add the credentials and settings your tests read, and mark sensitive values as **Secret**. See [Environment Variables & Secrets](../getting-started/installation#environment-variables--secrets).
4. **Run the suite.** Click **Run Test** in the dashboard, or start a run from CI with the [CI trigger API](../core-features/executions#cicd-trigger) or [GitHub Actions](./github-actions#option-b-trigger-an-agnox-hosted-run).
5. **Schedule it.** Create a CRON schedule from the **Schedule Run** tab and manage it in **Settings → Schedules**. See [CRON Schedules](../core-features/scheduling).

---

## Related

- [Native Playwright Reporter (External CI)](./playwright-reporter)
- [Docker Container Setup](./docker-setup)
- [GitHub Actions & CI/CD](./github-actions)
- [CRON Schedules](../core-features/scheduling)
- [CI & Webhooks API](../api-reference/ci-and-webhooks)
- [Security & Data Storage](../getting-started/security-and-data-storage)
