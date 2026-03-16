---
id: pr-routing
title: Smart PR Routing
sidebar_position: 5
---

# Smart PR Routing

Automatically trigger targeted test runs when code is pushed to your repository — routing only the **relevant test folder** based on the changed files.

> **Requires:** `prRouting` feature flag enabled in **Settings → Features**.

---

## How It Works

When a **push** or **pull_request** event is received:

1. The webhook payload's changed files are extracted — supports `commits[].modified/added/removed` (push), custom `changedFiles[]`, and PR payloads.
2. **CI context** (branch, commit SHA, PR URL) is extracted robustly from both event types with automatic fallbacks (`body.ref`, `body.after`, `body.head_commit.url`).
3. If a **test manifest** (`projectTestStructures`) exists for the organization, the LLM uses it for precise file-to-test mapping. Otherwise, it falls back to folder-level heuristics.
4. A test execution is automatically dispatched to RabbitMQ using your project's Run Settings.
5. The webhook response includes `{ taskId, targetFolder, reasoning, dispatchedAt }` — the `reasoning` field explains why that folder was selected.

---

## GitHub Setup

1. Go to **Settings → Run Settings** and enable the **Smart PR Routing** toggle.
2. Copy the **Webhook URL** displayed in the callout:
   ```
   https://api.agnox.dev/api/webhooks/ci/pr?token=<orgId>&projectId=<projectId>
   ```
3. In **Settings → Run Settings**, generate or enter a **Webhook Secret** and save it. This secret is used to sign every GitHub delivery.
4. In your **GitHub** repository, go to **Settings → Webhooks → Add webhook**:
   - **Payload URL:** paste the copied URL
   - **Content type:** `application/json`
   - **Secret:** paste the same **Webhook Secret** from step 3
   - **Events:** select **Just the push event**
   - Click **Add webhook**

### HMAC Signature Verification

Every inbound push event is validated using enterprise-grade **`X-Hub-Signature-256`** HMAC verification before any processing occurs:

1. GitHub signs the raw request body with your Webhook Secret using HMAC-SHA256.
2. The Agnox backend computes the expected signature server-side using the stored (encrypted) secret.
3. The computed signature is compared using a **constant-time equality check** to prevent timing attacks.
4. Requests without a valid `X-Hub-Signature-256` header, or with a mismatched signature, are rejected with `401 Unauthorized` — no task is dispatched.

> **Setup requirement:** The `webhookSecret` field must be set in **Settings → Run Settings** and configured identically in the GitHub webhook form. Deliveries will be rejected until both sides match.

---

## GitLab Setup

1. In your **GitLab** project, go to **Settings → Webhooks**.
2. Paste the Webhook URL in the **URL** field.
3. Under **Trigger**, check **Push events**.
4. Click **Add webhook**.

---

## Project Targeting (`?projectId=`)

For organizations with **multiple projects**, append `?projectId=<projectId>` to the webhook URL:

```
https://api.agnox.dev/api/webhooks/ci/pr?token=<orgId>&projectId=<projectId>
```

This parameter is **highly recommended** whenever your organization contains more than one project. Without it, the endpoint falls back to the oldest project in the organization, which will fetch incorrect run settings (docker image, target URLs, environment variables) for the repository triggering the webhook.

Find your Project ID in **Settings → Run Settings → Execution Defaults** or in the URL bar when a project is selected in the dashboard.

> **Tip:** Combine `projectId` with other query parameters for a fully explicit URL:
> ```
> https://api.agnox.dev/api/webhooks/ci/pr?token=<orgId>&projectId=<projectId>&env=staging&groupName=PR-Checks
> ```

---

## Environment Pinning (`?env=`)

Append `?env=prod|staging|dev` to the webhook URL to pin the target environment:

```
https://api.agnox.dev/api/webhooks/ci/pr?token=<orgId>&env=staging
```

When provided, the execution uses the matching target URL from your Run Settings. If the parameter is omitted or the specified URL is not configured, the system falls back to the legacy auto-detection chain (staging → dev → prod).

---

## Execution Grouping (`?groupName=`)

Append `?groupName=<My-Group>` to the webhook URL to link the Smart PR executions to a specific Execution Group:

```
https://api.agnox.dev/api/webhooks/ci/pr?token=<orgId>&groupName=PR-Checks
```

Linking Smart PR executions to an Execution Group is **highly recommended**, as it enables the Smart PR runs to participate natively in the **Flakiness Detective** and **Auto-Quarantine** mechanisms. For example, if a test was quarantined in previous runs under the specified group, the Smart PR will gracefully bypass the failure and keep the PR green.

If omitted, the group name defaults to `'Smart-PR-Run'`.

---

## Test Manifest Seeding

If you have seeded your project's test structure via the `projectTestStructures` collection, the LLM prompt dynamically incorporates the full manifest for precise file-to-test routing (e.g., mapping `src/auth/login.ts` → `tests/auth/login.spec.ts`). Without a manifest, the LLM uses generic folder heuristics.

---

## Webhook Response

```json
{
  "taskId": "abc123",
  "targetFolder": "tests/api",
  "reasoning": "Changed files include API route handlers; routing to API test folder.",
  "dispatchedAt": "2026-03-04T10:00:00.000Z"
}
```

---

## Related

- [AI Configuration & BYOK →](./configuration)
- [GitHub Actions Integration →](../integrations/github-actions)
- [Running Executions →](../core-features/executions)
