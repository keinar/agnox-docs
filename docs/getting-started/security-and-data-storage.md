---
id: security-and-data-storage
title: Security & Data Storage
sidebar_position: 4
description: Where Agnox stores test results, logs and artifacts for External CI and Agnox Hosted runs, how long they are kept, and how keys and secrets are protected.
---

# Security & Data Storage

This page explains what Agnox receives from your test runs, where it is stored, how long it is kept, and how keys and secrets are protected. It covers both ways of running tests:

- **External CI**: your tests run in your own CI pipeline or on your laptop, and [`@agnox/playwright-reporter`](../integrations/playwright-reporter) streams the results to Agnox.
- **Agnox Hosted**: Agnox pulls your Docker image and runs the tests in a container on Agnox infrastructure. See [Docker Container Setup](../integrations/docker-setup).

---

## At a Glance

| | **External CI** (Playwright Reporter) | **Agnox Hosted** (Docker container) |
|---|---|---|
| **Where your code lives** | In your repository and CI runner. The reporter doesn't upload your repository or test files. | In the Docker image you build and push to your registry. Agnox pulls it to run it. |
| **Where tests execute** | Your CI runner or laptop | An Agnox worker, in a short-lived container that is removed after the run |
| **What is sent to Agnox** | Test titles, spec file paths, statuses, durations, error messages, test-step titles, stdout/stderr lines, CI metadata (repository, branch, commit SHA, PR number, job URL), failure context when enabled, and attachments of failed tests by default | Your image (pulled from your registry) and the project settings and environment variables you configure. Agnox keeps the run's console output, the JSON results and the report and artifact folders it copies out of the container |
| **Transport** | HTTPS to `https://api.agnox.dev` (or the `baseUrl` you configure), authenticated with an API key | Agnox pulls the image from your registry. Results are produced and stored inside Agnox infrastructure |
| **Where results are stored** | Agnox's MongoDB database, scoped to your organization | Same |
| **Where reports and artifacts are stored** | Files on the Agnox server's report volume, under a folder per organization and run | Same |
| **Encryption and AI keys** | Secrets (AI provider keys, integration tokens, secret environment variables) are encrypted at rest with AES-256-GCM. AI features run only on your own provider key (BYOK). | Same. Per-run environment variables are encrypted in the job queue and masked before they are written to the database |

---

## Test Results and Logs

Every run is stored as an **execution record** in Agnox's MongoDB database. The record holds the run status, timings, per-test results (title, file, status, duration, error message, steps), the console output, failure context and CI metadata. Test cases, test cycles and analytics data are stored in the same database.

**Tenant isolation.** Every record carries the `organizationId` of the organization that owns it. Agnox reads the organization from your login session or API key and filters every database query by it, so one organization can never read another organization's runs, results or files.

**Agnox operator access.** A small set of designated Agnox platform operators can view an organization for support. This view is read-only: the API rejects every request that would change data, and each viewing session is recorded in an audit log. Permanent deletion of an organization (its database records and its report folder) is done by an operator on request.

**Live data.** While a run is in progress, live log lines and in-flight results are held in Redis. They are deleted when the run finishes. Unfinished reporter sessions expire after 24 hours in Redis, and their session records are removed from the database after 7 days.

**Secrets in output.** On hosted runs, the values of your project's secret environment variables are redacted from the console output before it is stored or streamed. The run configuration is stored with environment variable values masked.

---

## Reports and Artifacts

Reports (Playwright HTML, Allure), screenshots, videos and traces are stored as **files on a volume on the Agnox server**, in a folder per organization and run:

```
<reports volume>/<organizationId>/<runId>/
```

They are not stored in the database or in third-party object storage.

**Access.** Report files are served only to a signed-in member of the owning organization, or with a short-lived report token: signed with HMAC, valid for **5 minutes** and limited to one run. A request for another organization's folder is refused.

### External CI uploads

The reporter uploads the files Playwright attaches to a test. You choose which tests with the `uploadArtifacts` option:

| `uploadArtifacts` | What is uploaded |
|---|---|
| `'failed-only'` (default) | Attachments of failed and timed-out tests |
| `'all'` | Attachments of every test |
| `'none'` | Nothing. Results and logs are still reported, but no files leave your CI |

The API accepts only `.png`, `.jpg`, `.jpeg`, `.webp`, `.webm`, `.mp4`, `.zip` (traces), `.md`, `.txt` and `.json` files. It checks that each file's content matches its extension, and limits uploads to **25 MB per file**, **150 MB per run** and **1,000 files per run**.

:::caution Playwright traces contain source code
A Playwright trace (`trace.zip`) can include the source of the test files that ran, plus page snapshots and network requests. If test source must not leave your CI, turn traces off or set `uploadArtifacts: 'none'`.
:::

**Failure context.** When your tests import `test` from `@agnox/playwright-reporter`, failed tests also send the page URL and title, page and console errors, failed network requests, an ARIA snapshot of the page (up to 8 KB) and up to 50 test-id values. Agnox uses this for AI root-cause analysis and locator suggestions. Passing tests send none of it.

### Agnox Hosted runs

After the container exits, Agnox copies the report and result folders out of it (`playwright-report`, `allure-results`, `test-results` and the JSON results). Each folder copied out of a run is capped at **250 MB**, and a larger folder is skipped with a warning in the run log. The container is then removed.

---

## Retention and Storage Quotas

A daily cleanup job (01:30 UTC) deletes runs older than your plan's retention period, together with their reports and artifacts. It also deletes runs your team has deleted from the dashboard.

| Plan | Run & artifact retention | Storage quota |
|---|---|---|
| Free | 7 days | 1 GB |
| Starter | 14 days | 5 GB |
| Team | 30 days | 15 GB |
| Business | 90 days | 50 GB |
| Enterprise | Custom | Custom |

- Runs still in progress are never removed. The sample data you can load from the quickstart doesn't expire.
- A run from the current month that has expired or been deleted loses its logs, results and files right away. A small stub with no test data stays until the month ends, so deleting runs doesn't reset your monthly run quota.
- Test cases, test cycles and project settings are not subject to run retention.
- When your organization's storage quota is used up, new runs are refused and the reporter stops uploading files. Results already stored are not affected.

---

## Agnox Hosted: What Persists and What Doesn't

| Ephemeral (removed after the run) | Persists (until retention removes it) |
|---|---|
| The test container and its filesystem | The execution record: status, results, console output, masked configuration |
| Plain-text environment variable values inside the container | Reports and artifacts copied out of the container |
| Live log stream (Redis) | Your project's environment variables, stored encrypted in the project settings until you delete them. The run record keeps only their names, with values masked |

The image Agnox pulls stays in the worker's local Docker image cache, which makes later runs start faster. The cache is cleared whenever the platform is redeployed.

Hosted test containers run with all Linux capabilities dropped, `no-new-privileges`, a process limit and memory and CPU limits. Platform secrets (database, queue and signing credentials) are never passed into the container. Only the variables you configure for the project or run are.

---

## AI and Your Data

- **Your key only (BYOK).** Every AI request runs on your organization's own Gemini, OpenAI or Anthropic key. There is no platform-provided fallback key: until an admin saves a key, AI features are off. See [AI Configuration & BYOK](../ai-capabilities/configuration).
- **Encrypted at rest.** Provider keys are encrypted with **AES-256-GCM**. They are never shown again, logged or returned by the API, and are decrypted only for the AI call made on your behalf.
- **Redaction.** Before any prompt is sent, Agnox removes recognizable secrets (private keys, tokens, passwords) and the exact values of your project's secret environment variables. If the secret lookup fails, the AI call is refused rather than sent unredacted.
- **No training by Agnox.** Agnox doesn't train models on your data. AI requests go to your provider under your own account, so your provider's data-use terms for that account apply.

---

## Keys, Tokens and Secrets

| Item | How it is handled |
|---|---|
| **API keys** (reporter, CI, CLI, MCP) | Shown once at creation. Stored only as an HMAC-SHA256 hash, never in plain text. Each key belongs to one organization. |
| **Invitation tokens** | Stored as a SHA-256 hash for lookup, plus an AES-256-GCM encrypted copy. They expire after 7 days by default. |
| **Report tokens** | HMAC-signed, valid for 5 minutes, scoped to a single run |
| **Integration secrets** (Jira, Linear and monday.com tokens, outgoing webhook signing secret, Slack webhook URL) | Encrypted at rest with AES-256-GCM |
| **Project secret environment variables** | Encrypted at rest with AES-256-GCM, encrypted again in the job queue, redacted from run output and masked in stored run configuration |

Encryption at rest applies to these secrets. Run results, logs and report files are protected by tenant isolation and access control, not by application-level encryption.

---

## Self-Hosting

Teams with strict data-residency requirements can run Agnox on their own infrastructure with Docker Compose. The stack runs the API, worker, dashboard, Redis and RabbitMQ, and uses a MongoDB database you provide. Point the reporter, [CLI](../developer-tools/cli) and [MCP server](../developer-tools/mcp-server) at your own API with `baseUrl` / `AGNOX_API_URL`. Contact the Agnox team for deployment guidance.

---

## Related

- [Quick Start →](./quick-start)
- [Native Playwright Reporter →](../integrations/playwright-reporter)
- [Docker Container Setup (Agnox Hosted) →](../integrations/docker-setup)
- [AI Configuration & BYOK →](../ai-capabilities/configuration)
- [Organization, Plans & Quotas →](../core-features/organization)
