---
id: overview
title: Integrations Overview
sidebar_position: 5
---

# Integrations Overview

Agnox connects to the tools your team already uses — from CI/CD pipelines and issue trackers to notification channels and error-monitoring platforms.

:::info All credentials are encrypted
Every secret you store in Agnox (API tokens, webhook URLs, signing keys) is encrypted at rest using **AES-256-GCM** before being written to the database. They are never logged or exposed in API responses.
:::

---

## Available Integrations

### CI/CD & Source Control

<div style={{display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem'}}>

<div style={{border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '1.25rem', minWidth: '220px', flex: '1'}}>
  <img src="/img/integrations/github.svg" width="80" style={{marginBottom: '0.5rem'}} alt="GitHub Actions" />
  <h4 style={{margin: '0 0 0.4rem'}}>GitHub Actions</h4>
  <p style={{margin: 0, fontSize: '0.9rem'}}>Trigger hosted runs or stream Playwright results from your own runners. Supports Smart PR Routing.</p>
  <a href="./github-actions">Configure →</a>
</div>

<div style={{border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '1.25rem', minWidth: '220px', flex: '1'}}>
  <img src="/img/integrations/Bitbucket.svg" width="80" style={{marginBottom: '0.5rem'}} alt="Bitbucket" />
  <h4 style={{margin: '0 0 0.4rem'}}>Bitbucket Pipelines</h4>
  <p style={{margin: 0, fontSize: '0.9rem'}}>Trigger Agnox runs from Bitbucket Pipelines and post status comments back to pull requests.</p>
  <a href="./bitbucket">Configure →</a>
</div>

</div>

---

### Issue Trackers

<div style={{display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem'}}>

<div style={{border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '1.25rem', minWidth: '220px', flex: '1'}}>
  <img src="/img/integrations/jira.svg" width="80" style={{marginBottom: '0.5rem'}} alt="Jira" />
  <h4 style={{margin: '0 0 0.4rem'}}>Jira</h4>
  <p style={{margin: 0, fontSize: '0.9rem'}}>Create Jira issues directly from the Investigation Hub or the AI Auto Bug modal with one click.</p>
  <a href="./jira">Configure →</a>
</div>

<div style={{border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '1.25rem', minWidth: '220px', flex: '1'}}>
  <img src="/img/integrations/linear.svg" width="80" style={{marginBottom: '0.5rem'}} alt="Linear" />
  <h4 style={{margin: '0 0 0.4rem'}}>Linear</h4>
  <p style={{margin: 0, fontSize: '0.9rem'}}>Create Linear issues from failed executions. Issue URLs are stored on the execution record for traceability.</p>
  <a href="./linear">Configure →</a>
</div>

<div style={{border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '1.25rem', minWidth: '220px', flex: '1'}}>
  <img src="/img/integrations/monday.svg" width="80" style={{marginBottom: '0.5rem'}} alt="Monday.com" />
  <h4 style={{margin: '0 0 0.4rem'}}>Monday.com</h4>
  <p style={{margin: 0, fontSize: '0.9rem'}}>Create Monday items and post execution updates on your boards automatically after every run.</p>
  <a href="./monday">Configure →</a>
</div>

</div>

---

### Notifications

<div style={{display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem'}}>

<div style={{border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '1.25rem', minWidth: '220px', flex: '1'}}>
  <img src="/img/integrations/slack.svg" width="80" style={{marginBottom: '0.5rem'}} alt="Slack" />
  <h4 style={{margin: '0 0 0.4rem'}}>Slack</h4>
  <p style={{margin: 0, fontSize: '0.9rem'}}>Rich Slack messages with AI analysis snippets and direct links to the Investigation Hub.</p>
  <a href="./slack">Configure →</a>
</div>

<div style={{border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '1.25rem', minWidth: '220px', flex: '1'}}>
  <img src="/img/integrations/teams.svg" width="80" style={{marginBottom: '0.5rem'}} alt="Microsoft Teams" />
  <h4 style={{margin: '0 0 0.4rem'}}>Microsoft Teams</h4>
  <p style={{margin: 0, fontSize: '0.9rem'}}>Post colour-coded MessageCard notifications to any Teams channel using an Incoming Webhook URL. Supports per-status toggles and AI analysis snippets.</p>
  <a href="./ms-teams">Configure →</a>
</div>

</div>

---

### Extensibility

<div style={{display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem'}}>

<div style={{border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '1.25rem', minWidth: '220px', flex: '1'}}>
  <h4 style={{margin: '0 0 0.4rem'}}>🔗 Generic Webhooks</h4>
  <p style={{margin: 0, fontSize: '0.9rem'}}>Send execution payloads to any HTTP endpoint, verified with HMAC SHA-256 signatures. Connect to any internal tool your team uses.</p>
  <a href="./webhooks">Configure →</a>
</div>

</div>

---

## Where to Configure

All integrations are managed from **Settings → Connectors** in the Agnox dashboard. Each card shows a **Connected** badge once valid credentials have been stored.

:::tip Drop in your logos
Place SVG logos at `static/img/integrations/<name>.svg` and they will appear in the cards above. Recommended size: 80 × 80 px (or a square SVG that scales cleanly).
:::
