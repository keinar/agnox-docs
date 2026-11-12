---
id: installation
title: Account Setup
sidebar_position: 3
---

# Account Setup

Everything you need to create your account, configure your first project, and invite your team.

---

## Creating Your Account

### Sign Up

1. Navigate to [agnox.dev](https://agnox.dev) and click **Sign Up**.
2. Enter your **email**, **password**, and **name**.
3. Enter your **organization name** (your company or team name).
4. Click **Create Account**.

> Your organization is created automatically and you become the **Admin**.

### Join via Invitation

If a teammate has already created an organization:

1. Open the **Accept Invitation** link in the email you received.
2. **New users:** Create an account using the invitation token.
3. **Existing users:** Log in — you'll be added to the organization automatically.

---

## Configuring Your First Project

Before running tests, configure a project in **Settings → Run Settings**.

### Creating a Project

1. Go to **Settings → Run Settings**.
2. Click **Create New Project**.
3. Fill in:
   - **Project Name** — e.g., "Web App E2E"
   - **Docker Image** — the image you pushed to Docker Hub (e.g., `myuser/my-tests:latest`)
   - **Test Folder** — path to tests inside the container (default: `.` or `tests/`)

### Environment URLs

Define base URLs for each environment (Development, Staging, Production). These are injected into your test container as `BASE_URL` at runtime.

---

## Generating an API Key

API keys authenticate CI/CD pipelines without sharing personal credentials.

1. Go to **Settings → Profile → API Access**.
2. Click **Generate New Key**.
3. Enter a label (e.g., "GitHub Actions").
4. **Copy the key immediately** — it is only displayed once.

Store the key as a CI/CD secret (e.g., `AGNOX_API_KEY`). Send it in the `x-api-key` header:

```bash
curl -H "x-api-key: pk_live_..." "https://api.agnox.dev/api/executions?limit=10"
```

See the [CI & Webhooks API →](../api-reference/ci-and-webhooks) for triggering runs with the key.

---

## Inviting Your Team

### Inviting Members (Admin Only)

1. Go to **Settings → Team Members**.
2. Click **Invite Member**.
3. Enter the email address and select a role:

| Role | Permissions |
|------|-------------|
| **Admin** | Full access — billing, settings, invitations, all features |
| **Developer** | Run tests, view results, manage own profile |
| **Viewer** | Read-only access to test results |

### Managing Roles

- **Change role:** Use the role dropdown in the Team Members list.
- **Remove member:** Click the trash icon next to their name.

---

## Environment Variables & Secrets

Store per-project credentials and configuration values securely in **Settings → Env Variables**.

- Variables are **encrypted at rest** using AES-256-GCM before being stored.
- At runtime, they are injected directly into your test container, eliminating the need for local `.env` files containing test credentials.
- Mark sensitive values (passwords, tokens) as **Secret** — they are redacted from streamed logs.

---

## Next Steps

- [Quick Start →](./quick-start) — run your first test
- [Core Features →](../core-features/executions) — learn the full execution workflow
- [Team & Billing →](../core-features/organization) — manage plans and subscription
