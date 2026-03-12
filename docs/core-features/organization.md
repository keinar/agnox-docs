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

| Feature | Free | Team | Enterprise |
|---------|------|------|------------|
| **Test Runs/Month** | 100 | 1,000 | Unlimited |
| **Projects** | 1 | 10 | Unlimited |
| **Team Members** | 3 | 20 | Unlimited |
| **Concurrent Runs** | 1 | 5 | 20 |
| **Storage** | 1 GB | 10 GB | 100 GB |
| **AI Analysis** | ✅ | ✅ | ✅ |

### Pricing

| Plan | Price |
|------|-------|
| **Free** | $0/month |
| **Team** | $99/month |
| **Enterprise** | $499/month |

> Limits are enforced automatically. Upgrading takes effect immediately.

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

**When does my billing period reset?**
Monthly periods align with your subscription start date. Test run counters reset on that date.

**Are there prorated charges?**
- **Upgrades:** Yes, prorated charge for the remaining period
- **Downgrades:** Take effect at period end, no prorated refunds

**What happens if payment fails?**
Automatic retry for 3 days → "Past Due" status → 7-day grace period → auto-cancel if unresolved.

---

## Related

- [Account Setup →](../getting-started/installation)
- [AI Configuration →](../ai-capabilities/configuration)
