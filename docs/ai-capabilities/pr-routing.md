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
3. If a **test manifest** exists for the project, the AI uses it for precise file-to-test mapping. Otherwise, it falls back to folder-level heuristics.
4. A test execution is automatically queued using your project's Run Settings.
5. The webhook response includes `{ taskId, targetFolder, reasoning, dispatchedAt }` — the `reasoning` field explains why that folder was selected.

---

## GitHub Setup

1. Go to **Settings → Run Settings** and enable the **Smart PR Routing** toggle.
2. Copy the **Webhook URL** displayed in the callout:
   ```
   https://api.agnox.dev/api/webhooks/ci/pr?token=<orgId>&projectId=<projectId>
   ```
3. In **Settings → Run Settings**, click **Generate secret** (admins only) and copy the **Webhook Secret**. It is shown only once. If you lose it, rotate it to get a new one.
4. In your **GitHub** repository, go to **Settings → Webhooks → Add webhook**:
   - **Payload URL:** paste the copied URL
   - **Content type:** `application/json`
   - **Secret:** paste the same **Webhook Secret** from step 3
   - **Events:** select **Just the push event**
   - Click **Add webhook**

### HMAC Signature Verification

Every GitHub delivery is validated using **`X-Hub-Signature-256`** HMAC verification before any processing occurs:

1. GitHub signs the raw request body with your Webhook Secret using HMAC-SHA256.
2. The Agnox backend decrypts the stored secret and computes the expected signature over the same raw body.
3. The computed signature is compared using a **constant-time equality check** to prevent timing attacks.
4. Requests without a valid signature or token are rejected with `401 Unauthorized`, and no task is dispatched.

> **Setup requirement:** A webhook secret is mandatory. Organizations without one receive `403 Forbidden` on every delivery. The `token` URL parameter only identifies your organization and is not a credential.
>
> **Rotation:** Generating a new secret invalidates the previous one immediately, so update your webhooks right away.

---

## GitLab Setup

1. In your **GitLab** project, go to **Settings → Webhooks**.
2. Paste the Webhook URL in the **URL** field.
3. Paste your **Webhook Secret** in the **Secret token** field. GitLab sends it in the `X-Gitlab-Token` header, which Agnox compares in constant time.
4. Under **Trigger**, check **Push events**.
5. Click **Add webhook**.

---

## Bitbucket Setup

Bitbucket webhook payloads do **not** list changed files, so send the file list from a Bitbucket Pipelines step. Sign the body with the Webhook Secret (Agnox verifies `X-Hub-Signature`, the same format Bitbucket uses), or send the secret in `X-Agnox-Webhook-Token`:

```yaml
- step:
    name: Agnox Smart PR Routing
    script:
      - git fetch origin "$BITBUCKET_PR_DESTINATION_BRANCH"
      - FILES=$(git diff --name-only "origin/$BITBUCKET_PR_DESTINATION_BRANCH...HEAD" | jq -R . | jq -sc .)
      - |
        curl -sf -X POST "$AGNOX_PR_WEBHOOK_URL" \
          -H "Content-Type: application/json" \
          -H "X-Event-Key: pullrequest:updated" \
          -H "X-Agnox-Webhook-Token: $AGNOX_WEBHOOK_SECRET" \
          -d "{\"changedFiles\": $FILES, \"repository\": {\"full_name\": \"$BITBUCKET_REPO_FULL_NAME\"}, \"pullrequest\": {\"source\": {\"branch\": {\"name\": \"$BITBUCKET_BRANCH\"}, \"commit\": {\"hash\": \"$BITBUCKET_COMMIT\"}}}}"
```

Store `AGNOX_PR_WEBHOOK_URL` and `AGNOX_WEBHOOK_SECRET` as secured repository variables. The `X-Event-Key` header labels the run as **Bitbucket**. A native Bitbucket webhook (**Repository Settings → Webhooks**, with the Webhook Secret in the **Secret** field) is authenticated and its branch, commit and PR link are recorded. Without a `changedFiles` list, though, the delivery is acknowledged with `dispatched: false` and nothing runs.

---

## Azure DevOps Setup

Azure DevOps service hooks cannot sign payloads, so authenticate with the Webhook Secret instead:

1. In your Azure DevOps project, go to **Project Settings → Service hooks → Create subscription → Web Hooks**.
2. Choose **Pull request created** / **Pull request updated** (or **Code pushed**).
3. Paste the Webhook URL, and either:
   - set **Basic authentication password** to the Webhook Secret (any username), or
   - add the HTTP header `X-Agnox-Webhook-Token:<Webhook Secret>`.

Like Bitbucket, Azure DevOps payloads do not list changed files. Send `changedFiles` from an Azure Pipelines step, keeping the `eventType`/`resource` fields so the run is labelled **Azure DevOps** with its branch, commit and PR link:

```yaml
- script: |
    FILES=$(git diff --name-only "origin/$(System.PullRequest.TargetBranchName)...HEAD" | jq -R . | jq -sc .)
    curl -sf -X POST "$(AGNOX_PR_WEBHOOK_URL)" \
      -H "Content-Type: application/json" \
      -H "X-Agnox-Webhook-Token: $(AGNOX_WEBHOOK_SECRET)" \
      -d "{\"changedFiles\": $FILES, \"eventType\": \"git.pullrequest.updated\", \"resource\": {\"pullRequestId\": $(System.PullRequest.PullRequestId), \"sourceRefName\": \"$(System.PullRequest.SourceBranch)\", \"lastMergeSourceCommit\": {\"commitId\": \"$(Build.SourceVersion)\"}}}"
  displayName: Agnox Smart PR Routing
```

---

## Authentication Reference

| Provider | Credential Agnox checks |
|---|---|
| GitHub | `X-Hub-Signature-256: sha256=<HMAC of raw body>` |
| Bitbucket | `X-Hub-Signature: sha256=<HMAC of raw body>` |
| GitLab | `X-Gitlab-Token: <secret>` |
| Azure DevOps | Basic auth with the secret as the password, or `X-Agnox-Webhook-Token: <secret>` |
| Any other CI | `X-Hub-Signature-256` HMAC, or `X-Agnox-Webhook-Token: <secret>` |

The first credential present decides: if a signature is sent and is wrong, the delivery is rejected even if a valid token is also present. All comparisons are constant-time.

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

## Test Manifest

Agnox builds a **test manifest** for each project automatically: after every Agnox Hosted Run, the structure of your test suite is recorded, and Smart PR Routing uses it for precise file-to-test routing (e.g., mapping `src/auth/login.ts` → `tests/auth/login.spec.ts`). Until a project has completed its first hosted run, the AI uses generic folder heuristics.

Manifests are kept per project, so projects in the same organization never share routing data.

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
