---
id: ms-teams
title: Microsoft Teams
sidebar_position: 6
---

# Microsoft Teams Integration

Receive real-time CI notifications in any Microsoft Teams channel whenever a test execution completes. Agnox sends an **Adaptive Card** with execution status, summary stats, and a direct link to the Investigation Hub.

---

## Capabilities

| Feature | Description |
|---------|-------------|
| **Adaptive Card notifications** | Rich card layout with status badge, pass/fail counts, and action button |
| **Configurable triggers** | Choose which statuses send a notification (`PASSED`, `FAILED`, `ERROR`, `UNSTABLE`) |
| **Direct deep link** | One-click link from the Teams card to the Agnox execution drawer |
| **AI snippet** | Failed execution cards include a truncated AI analysis excerpt |

---

## Prerequisites

- **Microsoft Teams** with the ability to add **Incoming Webhooks** to a channel.
  *(Requires Teams Admin or channel owner permissions.)*

---

## Step 1 — Create an Incoming Webhook in Teams

1. In Microsoft Teams, navigate to the channel that should receive notifications.
2. Click **···** (More options) next to the channel name → **Connectors**.
3. Search for **Incoming Webhook** and click **Configure**.
4. Enter a name (e.g. `Agnox CI`) and optionally upload a logo.
5. Click **Create** and copy the generated webhook URL.

:::info Webhook URL format
The URL will look like:
```
https://your-org.webhook.office.com/webhookb2/...
```
Keep this URL confidential — anyone with it can post to your channel.
:::

---

## Step 2 — Configure in Agnox

1. In the Agnox dashboard, go to **Settings → Connectors**.
2. Find the **Microsoft Teams** card and click **Configure**.
3. Fill in the fields:

| Field | Value |
|-------|-------|
| **Webhook URL** | The URL copied from Step 1 |
| **Notify on** | Multi-select: `PASSED`, `FAILED`, `ERROR`, `UNSTABLE` |

4. Click **Save**. The card displays a **Connected** badge once validated.

---

## Notification Card Layout

A typical `FAILED` notification looks like this:

```
┌─────────────────────────────────────────┐
│ 🔴  Execution FAILED                     │
│  My Test Suite · Run #42                │
│                                          │
│  Tests:    45 passed · 3 failed          │
│  Duration: 4m 12s                        │
│                                          │
│  AI Summary: "NullPointerException in   │
│  checkout flow after cart update..."    │
│                                          │
│  [ View in Agnox → ]                    │
└─────────────────────────────────────────┘
```

:::tip Reduce noise
Select only `FAILED` and `ERROR` in **Notify on** to keep your channel focused on actionable signals, and use Slack for full status visibility.
:::

---

## Troubleshooting

| Error | Likely Cause |
|-------|-------------|
| `400 Bad Request` | Webhook URL is malformed or expired — regenerate it in Teams |
| No card appears | The **Notify on** list doesn't include the execution status that completed |
| Card shows but no AI snippet | The Auto Bug feature is disabled for your plan or not yet configured |

---

## Related

- [Slack →](./slack)
- [Webhooks →](./webhooks)
- [Running Executions →](../core-features/executions)
