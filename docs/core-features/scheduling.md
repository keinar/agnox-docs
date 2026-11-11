---
id: scheduling
title: CRON Schedules
sidebar_position: 4
---

# CRON Schedules

Automate recurring test runs on a schedule — no CI/CD pipeline required.

---

## Creating a Schedule

1. Click **Run** to open the Execution Modal.
2. Switch to the **Schedule Run** tab (top of the modal).
3. Fill in the standard run fields (project, environment, folder).
4. Enter a **Schedule Name** — this is used as the `groupName` for all triggered executions.
5. Enter or select a **CRON expression** (e.g., `0 2 * * *` = daily at 02:00 UTC). Use the preset buttons for common intervals.
6. Click **Save Schedule**.

The schedule is immediately registered in the live scheduler — no server restart needed.

---

## CRON Expression Reference

| Expression | Meaning |
|------------|---------|
| `0 * * * *` | Every hour |
| `0 2 * * *` | Every day at 02:00 UTC |
| `0 2 * * 1` | Every Monday at 02:00 UTC |
| `0 2 1 * *` | First day of every month at 02:00 UTC |
| `*/15 * * * *` | Every 15 minutes |

---

## Managing Schedules

Go to **Settings → Schedules** to see all CRON schedules for your organization:

| Column | Description |
|--------|-------------|
| **Name** | The schedule name / group name, with its test folder |
| **Schedule** | The CRON expression and target environment |
| **Next run** | When the schedule fires next (server time); `—` while paused |
| **Last run** | Status of the run it last started (e.g. PASSED / FAILED), or **NOT STARTED** when the run could not start (for example, the monthly run quota was reached — hover for the reason) |
| **Status** | **Active** / **Paused** switch |

Actions per schedule:

- **Pause / Resume** — the switch stops or restarts future runs without deleting the schedule (`PATCH /api/schedules/:id` with `isActive`).
- **Edit** — change the name, CRON expression, environment, test folder, Docker image and base URL. Invalid CRON expressions or folders are rejected with a message in the dialog.
- **Run Now** — starts one run immediately with the schedule's current settings (works while paused; quota limits apply) — `POST /api/schedules/:id/run-now`.
- **Delete** — asks for confirmation, then permanently removes the schedule and cancels future executions. Past executions are kept.

> **Note:** Users with the **Viewer** role see schedules read-only. Deleting a project also deletes its schedules.

---

## Triggered Execution Grouping

All executions triggered by a schedule share the same `groupName` (the schedule name). Use **Grouped View** on the dashboard to see all runs from a schedule together with a pass/fail summary across runs.

---

## Related

- [Running Executions →](./executions)
- [Slack Notifications →](../integrations/slack)
