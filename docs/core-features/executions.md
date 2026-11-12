---
id: executions
title: Running & Managing Executions
sidebar_position: 1
---

# Running & Managing Executions

The execution engine is the heart of Agnox. This guide covers triggering test runs, monitoring live output, and managing your execution history at scale.

---

## Running Tests

### Option A: Via Dashboard (Recommended)

1. Click **Run Test** (top right of the dashboard).
2. Select your **Project** — settings are pre-filled from Run Settings.
3. Select the **Environment** (Development / Staging / Production).
4. *(Optional)* Override the folder path.
5. *(Optional)* Enter a **Group Name** — use the smart combobox to select an existing group (appends to it) or type a new name to create one.
6. Click **Start Execution**.

### Option B: Via API / CI/CD {#cicd-trigger}

Use `POST /api/ci/trigger` with an [API key](../api-reference/ci-and-webhooks#api-keys) to start an Agnox Hosted Run from a script or pipeline, and pass CI context for automatic naming and traceability:

```bash
curl -X POST https://api.agnox.dev/api/ci/trigger \
  -H "Content-Type: application/json" \
  -H "x-api-key: $AGNOX_API_KEY" \
  -d '{
    "projectId": "<your-project-id>",
    "image": "myorg/my-tests:latest",
    "command": "npx playwright test",
    "folder": "tests/e2e",
    "config": {
      "environment": "staging",
      "baseUrl": "https://staging.myapp.com"
    },
    "ciContext": {
      "source": "github",
      "repository": "myorg/my-repo",
      "prNumber": 42,
      "commitSha": "abc1234"
    }
  }'
```

By default the run is recorded under **Executions** only and the response is `{ taskId, status: "PENDING" }`. Add `"createCycle": true` to also create a Test Cycle for the run (the response then includes `cycleId`), or `"cycleId": "<existing cycle id>"` to add the run to an existing cycle in the same project.

**Find your Project ID:** Settings → Run Settings → select your project → copy the **Project ID** shown in the Execution Defaults section.

Full field reference: [CI & Webhooks API →](../api-reference/ci-and-webhooks). Each hosted run counts toward your plan's monthly **Agnox Hosted Runs** quota; runs reported by the Playwright Reporter count toward **External CI Runs**.

---

## Execution Status Lifecycle

```
PENDING → RUNNING → ANALYZING → PASSED / FAILED / UNSTABLE / ERROR
```

- **PENDING** — queued, waiting for a runner
- **RUNNING** — Worker has started the Docker container; logs are streaming
- **ANALYZING** — container has exited; AI root-cause analysis is in progress
- **PASSED / FAILED / UNSTABLE / ERROR** — terminal state

---

## Live Logs & Investigation Hub

Click any execution row to open the **Investigation Hub** side drawer. The drawer URL updates with `?drawerId=<taskId>` — these links can be copied and shared directly.

The drawer has three tabs:

| Tab | Content |
|-----|---------|
| **Terminal** | Live log stream with auto-scroll toggle and `.txt` download |
| **Artifacts** | Media gallery — screenshots, videos, and downloadable trace zips |
| **AI Analysis** | AI-powered root-cause analysis for failed tests ("Ask AI"), shown only when the organization has its own AI key (BYOK) |

> The **AI Analysis** tab is hidden when the execution status is `ERROR` — AI cannot effectively analyze platform or container launch errors.

### Artifacts of External CI Runs

Runs reported by `@agnox/playwright-reporter` (2.3.0 or later) have the same **Artifacts** tab as hosted runs. The reporter uploads the screenshots, videos and traces Playwright attached to failed tests to `POST /api/ingest/artifacts`, and Agnox stores them next to the artifacts of hosted runs.

| Rule | Value |
|------|-------|
| Which tests | Failed and timed-out tests by default (`uploadArtifacts: 'failed-only'`); `'all'` or `'none'` in the reporter options |
| File types | `.png`, `.jpg`, `.jpeg`, `.webp`, `.webm`, `.mp4`, `.zip` (traces), `.md`, `.txt`, `.json` — the content must match the extension |
| Per file | 25 MB |
| Per run | 150 MB |
| Storage | Every upload counts toward the organization's storage at once; when the quota is used up the API answers `429` and the reporter stops uploading for that run |
| Retention | Removed with the run by the daily retention cleanup |

---

## Organizing Executions

### Flat vs. Grouped Views

Use the **View** toggle (top-right of the execution list) to switch modes:

- **Flat View** — all executions in reverse-chronological order; best for reviewing recent activity
- **Grouped View** — executions aggregated by `groupName`; each group shows a pass/fail summary badge and the timestamp of the most recent run; click a group header to expand or collapse

Both views support the full filter bar (status, environment, date range) and pagination.

### Bulk Actions

Select one or more execution rows using the checkboxes. A floating **Bulk Actions** bar appears with:

| Action | Description |
|--------|-------------|
| **Assign Group** | Type a group name and apply it to all selected executions |
| **Ungroup** | Remove the `groupName` from selected executions |
| **Delete** | Soft-delete up to 100 executions in a single API call |

> Deleted executions are retained in the database for billing accuracy and excluded from all dashboard views.

---

## Environment Variables

Custom variables can be defined per-project in **Settings → Env Variables**:

- Encrypted at rest with AES-256-GCM
- Injected directly into the test container at runtime
- Mark values as **Secret** to redact them from streamed logs

---

## AI Root-Cause Analysis

When a test fails:

1. Click the execution row to open the Investigation Hub.
2. Switch to the **AI Analysis** tab.
3. The two-step pipeline generates a diagnosis:
   - **Analyzer** — generates a structured root-cause and suggested fix
   - **Critic** — validates every claim against raw logs, eliminating hallucinations
4. The final output is clean, developer-facing Markdown.

**AI Model Artifact Persistence:** The specific `aiModel` used for the analysis is recorded as an immutable artifact alongside the execution, ensuring you always know which model generated the diagnosis, even if the organization's default model changes later.

AI analysis can be disabled per-organization in **Settings → Organization**.

---

## Auto-Quarantine & Quality Gate Bypass

**Auto-Quarantine** prevents flaky tests from blocking your CI/CD pipelines.

### How it Works
1. Every test result is linked to a test case by a **stable test key** (spec file path + test title path), the same for hosted runs and the Playwright reporter. Outcomes are tracked **per project**.
2. With Auto-Quarantine enabled for the project, a test whose **3 most recent runs all failed** is quarantined automatically.
3. In the **Test Cases** table, these tests appear with a **QUARANTINED** badge; automated tests are grouped in an **Automated** folder tree that mirrors your spec paths.
4. In the **Investigation Hub**, quarantined failures are dimmed and struck-through, and are not offered for AI analysis.

### Manual Quarantine
- Click **Quarantine** next to a failed (or retried) test in the Investigation Hub's **Tests** tab, or toggle it on the test case, to ignore its failures in future runs. Click **Un-quarantine** to lift it.
- Manual quarantines are never lifted automatically. After a manual release, only failures that happen afterwards count toward auto-quarantine.

### Quality Gate Bypass
For runs reported by `@agnox/playwright-reporter`, the run's final status (returned by `POST /api/ingest/teardown`) applies a smart quality gate:
- A **FAILED** run is reported as **PASSED** only when **every** failed, timed-out or skipped result belongs to a quarantined test **and** the server is certain it received every result (no lost event batch, result counts match the reporter's totals).
- A run that failed outside of tests (setup/teardown, no failed test) is never turned green.
- A test that was quarantined automatically leaves quarantine as soon as its latest run passes.

> **Note:** Auto-Quarantine must be enabled in **Settings → Run Settings** for each project. Manual quarantine works regardless of that setting.

---

## Related

- [Test Cases →](./test-cases)
- [Test Cycles →](./test-cycles)
- [Scheduling →](./scheduling)
- [Playwright Reporter →](../integrations/playwright-reporter)
