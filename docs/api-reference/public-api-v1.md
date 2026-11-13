---
id: public-api-v1
title: Public API v1
sidebar_position: 6
---

# Public API v1

A stable API for integrations, scripts, the `agnox` CLI and the Agnox MCP server. Everything under `/api/v1` keeps its shape: fields are only ever added, and a breaking change ships as `/api/v2`.

## OpenAPI

| Format | URL |
|---|---|
| JSON | `https://api.agnox.dev/api/openapi.json` |
| YAML | `https://api.agnox.dev/api/openapi.yaml` |

The document is OpenAPI 3.1 and is generated from the same schemas that validate the routes, so it always matches the API. Import it into Postman, Insomnia or a client generator. Settings → My Profile → **API & integrations** links to both files.

## Authentication

Create an API key in **Settings → My Profile → API keys** and send it in the `x-api-key` header:

```bash
curl -H "x-api-key: $AGNOX_API_KEY" https://api.agnox.dev/api/v1/projects
```

`Authorization: Bearer <key>` also works. A key acts with the role of the person who created it, inside their organization:

| Role | Can |
|---|---|
| Viewer | Read everything below and export test cases |
| Developer, Admin | Also trigger runs, quarantine tests, sync and import test cases |

## Responses

Every response is `{ "success": true, "data": … }` or `{ "success": false, "error": "…", "code": "…" }`. Dates are ISO 8601 strings.

List endpoints take `limit` (1–100, default 25; larger values are clamped to 100) and `offset`, and return:

```json
{ "items": [], "total": 0, "limit": 25, "offset": 0, "hasMore": false }
```

| Status | `code` | Meaning |
|---|---|---|
| 400 | `INVALID_REQUEST` (or `UNKNOWN_FORMAT`, `INVALID_FILE`, `LIMIT_EXCEEDED`, `NOTHING_TO_IMPORT`) | The request is not valid |
| 401 | | Missing, invalid or revoked key |
| 403 | `FORBIDDEN`, `FEATURE_DISABLED` | The key's role may not do this, or the feature is off for the organization |
| 404 | `NOT_FOUND`, `NOTHING_TO_EXPORT` | Not found in your organization (another organization's ids are always 404) |
| 409 | `CONFLICT` | The cycle cannot take the run |
| 429 | | Rate limited |

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/projects` | Projects: `id`, `name`, `slug` |
| GET | `/api/v1/executions` | Runs, newest first. Filters: `projectId`, `status` (comma-separated) |
| POST | `/api/v1/executions` | Trigger a run. Same body as `POST /api/ci/trigger`. `201 { taskId, cycleId? }` |
| GET | `/api/v1/executions/{taskId}` | One run with its counts |
| GET | `/api/v1/executions/{taskId}/failures` | Failed tests with error, signature, file, test key, linked test case and page context |
| GET | `/api/v1/test-cases` | Test cases of a project. `projectId` (required), `folderPath`, `tags`, `quarantined` |
| GET | `/api/v1/test-cases/{id}` | One test case with steps. `id` is an id or a tcId such as `AG-TC-12` |
| POST | `/api/v1/test-cases/quarantine` | Quarantine or release a test, by `testCaseId` or by `projectId` + `testKey` |
| POST | `/api/v1/test-cases/sync` | Register automated tests from code as test cases |
| POST | `/api/v1/test-cases/export` | Export test cases as files (`{ files: [{ path, content }] }`) |
| POST | `/api/v1/test-cases/import` | Import test cases from a file (see [Import and export](./import-export.md)) |
| GET | `/api/v1/test-cycles` | Test cycles, newest first. Filter: `projectId` |
| GET | `/api/v1/test-cycles/{id}` | One cycle with its items |
| GET | `/api/v1/failure-clusters` | Most frequent failure signatures. `projectId`, `days` (1–30), `limit`. Needs Root Cause Analysis |
| GET | `/api/v1/quality/unstable-tests` | Quarantined tests and tests scored D or F. `projectId` (required) |

### Run summary

```json
{
  "taskId": "run-k3j2", "projectId": "665f…", "status": "FAILED",
  "environment": "staging", "trigger": "github", "groupName": "Nightly",
  "startTime": "2026-11-12T08:00:00.000Z", "endTime": "2026-11-12T08:04:10.000Z", "durationMs": 250000,
  "total": 120, "passed": 117, "failed": 3
}
```

### Failures

`GET /api/v1/executions/{taskId}/failures` returns the run's `taskId`, `projectId` and `items`:

```json
{
  "name": "checkout › pays with card",
  "file": "tests/checkout.spec.ts",
  "testKey": "4c1f…",
  "testCaseId": "6650…",
  "error": "TimeoutError: locator.click: Timeout 5000ms exceeded…",
  "failureSignature": "a1b2c3d4e5f6a7b8c9d0e1f2",
  "isQuarantined": false,
  "attemptCount": 2,
  "context": {
    "failureUrl": "https://shop.test/pay",
    "pageTitle": "Pay",
    "consoleErrors": ["…"],
    "networkErrors": [{ "url": "https://shop.test/api/pay", "status": 500, "method": "POST" }],
    "testIds": ["pay-button"],
    "domSnapshot": "<button data-testid=\"pay-button\">Pay</button>"
  }
}
```

`testIds` and `domSnapshot` are the locator context the Playwright reporter captured at the moment of failure, the input for repairing a broken locator.

### Quarantine

```bash
# By test key, from a failure (the test case is created if it has none yet)
curl -X POST -H "x-api-key: $AGNOX_API_KEY" -H "content-type: application/json" \
  https://api.agnox.dev/api/v1/test-cases/quarantine \
  -d '{"projectId":"665f…","testKey":"4c1f…","title":"checkout › pays with card","quarantined":true}'
```

### Sync test cases from code

`POST /api/v1/test-cases/sync` with `{ projectId, tests: [{ file, titlePath }] }` (at most 500) computes each test's key and makes sure an automated test case exists for it. An unlinked automated case with the same title is adopted before a new one is created. The response counts `received`, `created`, `alreadyLinked` and `skipped` (entries whose key cannot be computed).

## Tools built on this API

- **MCP server** for Claude Code, Cursor and Windsurf: `npx -y @agnox/mcp-server`
- **CLI**: `npx -p @agnox/mcp-server agnox --help`

See the [package README](https://www.npmjs.com/package/@agnox/mcp-server) for configuration.
