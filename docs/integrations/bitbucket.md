---
id: bitbucket
title: Bitbucket Pipelines
sidebar_position: 10
---

# Bitbucket Pipelines Integration

Trigger Agnox test runs from Bitbucket Pipelines and post execution status comments back to pull requests automatically — giving reviewers instant quality feedback without leaving Bitbucket.

---

## Capabilities

| Feature | Description |
|---------|-------------|
| **Hosted test runs** | Trigger Agnox to spin up a Docker container and run your tests |
| **PR status comments** | Execution results posted as PR comments with pass/fail counts |
| **CI context tagging** | Executions are tagged with the repository, PR number, and commit SHA |
| **Smart PR Routing** | Push webhook support for AI-driven test folder selection |

---

## Prerequisites

- An Agnox API key — generate one in **Settings → Profile → API Access**.
- Your Agnox **Project ID** — found in **Settings → Run Settings → Execution Defaults**.
- Bitbucket repository variables configured in **Repository Settings → Repository Variables**.
- A Bitbucket **App Password** or OAuth token with `pullrequests:write` scope (for PR comments).

---

## Step 1 — Add Secrets to Bitbucket

In **Repository Settings → Repository Variables**, add the following:

| Variable | Value | Secured |
|----------|-------|---------|
| `AGNOX_API_KEY` | Your Agnox API key | ✅ Yes |
| `AGNOX_PROJECT_ID` | Your project ID | No |
| `BITBUCKET_TOKEN` | App Password with `pullrequests:write` | ✅ Yes |

---

## Step 2 — Trigger a Hosted Run

Add this step to your `bitbucket-pipelines.yml`:

```yaml
image: atlassian/default-image:4

pipelines:
  pull-requests:
    '**':
      - step:
          name: Trigger Agnox E2E Tests
          script:
            - |
              RESPONSE=$(curl -s -X POST https://api.agnox.dev/api/ci/trigger \
                -H "Content-Type: application/json" \
                -H "x-api-key: $AGNOX_API_KEY" \
                -d '{
                  "projectId": "'"$AGNOX_PROJECT_ID"'",
                  "image": "your-dockerhub-user/my-tests:latest",
                  "folder": "tests/e2e",
                  "config": {
                    "environment": "staging",
                    "baseUrl": "https://staging.yourapp.com"
                  },
                  "ciContext": {
                    "source": "bitbucket",
                    "repository": "'"$BITBUCKET_REPO_FULL_NAME"'",
                    "prNumber": '"$BITBUCKET_PR_ID"',
                    "commitSha": "'"$BITBUCKET_COMMIT"'"
                  }
                }')
              echo "Agnox response: $RESPONSE"
              echo "$RESPONSE" > agnox_response.json
          artifacts:
            - agnox_response.json
```

The endpoint returns `{ cycleId, taskId, status: "PENDING" }`. The cycle appears immediately in **Test Cycles** in the Agnox dashboard.

---

## Step 3 — Post Results as a PR Comment

Add a second step that polls for the result and posts it to the PR:

```yaml
      - step:
          name: Post Agnox Results to PR
          script:
            - TASK_ID=$(cat agnox_response.json | python3 -c "import sys,json; print(json.load(sys.stdin)['taskId'])")
            - |
              # Poll until the execution is no longer PENDING/RUNNING (max 10 min)
              for i in $(seq 1 20); do
                STATUS=$(curl -s "https://api.agnox.dev/api/executions/$TASK_ID/status" \
                  -H "x-api-key: $AGNOX_API_KEY" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])")
                echo "Status: $STATUS"
                [ "$STATUS" = "RUNNING" ] || [ "$STATUS" = "PENDING" ] || break
                sleep 30
              done
            - |
              curl -s -X POST \
                "https://api.bitbucket.org/2.0/repositories/$BITBUCKET_REPO_FULL_NAME/pullrequests/$BITBUCKET_PR_ID/comments" \
                -u "$BITBUCKET_USERNAME:$BITBUCKET_TOKEN" \
                -H "Content-Type: application/json" \
                -d "{\"content\": {\"raw\": \"**Agnox E2E:** $STATUS — [View results](https://app.agnox.dev/executions/$TASK_ID)\"}}"
```

:::tip Keep pipelines fast
If your test suite takes longer than 10 minutes, increase the poll count or switch to a [Webhook](./webhooks) callback pattern to avoid blocking the pipeline step.
:::

---

## Step 4 — Enable PR Routing (Optional)

To use AI-driven test folder selection based on changed files:

1. Enable **Smart PR Routing** in **Settings → Features**.
2. Copy the webhook URL shown in **Settings → Run Settings**.
3. In Bitbucket, go to **Repository Settings → Webhooks** and add the URL.
4. Set the trigger to **Pull Request: Created** and **Push**.

See [Smart PR Routing →](../ai-capabilities/pr-routing) for full setup details.

---

## CI Context Fields

| Field | Bitbucket Variable |
|-------|--------------------|
| `repository` | `$BITBUCKET_REPO_FULL_NAME` |
| `prNumber` | `$BITBUCKET_PR_ID` |
| `commitSha` | `$BITBUCKET_COMMIT` |
| `branch` | `$BITBUCKET_BRANCH` |

---

## Troubleshooting

| Error | Likely Cause |
|-------|-------------|
| `401 Unauthorized` from Agnox | `AGNOX_API_KEY` is wrong or not secured in repo variables |
| PR comment not posted | `BITBUCKET_TOKEN` is missing `pullrequests:write` scope |
| Execution stuck in `PENDING` | Worker capacity may be at limit — check **System Monitor** |

---

## Related

- [GitHub Actions →](./github-actions)
- [Smart PR Routing →](../ai-capabilities/pr-routing)
- [Webhooks →](./webhooks)
