---
id: jira
title: Jira
sidebar_position: 7
---

# Jira Integration

Connect Agnox to Jira to create bug tickets directly from failed test executions — complete with AI-generated summaries, log excerpts, and a direct link back to the Investigation Hub.

:::info Secrets are encrypted
Your Jira API token is stored encrypted with AES-256-GCM and is never returned in API responses or logs.
:::

---

## Capabilities

| Feature | Description |
|---------|-------------|
| **Manual ticket creation** | Create a Jira issue from any execution in the Investigation Hub |
| **AI pre-fill** | The Auto Bug modal generates a title and description you can review before submitting |
| **Issue type control** | Choose `Bug`, `Task`, or any custom issue type in your project |
| **Priority mapping** | Map Agnox severity to Jira priority levels |
| **Bidirectional link** | Jira issue key is stored on the execution for quick navigation |

---

## Prerequisites

- A Jira Cloud account (Jira Server/Data Center is not currently supported).
- **Project Admin** or **Create Issues** permission in the target project.
- A Jira **API token** linked to a user or service account.

---

## Step 1 — Generate a Jira API Token

1. Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
2. Click **Create API token**, give it a label (e.g. `Agnox`), and copy the token.

:::tip Service accounts
For production use, generate the token under a dedicated Jira service-account email. This prevents tickets from losing context if a team member leaves.
:::

---

## Step 2 — Find Your Jira Site URL and Project Key

- **Site URL**: `https://your-org.atlassian.net`
- **Project Key**: The 2–4 letter prefix shown on every Jira issue (e.g. `QA`, `PROJ`). Find it in **Project Settings → Details**.

---

## Step 3 — Configure in Agnox

1. In the Agnox dashboard, go to **Settings → Connectors**.
2. Find the **Jira** card and click **Configure**.
3. Fill in the fields:

| Field | Value |
|-------|-------|
| **Jira Site URL** | `https://your-org.atlassian.net` |
| **Email** | Email address of the token owner |
| **API Token** | Token from Step 1 |
| **Project Key** | e.g. `QA` |
| **Default Issue Type** | `Bug` (recommended) |

4. Click **Save**. The card shows a **Connected** badge after validation.

---

## Creating Tickets from Executions

### From the Investigation Hub

1. Open any `FAILED` or `ERROR` execution.
2. Click **Create Jira Ticket** in the toolbar.
3. A modal opens pre-filled with:
   - **Summary**: test name + failure type
   - **Description**: log excerpt + execution URL
4. Edit and click **Submit**.

### From the AI Auto Bug Modal

1. In the execution drawer, click the ✨ **Auto Bug** button.
2. Agnox generates a full bug report using the AI orchestrator.
3. Click **Submit to Jira** — the modal opens with the AI-generated content already in place.
4. Confirm and submit. The Jira issue key (e.g. `QA-123`) is saved to the execution record.

---

## Troubleshooting

| Error | Likely Cause |
|-------|-------------|
| `401 Unauthorized` | Wrong email/token combination |
| `403 Forbidden` | The user lacks *Create Issues* permission in the project |
| `Project not found` | Project key is incorrect — it is case-sensitive |
| `Field required` | Your Jira project has mandatory custom fields; contact support for field mapping |

---

## Related

- [Auto Bug →](../ai-capabilities/auto-bug)
- [Linear →](./linear)
- [Webhooks →](./webhooks)
