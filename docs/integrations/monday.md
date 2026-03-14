---
id: monday
title: Monday.com
sidebar_position: 9
---

# Monday.com Integration

Connect Agnox to Monday.com to automatically create board items and post execution status updates after every test run — keeping your project board in sync with your CI quality signal.

---

## Capabilities

| Feature | Description |
|---------|-------------|
| **Automatic item creation** | Creates a new item on your board when an execution fails |
| **Status updates** | Posts an update to an existing item when a re-run changes status |
| **Column mapping** | Maps Agnox execution fields to your board columns (status, date, URL) |
| **Configurable triggers** | Choose which statuses (`FAILED`, `ERROR`, `UNSTABLE`) create items |

---

## Prerequisites

- A Monday.com account with **Member** or **Admin** access to the target board.
- A Monday.com **API v2 token**.
- The **Board ID** for the board that will receive items.

---

## Step 1 — Generate a Monday API Token

1. In Monday.com, click your **avatar** (bottom-left) → **Administration** → **API**.
2. Under **API v2 Token**, click **Copy**. Store it securely.

:::info Token scope
Monday personal tokens have full access to all boards the user can see. Use a dedicated service account for team-wide integrations.
:::

---

## Step 2 — Find Your Board ID

1. Open the target board in Monday.com.
2. Look at the URL: `https://your-org.monday.com/boards/<BOARD_ID>`.
3. Copy the numeric `BOARD_ID`.

---

## Step 3 — Configure in Agnox

1. In the Agnox dashboard, go to **Settings → Connectors**.
2. Find the **Monday.com** card and click **Configure**.
3. Fill in the fields:

| Field | Value |
|-------|-------|
| **API Token** | The v2 token from Step 1 |
| **Board ID** | Numeric board ID from Step 2 |
| **Group ID** | *(Optional)* Pin new items to a specific group (e.g. `"this_week"`) |
| **Notify on** | Multi-select: `FAILED`, `ERROR`, `UNSTABLE` |

4. Click **Save**. The card displays a **Connected** badge after validation.

---

## What Gets Created

When a monitored execution finishes, Agnox calls the Monday GraphQL API and creates an item with these fields:

```
Item name:   [FAILED] My Test Suite — Run #42
Status col:  Failed
Date col:    2026-03-14
URL col:     https://app.agnox.dev/executions/<id>
```

If the same execution is later re-run and passes, Agnox posts an **update** (comment) on the existing item rather than creating a duplicate.

:::tip Column mapping
Agnox looks for columns named `Status`, `Date`, and `Link` by default. Rename your board columns to match, or contact support for custom column ID mapping.
:::

---

## Troubleshooting

| Error | Likely Cause |
|-------|-------------|
| `401 Unauthorized` | Token is invalid or expired |
| `Board not found` | Board ID is wrong, or the token's user doesn't have access |
| `Group not found` | The Group ID doesn't exist on that board — leave blank to use the default group |
| Items created but no status column | Board is missing a `Status` column — add one and retry |

---

## Related

- [Slack →](./slack)
- [MS Teams →](./ms-teams)
- [Webhooks →](./webhooks)
