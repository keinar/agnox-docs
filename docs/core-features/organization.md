---
id: organization
title: Team, Billing & API Keys
sidebar_position: 5
---

# Team, Billing & API Keys

Everything you need to manage your organization: invite teammates, control access, handle billing, and generate API keys for CI/CD pipelines.

---

## Team Management

### Inviting Members (Admin Only)

1. Go to **Settings → Team Members**.
2. Click **Invite Member**.
3. Enter the email address and select a role:

| Role | Permissions |
|------|-------------|
| **Admin** | Full access — billing, settings, invitations, AI features configuration |
| **Developer** | Run tests, view results, manage own profile |
| **Viewer** | Read-only access to test results |

### Managing Roles

- **Change role:** Use the role dropdown in the member list.
- **Remove member:** Click the trash icon.

---

## API Keys (CI/CD Integration)

API keys authenticate CI/CD pipelines without sharing personal credentials.

### Generating a Key

1. Go to **Settings → Profile → API Access**.
2. Click **Generate New Key**.
3. Enter a label (e.g., "GitHub Actions").
4. **Copy the key immediately** — it is only shown once.

### Using the Key

```bash
curl -H "x-api-key: pk_live_..." https://api.agnox.dev/api/executions
```

---

## Billing & Plans

Manage your subscription in **Settings → Billing & Plans**.

### Plan Comparison

| Feature | Free | Starter | Team | Business | Enterprise |
|---------|------|---------|------|----------|------------|
| **Price** | $0/mo | $39/mo | $99/mo | $249/mo | Custom |
| **Hosted Runs/Month** | 15 | 75 | 250 | 800 | Unlimited |
| **External CI Runs/Month** | 250 | 1,500 | 5,000 | 20,000 | Unlimited |
| **Projects** | 1 | 3 | Unlimited | Unlimited | Unlimited |
| **Team Members** | 3 | 5 | 20 | 100 | Unlimited |
| **Concurrent Hosted Runs** | 1 | 2 | 4 | 8 | Unlimited |
| **Storage** | 1 GB | 5 GB | 15 GB | 50 GB | Custom |
| **History Retention** | 7 days | 14 days | 30 days | 90 days | Custom |
| **Full AI Engine (with your own AI key)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **All Integrations** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Audit Logs** | — | — | — | ✅ | ✅ |
| **SSO** | — | — | — | — | ✅ |
| **Support** | Community | Email | Email | Priority | Dedicated 24/7 |

> Limits are enforced automatically by the backend. Upgrading takes effect immediately.
>
> **Hosted vs. external CI runs:** a *hosted run* executes your test image in an Agnox container (dashboard, CI trigger, PR webhook, schedules, test cycles). An *external CI run* is reported by `@agnox/playwright-reporter` from your own pipeline. Each has its own monthly counter; both reset on the first day of the month, and deleting a run does not give its slot back.
>
> **Concurrent runs:** hosted runs above your plan's concurrency stay queued (`PENDING`) and start as earlier ones finish.
>
> **History retention:** runs older than your plan's retention, and runs you delete, are removed by a daily cleanup together with their reports, screenshots, videos and traces.
>
> **AI:** every plan includes all AI features and every model tier, running on your organization's own provider API key (BYOK) — add it in **Settings → AI Models**. AI stays disabled until a key is configured.

### Deleting a Project (Freeing a Slot)

Admins can delete a project in **Settings → Run Settings → Danger Zone** to free a project slot on their plan. After a confirmation dialog, Agnox removes the project together with its run settings, environment variables, test structure and CRON schedules. **Executions, test cases and test cycles are kept** for history and usage accounting. The organization's last remaining project cannot be deleted — create another project first.

### Storage Tracking

Agnox tracks your data usage (run records, reports and artifacts) in **Settings → Billing & Plans**:
- **Live tracking:** every finished run, and every artifact uploaded by the Playwright Reporter, is added to your storage usage immediately.
- **Daily recalculation:** usage is recalculated every night, so space freed by deleted or expired runs (after your retention window) is reflected the next day.

When your storage limit is reached, new runs are rejected with `429 Storage limit reached` until storage is freed or you upgrade.

### Upgrading

1. Click **Upgrade to [Plan Name]** on the desired plan card.
2. Complete payment via the Stripe-hosted checkout form.
3. The subscription activates via webhook — new limits apply immediately.

### Usage Alerts

Real-time alerts appear at the top of the Billing page as you approach plan limits:

| Usage | Alert | Action |
|-------|-------|--------|
| 50% | Info (blue) | Monitor usage trends |
| 80% | Warning (yellow) | Consider upgrading |
| 90% | Critical (red) | Upgrade immediately |
| 100% | Blocked | Tests paused until reset or upgrade |

### Subscription Management

Click **Manage Subscription** to access the Stripe Customer Portal:
- Update payment method
- View and download invoices
- Cancel subscription

**Cancellation:** Service continues until the end of your current billing period, then downgrades to Free automatically. No prorated refunds.

### Billing Status Reference

| Status | Meaning |
|--------|---------|
| 🟢 **Active** | Payments current, full access |
| 🟡 **Past Due** | Payment failed; 7-day grace period before auto-cancel |
| ⚫ **Canceled** | Scheduled for downgrade at period end |

### Payment & Security

- All payments processed by **Stripe** (PCI DSS Level 1)
- Credit card details are never stored on Agnox servers
- Accepted: Visa, Mastercard, Amex, Apple Pay, Google Pay

---

## Billing FAQ

**When do my run quotas reset?**
Your **Agnox Hosted Runs** and **External CI Runs** counters reset on the **1st day of every calendar month**, independent of your billing date. Your subscription itself renews monthly on your subscription start date.

**What happens to old runs?**
Runs older than your plan's retention window (7 / 14 / 30 / 90 days for Free / Starter / Team / Business) are deleted automatically by a daily cleanup, together with their reports and artifacts. Upgrading extends retention for runs that haven't been deleted yet.

**Are there prorated charges?**
- **Upgrades:** Yes, prorated charge for the remaining period
- **Downgrades:** Take effect at period end, no prorated refunds

**What happens if payment fails?**
Automatic retry for 3 days → "Past Due" status → 7-day grace period → auto-cancel if unresolved.

---

## Related

- [Account Setup →](../getting-started/installation)
- [AI Configuration →](../ai-capabilities/configuration)
