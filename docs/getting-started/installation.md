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

Store the key as a CI/CD secret (e.g., `AGNOX_API_KEY`). Use it in requests:

```bash
curl -H "x-api-key: pk_live_..." https://api.agnox.dev/api/executions
```

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

## Backend Startup Requirements

The Agnox producer service uses a **synchronous startup guard** that validates all critical environment variables at process boot. If any required variable is absent or malformed, the process exits with a non-zero code before accepting any connections — preventing silent misconfiguration in production.

### Strictly Required Environment Variables

| Variable | Format | Description |
|----------|--------|-------------|
| `ENCRYPTION_KEY` | Exactly **32 characters** (hex or ASCII) | AES-256-GCM key for encrypting integration secrets, BYOK API keys, and project env var secrets. The startup guard enforces the exact length — any deviation causes an immediate startup failure. |
| `PLATFORM_JWT_SECRET` | Any non-empty string (≥ 32 chars recommended) | Signs all user JWT access tokens. Rotation requires all active sessions to re-authenticate. |
| `PLATFORM_MONGO_URI` | Valid MongoDB connection string | Primary database connection. The startup guard validates that a ping succeeds before the HTTP server binds to its port. |

> **Self-hosting:** All three variables must be set in your deployment environment (e.g., `docker-compose.yml`, Kubernetes Secret, or `.env`). The platform will refuse to start without them.

### Optional Platform Keys

| Variable | Description |
|----------|-------------|
| `PLATFORM_GEMINI_API_KEY` | Fallback Gemini API key when no org-level BYOK key is configured |
| `PLATFORM_OPENAI_API_KEY` | Fallback OpenAI API key |
| `PLATFORM_ANTHROPIC_API_KEY` | Fallback Anthropic API key |
| `MONITORING_SECRET_KEY` | Shared secret for the internal `/api/system/monitor-status` endpoint |

---

## Next Steps

- [Quick Start →](./quick-start) — run your first test
- [Core Features →](../core-features/executions) — learn the full execution workflow
- [Team & Billing →](../core-features/organization) — manage plans and subscription
