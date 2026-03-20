---
id: test-cycles
title: Test Cycles & Manual Execution
sidebar_position: 3
---

# Test Cycles & Manual Execution

**Hybrid Test Cycles** unify manual and automated tests into a single workflow — with live result sync for automated items and an interactive step-by-step player for manual execution.

---

## Navigating Cycle Types

The Test Cycles page separates cycles into two tabs:

| Tab | What it shows |
|-----|--------------|
| **Manual Cycles** *(default)* | Cycles created via the "Create Cycle" drawer by your QA team |
| **CI / Automated** | Cycles generated automatically by CI/CD triggers — GitHub Actions, GitLab CI, PR webhooks, and any run carrying a `ciContext` |

> A cycle lands on the **CI / Automated** tab when it was triggered by an external CI system (i.e., the cycle carries a `ciContext` object or is explicitly flagged as `external-ci`). All other cycles appear under **Manual Cycles**.

The **+ Create Cycle** button is only visible on the **Manual Cycles** tab. CI cycles are generated automatically and cannot be created manually.

---

## Creating a Hybrid Cycle

1. Navigate to **Test Cycles** from the sidebar.
2. Select your **Project**.
3. Click **Create Cycle** to open the Cycle Builder drawer.
4. Enter a **Cycle Name**.
5. Select **Manual Tests** from the suite-grouped checklist.
6. *(Optional)* Enable **Include Automated Test Run** — requires Docker image and base URL to be configured in Settings → Run Settings.
7. Click **Launch Cycle**.

> When launched, **AUTOMATED items** are immediately pushed to RabbitMQ for execution. **MANUAL items** remain `PENDING` until a QA engineer executes them.

---

## Viewing Cycle Details

Click any cycle row in the table to expand and see all its items:

| Item Type | What You See |
|-----------|-------------|
| **AUTOMATED** | Status badge + execution ID (links to Investigation Hub) |
| **MANUAL** | Status badge + **Execute** button |

---

## Manual Execution Player

1. Click **Execute** on a MANUAL item.
2. The Manual Execution drawer opens, displaying each step as an interactive checklist.
3. Click **Pass**, **Fail**, or **Skip** on each step.
4. Steps auto-advance to the next pending item.
5. Click **Complete Test** to submit results.

> The cycle status automatically transitions to **COMPLETED** when all items — both manual and automated — reach a terminal state.

**Re-marking steps:** While a cycle is `RUNNING`, QA engineers can re-open a completed manual item and change step results. Once a cycle reaches `COMPLETED`, it becomes read-only.

---

## Deleting a Cycle

Click the delete icon on any cycle row and confirm the dialog.

- If the cycle is **RUNNING**, deletion is blocked (`409 Conflict`) — wait for completion or let the automated items finish first.
- **PENDING** and **COMPLETED** cycles are permanently deleted.

---

## CI/CD Trigger Integration

You can create a test cycle directly from your CI pipeline using `POST /api/ci/trigger`. The cycle appears in **Test Cycles** with a name derived from the repository and PR number (e.g., `myorg/my-repo #42`).

See [Running & Managing Executions →](./executions#option-c-cicd-trigger) for the full request format.

Triggered cycles automatically appear on the **CI / Automated** tab.

---

## Related

- [Test Cases →](./test-cases)
- [Executions →](./executions)
