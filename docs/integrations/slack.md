---
id: slack
title: Slack Notifications
sidebar_position: 4
---

# Slack Notifications

Receive Slack messages whenever a test run completes — with AI analysis snippets and direct links to the Investigation Hub for failures.

---

## Setup

1. Go to **Settings → Connectors**.
2. Under the **Slack** card, paste your Slack **Incoming Webhook URL**.
3. Select which execution statuses should trigger notifications:
   - `PASSED`
   - `FAILED`
   - `ERROR`
   - `UNSTABLE`
4. Click **Save Webhook**.

---

## Getting a Slack Webhook URL

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app.
2. Enable **Incoming Webhooks** in the app settings.
3. Click **Add New Webhook to Workspace** and select the channel.
4. Copy the webhook URL (format: `https://hooks.slack.com/services/...`).

---

## Notification Content

| Execution Status | Notification includes |
|-----------------|----------------------|
| **PASSED** | Pass summary, execution link |
| **FAILED** | AI analysis snippet (truncated), direct Investigation Hub link |
| **ERROR** | Error summary, execution link |
| **UNSTABLE** | Instability summary, execution link |

---

## Other Connectors

The **Connectors** settings page also shows connection status for:
- **Jira** — create tickets directly from the Investigation Hub
- **GitHub** — CI context and PR linking
- **GitLab** — CI context and MR linking
- **Azure DevOps** — CI context

A **Connected** badge appears when valid credentials have been securely stored for each connector.

---

## Related

- [Scheduling →](../core-features/scheduling)
- [Running Executions →](../core-features/executions)
