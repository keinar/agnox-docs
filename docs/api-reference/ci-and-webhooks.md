---
id: ci-and-webhooks
title: CI & Webhooks API
sidebar_position: 2
---

# CI & Webhooks API

The endpoints you use to connect Agnox to your CI/CD pipelines and Git provider: **API keys**, the **CI trigger** for Agnox Hosted Runs, the **Smart PR Routing webhook**, and **listing executions**.

> Running Playwright in your own CI? The [Playwright Reporter](../integrations/playwright-reporter) calls the ingest API for you — you don't need any of the calls below except creating an API key.

All responses use the standard envelope `{ "success": boolean, "data"?: ..., "error"?: string }`. Base URL: `https://api.agnox.dev`.

---

## API Keys

API keys authenticate CI pipelines and scripts. Send them in the `x-api-key` header:

```
x-api-key: pk_live_<your-key>
```

Keys have the format `pk_live_` followed by 32 characters, belong to the user who created them, act within that user's organization, and are **shown only once** — store them in your CI secret store (e.g. `AGNOX_API_KEY`).

The easiest way to create a key is **Settings → Profile → API Access**. The same is available over the API; these endpoints require a logged-in dashboard session (JWT) — an API key cannot create, list or revoke keys.

### POST `/api/auth/api-keys`

Create a key.

```bash
curl -X POST https://api.agnox.dev/api/auth/api-keys \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "GitHub Actions" }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | A label for the key (max 100 characters) |

**Response (201 Created)**

```json
{
  "success": true,
  "message": "API key created. Store this key securely - it will not be shown again.",
  "apiKey": "pk_live_a1b2c3d4e5f6...",
  "data": {
    "id": "65f1c2...",
    "name": "GitHub Actions",
    "prefix": "pk_live_a1b2",
    "createdAt": "2026-03-01T10:00:00.000Z"
  }
}
```

### GET `/api/auth/api-keys`

List your keys (the full key is never returned).

```json
{
  "success": true,
  "data": [
    { "id": "65f1c2...", "name": "GitHub Actions", "prefix": "pk_live_a1b2", "createdAt": "2026-03-01T10:00:00.000Z", "lastUsed": "2026-03-02T08:15:00.000Z" }
  ]
}
```

### DELETE `/api/auth/api-keys/:id`

Revoke a key. Requests using it are rejected immediately.

---

## POST `/api/ci/trigger`

Start an **Agnox Hosted Run** of your test image from any CI system. Each call counts toward your plan's monthly **Agnox Hosted Runs** quota.

**Auth:** `x-api-key` (or `Authorization: Bearer <jwt>`)

```bash
curl -sS --fail-with-body -X POST https://api.agnox.dev/api/ci/trigger \
  -H "Content-Type: application/json" \
  -H "x-api-key: $AGNOX_API_KEY" \
  -d '{
    "projectId": "<your-project-id>",
    "image": "your-dockerhub-user/my-tests:latest",
    "command": "npx playwright test",
    "folder": "tests/e2e",
    "config": {
      "environment": "staging",
      "baseUrl": "https://staging.myapp.com",
      "envVars": { "FEATURE_FLAG_X": "on" }
    },
    "ciContext": {
      "source": "github",
      "repository": "myorg/my-repo",
      "prNumber": 42,
      "commitSha": "abc1234"
    }
  }'
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | Yes | Project ID (**Settings → Run Settings**) |
| `image` | string | Yes | Docker image to run — see [Docker Setup](../integrations/docker-setup) |
| `command` | string | Yes | Test command, e.g. `npx playwright test` |
| `folder` | string | No | Test folder passed to `entrypoint.sh` (default `all`) |
| `config` | object | Yes | Run configuration |
| `config.environment` | string | Yes | `development`, `staging` or `production` |
| `config.baseUrl` | string | No | Overrides the environment URL from Run Settings (injected as `BASE_URL`; must be a valid URL) |
| `config.envVars` | object | No | Extra environment variables for this run (string values) |
| `ciContext` | object | Yes | Where the run comes from |
| `ciContext.source` | string | Yes | `github`, `gitlab`, `azure`, `jenkins` or `webhook` (use `webhook` for any other CI, e.g. Bitbucket) |
| `ciContext.repository` | string | No | `owner/repo` |
| `ciContext.prNumber` | integer | No | Pull request number |
| `ciContext.commitSha` | string | No | Commit SHA |
| `createCycle` | boolean | No | Also create a Test Cycle for this run |
| `cycleId` | string | No | Add the run to an existing Test Cycle of the same project |

### Response (201 Created)

```json
{
  "success": true,
  "data": { "taskId": "run-1a2b3c4d", "status": "PENDING" }
}
```

With `createCycle` or `cycleId`, `data` also includes `cycleId`. Follow the run live in the dashboard or poll [`GET /api/executions`](#list-executions).

### Errors

| Status | Cause |
|--------|-------|
| 400 | Invalid payload (missing `projectId` / `image` / `command` / `config.environment` / `ciContext.source`, invalid folder path, invalid environment variables) or invalid cycle |
| 401 | Missing or invalid API key |
| 403 | Monthly **Agnox Hosted Runs** quota exceeded |
| 404 | Project or cycle not found in your organization |
| 429 | Rate limit exceeded, or storage limit reached |
| 503 | The run could not be queued — retry shortly |

---

## POST `/api/webhooks/ci/pr`

The **Smart PR Routing** webhook. Point your Git provider's push / pull-request webhook at it; Agnox maps the changed files to the affected tests and starts an Agnox Hosted Run. See [Smart PR Routing](../ai-capabilities/pr-routing) for setup.

```
https://api.agnox.dev/api/webhooks/ci/pr?token=<organization-id>&projectId=<project-id>&env=staging
```

### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `token` | Yes | Your organization ID (identifies the organization — it is **not** a credential) |
| `projectId` | Recommended | Project whose Run Settings are used |
| `env` | No | `prod`, `staging` or `dev` |
| `groupName` | No | Execution group for the run (default `Smart-PR-Run`) |

### Authentication

Every request must prove knowledge of your organization's **webhook secret** (**Settings → Run Settings → Smart PR Routing**, or [`/api/organization/webhook-secret`](./organizations)). Any one of:

| Method | Used by |
|--------|---------|
| `X-Hub-Signature-256` — HMAC-SHA256 of the raw body | GitHub (set the webhook **Secret**) |
| `X-Gitlab-Token` header | GitLab (set the **Secret token**) |
| `X-Agnox-Webhook-Token` header | Custom scripts and other CI systems |
| HTTP Basic auth with the secret as the password | Providers that only support Basic auth |

### Body

A GitHub or GitLab push / pull-request payload, or a custom body:

```json
{ "changedFiles": ["src/auth/login.ts", "src/cart/checkout.ts"] }
```

```bash
curl -X POST "https://api.agnox.dev/api/webhooks/ci/pr?token=$AGNOX_ORG_ID&projectId=$AGNOX_PROJECT_ID" \
  -H "Content-Type: application/json" \
  -H "X-Agnox-Webhook-Token: $AGNOX_WEBHOOK_SECRET" \
  -d '{ "changedFiles": ["src/auth/login.ts"] }'
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "taskId": "pr-...",
    "targetFolder": "tests/auth",
    "reasoning": "Changed files are in src/auth — running the auth suite.",
    "dispatchedAt": "2026-03-01T10:00:00.000Z"
  }
}
```

### Errors

| Status | Cause |
|--------|-------|
| 400 | Missing or invalid `token` |
| 401 | Missing or invalid webhook credential |
| 403 | No webhook secret configured, Smart PR Routing is disabled, or monthly **Agnox Hosted Runs** quota exceeded |
| 404 | Organization not found |
| 429 | Storage limit reached |

---

## List Executions

### GET `/api/executions`

List your organization's runs, newest first. Works with an API key — useful to poll the result of a triggered run.

```bash
curl -H "x-api-key: $AGNOX_API_KEY" \
  "https://api.agnox.dev/api/executions?limit=10&status=FAILED,ERROR"
```

| Parameter | Description |
|-----------|-------------|
| `limit` | 1–100 (default 25) |
| `offset` | Number of runs to skip (default 0) |
| `status` | Comma-separated statuses, e.g. `PASSED`, `FAILED,ERROR` |
| `environment` | Environment name, e.g. `staging` |
| `projectId` | Only runs of this project |
| `groupName` | Only runs of this execution group |
| `source` | `agnox-hosted` or `external-ci` |

**Response (200 OK)**

```json
{
  "success": true,
  "data": {
    "executions": [ { "taskId": "run-1a2b3c4d", "status": "PASSED", "...": "..." } ],
    "total": 128,
    "limit": 10,
    "offset": 0
  }
}
```

Runs older than your plan's retention window (7 / 14 / 30 / 90 days) are no longer returned.

---

## Related

- [API Overview →](./api-overview)
- [GitHub Actions & CI/CD →](../integrations/github-actions)
- [Playwright Reporter →](../integrations/playwright-reporter)
