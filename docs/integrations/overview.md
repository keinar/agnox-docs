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

## Why Use Official Agnox SDKs?

Agnox ships official **framework adapters** — lightweight SDKs and plugins for each major testing ecosystem. These are the recommended way to connect your test suite to Agnox.

**You never modify individual test files.** Installation is a one-time, configuration-level change.

### The Difference in AI Accuracy

How you integrate directly determines the quality of AI Root Cause Analysis (RCA) you receive.

| | **With an Official Agnox Adapter (Recommended)** | **Without an Adapter (Fallback Mode)** |
|---|---|---|
| **Setup required** | Add adapter to config file only. Zero test-code changes. | No setup — raw CI stdout is parsed automatically. |
| **Runtime context captured** | **Automatically at the exact moment of failure:** current URL, page title, ARIA DOM snapshot, console errors, and failed network requests (4xx/5xx). | None — only raw stdout/stderr from the CI log is available. |
| **AI RCA quality** | **Hyper-accurate.** The AI receives a structured, typed payload: the exact URL that failed, the specific network call that returned 404, and the console error that preceded the crash. It can diagnose routing bugs, API regressions, and visual state errors with surgical precision. | **Best-effort.** The AI parses unstructured log text. It cannot distinguish a routing bug from a flaky assertion, and has no visibility into network state or the DOM at the moment of failure. |
| **Token efficiency** | The structured context block is ~200 tokens. The AI processes signal, not noise. | The AI must scan up to 30,000 characters of log text looking for diagnostic clues. |
| **Network error detection** | Every `4xx`/`5xx` response is captured with URL, method, and status code. | Only if the test framework happened to print it to stdout. |
| **DOM state at failure** | ARIA accessibility tree snapshot (capped at 8 KB). | Not available. |

:::tip Use an Adapter
If you are starting a new integration, always install the Adapter for your framework first. The improvement in RCA accuracy is immediate and requires no changes to your test code.
:::

### Available Official Adapters

| Framework | Package | Language | Status |
|---|---|---|---|
| **Playwright** | [`@agnox/playwright-reporter`](./playwright-reporter) | TypeScript / JS | **Available** |
| **Cypress** | `@agnox/cypress-plugin` | TypeScript / JS | Coming in Phase 8.2 |
| **Pytest + Selenium** | `agnox-pytest` | Python | Coming in Phase 8.3 |
| **WebdriverIO** | `@agnox/wdio-service` | TypeScript / JS | Roadmap |

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
