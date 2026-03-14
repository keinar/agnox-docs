---
id: linear
title: Linear
sidebar_position: 8
---

# Linear Integration

Connect Agnox to Linear to create issues directly from failed test executions — either manually from the Investigation Hub or automatically via the AI Auto Bug modal.

:::info Bidirectional traceability
When a Linear issue is created from an execution, its URL is stored in `execution.linearIssues[]`. This lets you navigate from Linear back to the full test log and AI analysis in Agnox.
:::

---

## Capabilities

| Feature | Description |
|---------|-------------|
| **Manual issue creation** | Create a Linear issue from any execution in the Investigation Hub |
| **AI-assisted bug reports** | Pre-fill issue title and description from the Auto Bug modal |
| **Execution linkage** | Issue URLs persisted on the execution record (`linearIssues[]`) |
| **Team & project routing** | Configure a default team and project for all created issues |

---

## Prerequisites

- A Linear account with **Member** or **Admin** role.
- A Linear **API key** (personal or OAuth token).
- The **Team ID** and optionally a **Project ID** for issue routing.

---

## Step 1 — Generate a Linear API Key

1. In Linear, go to **Settings → API → Personal API keys**.
2. Click **Create key**, give it a label (e.g. `Agnox`), and copy the generated token.

:::tip Use a service account
For team environments, create a dedicated Linear bot user and generate the key under that account so it isn't tied to any individual.
:::

---

## Step 2 — Find Your Team ID

1. In Linear, open **Settings → Workspace → Teams**.
2. Click on your team and look at the URL: `linear.app/<workspace>/settings/teams/<TEAM_ID>`.
3. Copy the `TEAM_ID` portion.

---

## Step 3 — Configure in Agnox

1. In the Agnox dashboard, go to **Settings → Connectors**.
2. Find the **Linear** card and click **Configure**.
3. Fill in the fields:

| Field | Value |
|-------|-------|
| **API Key** | The personal token from Step 1 |
| **Team ID** | From Step 2 |
| **Project ID** | *(Optional)* Scope issues to a specific Linear project |
| **Default Priority** | `No Priority` / `Urgent` / `High` / `Medium` / `Low` |

4. Click **Save**. The card will show a **Connected** badge once validated.

---

## Creating Issues from Executions

### From the Investigation Hub

1. Open any `FAILED` or `ERROR` execution.
2. Click the **Create Linear Issue** button in the toolbar.
3. A modal pre-fills the title with the test name and the description with the failure summary.
4. Edit as needed and click **Submit**.

### From the AI Auto Bug Modal

1. Run **Auto Bug** on a failed execution (✨ icon in the execution drawer).
2. Review the AI-generated summary.
3. Click **Submit to Linear** — the issue is created and the URL is saved back to the execution.

---

## Troubleshooting

| Error | Likely Cause |
|-------|-------------|
| `401 Unauthorized` | Invalid or expired API key |
| `Team not found` | Incorrect Team ID — check the URL in Linear settings |
| `Project not found` | The Project ID doesn't belong to the specified team |

---

## Related

- [Auto Bug →](../ai-capabilities/auto-bug)
- [Jira →](./jira)
- [Webhooks →](./webhooks)
