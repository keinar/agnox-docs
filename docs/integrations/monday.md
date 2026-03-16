---
id: monday
title: Monday.com
sidebar_position: 9
---

# Monday.com Integration

Connect Agnox to Monday.com to create board items on demand from the Investigation Hub or the Auto-Bug Generator — keeping your project board in sync with your test failure triage workflow.

---

## Capabilities

| Feature | Description |
|---------|-------------|
| **On-demand item creation** | Create a board item from any failed execution via the Investigation Hub drawer or the Auto-Bug Generator |
| **Bidirectional linkage** | The resulting item ID and URL are written back to `execution.mondayItems[]` for traceability |

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

4. Click **Save**. The card displays a **Connected** badge after validation.

---

## What Gets Created

When you click **Create Monday Item** from the Investigation Hub drawer or the Auto-Bug Generator, Agnox calls the Monday GraphQL API (v2024-01) and creates an item with the execution's AI-generated bug report content. The resulting item ID and URL are stored on the execution (`mondayItems[]`) so you can navigate directly from the dashboard to the board item.

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
