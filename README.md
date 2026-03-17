# Agnox
> The AI Quality Orchestrator for modern engineering teams.

Agnox is a unified platform that integrates with your CI/CD pipelines, executes tests across any framework, and delivers actionable AI-powered insights — directly where your team works.

[![Website](https://img.shields.io/badge/Website-agnox.dev-blueviolet?style=for-the-badge)](https://agnox.dev)
[![Documentation](https://img.shields.io/badge/Documentation-docs.agnox.dev-violet?style=for-the-badge&logo=docusaurus)](https://docs.agnox.dev)

![Multi-Tenant](https://img.shields.io/badge/Multi--Tenant-SaaS-orange?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-Agnostic-2496ED?style=flat-square)
![AI](https://img.shields.io/badge/AI-BYOK%20%7C%20Gemini%20%7C%20GPT--4o%20%7C%20Claude-8e44ad?style=flat-square)
![Security](https://img.shields.io/badge/Security-JWT%20%2B%20RBAC-green?style=flat-square)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-v5-FF4154?style=flat-square)

---

## The Problem

Test automation teams waste hours every day on:

- **Debugging failures** — manually sifting through thousands of log lines with no clear root cause
- **Flaky tests** — intermittent failures that erode confidence but are hard to identify and quarantine
- **Wasted CI time** — running the full test suite on every PR, even when only a handful of files changed
- **Fragmented tooling** — different frameworks, environments, and teams with no unified view

---

## The Solution

Agnox sits between your CI/CD pipeline and your test framework, bringing everything together in one platform:

| Capability | What it does |
|---|---|
| **AI Triage** | Dual-agent LLM pipeline analyzes failures, generates a root cause, and self-critiques to eliminate hallucinations |
| **Flakiness Detective** | Detects unstable tests across historical runs, scores flakiness, and surfaces actionable recommendations |
| **Smart PR Routing** | An AI reads your changed files and dispatches only the relevant tests — not the full suite |
| **Test Optimizer** | A dual-agent analyzer rewrites test cases into clean BDD format and removes duplicate steps |
| **Quality Chatbot** | Ask natural-language questions about your test data — powered by a sanitized, AI-generated aggregation pipeline |
| **Auto Bug Generation** | One click generates a structured bug report pre-filled with the AI's root cause analysis, ready to submit to Jira, Linear, or Monday.com |
| **Spec-to-Test Generation** | Upload a PDF, DOCX, or Markdown spec — a 4-stage agentic pipeline (Extractor → Generator → Critic → Formatter) streams progress via SSE and generates draft test cases directly into your suite |
| **Automation Planner** | Turns your manual test library into a prioritised automation roadmap — AI scores each test's risk level, you select up to 30, and it generates a complete Markdown automation strategy document ready to paste into Cursor or GitHub Copilot |
| **Framework-Agnostic** | Bring your own Docker image — Playwright, Cypress, Pytest, JUnit, Selenium, or any custom framework |
| **Multi-Tenant SaaS** | Complete data isolation, RBAC, and per-organization quotas and billing |
| **Notifications** | Configurable Slack and MS Teams webhooks deliver colour-coded execution summaries with AI analysis snippets and deep links to the Investigation Hub — each channel is independent and per-status configurable |
| **Linear Integration** | Create Linear issues from failed executions in one click; bidirectional linkage keeps your issue tracker in sync with your test results |
| **Monday.com Integration** | Create Monday.com board items from the Investigation Hub or Auto-Bug Generator; description attached as an update on the item; bidirectional `mondayItems[]` linkage on each execution |
| **Generic Outbound Webhook** | Fire-and-forget `execution.finished` event POSTed to any HTTPS endpoint on execution completion with optional HMAC-SHA256 signing |

---

## Core AI Features

### AI-Powered Root Cause Analysis

When tests fail, Agnox captures logs automatically and runs a **dual-agent LLM pipeline**:

1. An **Analyzer** agent produces a structured root cause and suggested fix as JSON
2. A **Critic** agent evaluates the analysis against the raw logs and overrides hallucinations
3. The final, vetted analysis is rendered as developer-facing Markdown in the Investigation Hub

Your LLM key stays yours. Agnox supports **BYOK** (Bring Your Own Key) for Gemini, GPT-4o, and Claude, with a platform-default fallback.

### Flakiness Detective

Agnox scores each test group's flakiness over time and delivers a structured verdict with findings and recommendations — so you can quarantine unstable tests before they derail your pipeline.

### Smart PR Routing

Connect Agnox to your GitHub repository via a webhook. When a PR fires:

1. Agnox extracts the changed files from the payload
2. An LLM maps the changes to the most relevant test subfolder
3. A targeted test run is dispatched — not the full suite
4. The execution appears in the Dashboard with a **Smart PR** badge and full CI context

```yaml
# GitHub Actions example
- name: Trigger Smart PR Tests
  run: |
    curl -X POST ${{ secrets.AGNOX_API_URL }}/api/webhooks/ci/pr?token=${{ secrets.AGNOX_ORG_ID }}&env=staging \
      -H "Content-Type: application/json" \
      -H "X-Hub-Signature-256: sha256=$(echo -n '${{ toJson(github.event) }}' | openssl dgst -sha256 -hmac '${{ secrets.WEBHOOK_SECRET }}' | cut -d' ' -f2)" \
      -d '${{ toJson(github.event) }}'
```

### Quality Chatbot

Ask questions about your test data in plain English — _"What is the flakiness rate for the checkout group this week?"_ — and get a clear answer backed by real aggregation data from your executions.

---

## Supported Frameworks

Agnox is **framework-agnostic**. Any Docker-based test runner works out of the box:

| Framework | Docker Image Example | Command |
|---|---|---|
| **Playwright** | `mcr.microsoft.com/playwright:v1.40.0` | `npx playwright test` |
| **Cypress** | `cypress/included:13.6.0` | `cypress run` |
| **Pytest** | `python:3.11-slim` | `pytest --html=report.html` |
| **JUnit** | `openjdk:17-slim` | `mvn test` |
| **Selenium** | `selenium/standalone-chrome:latest` | `pytest tests/` |
| **Custom** | Any Docker image | Any command |

---

## Connecting Your Project

There are two ways to connect your automation project to Agnox.

### Option A: The Agnox CLI (Docker-Hosted Runs)

The **Agnox CLI** scaffolds a production-ready Docker setup for your test repo in seconds.

```bash
npx @agnox/agnox-cli@latest init
```

**What it does:**
- Generates a `Dockerfile`, `entrypoint.sh`, and `.dockerignore` tailored to your framework
- Auto-detects your Playwright version from `package.json` and pins the correct base image
- Builds a multi-platform Docker image (`linux/amd64` + `linux/arm64`) and pushes it to Docker Hub

**After running the CLI:**
1. Open the **Agnox Dashboard**
2. Go to **Settings → Run Settings**
3. Create a project and enter the Docker image name
4. Configure your environment URLs (Dev / Staging / Prod)

The platform uses this image for all runs triggered from the Execution Modal or your CI pipeline.

> **npm:** [`@agnox/agnox-cli`](https://www.npmjs.com/package/@agnox/agnox-cli)

---

### Option B: Native Playwright Reporter (No Docker Required)

Stream live Playwright results directly to your Agnox dashboard — no Dockerfile, no CI changes required.

```bash
npm install --save-dev @agnox/playwright-reporter
```

```typescript
// playwright.config.ts
import AgnoxReporter from '@agnox/playwright-reporter';

export default defineConfig({
  reporter: [
    ['list'],
    [AgnoxReporter, {
      apiKey:    process.env.AGNOX_API_KEY,
      projectId: process.env.AGNOX_PROJECT_ID,
    }],
  ],
});
```

**Key features:**
- **Live ingest** — results stream to the dashboard as each test completes
- **Auto CI detection** — automatically attaches branch, PR number, and commit SHA from GitHub Actions, GitLab CI, Azure DevOps, and Jenkins
- **Do No Harm** — all reporter errors are silently suppressed; your test suite is never affected
- **Source filter** — runs appear as `External CI` in the Dashboard, separate from Docker-hosted runs

> **npm:** [`@agnox/playwright-reporter`](https://www.npmjs.com/package/@agnox/playwright-reporter)

---

## CI/CD Integration

Trigger Agnox from any CI pipeline using a simple `curl` call.

### GitHub Actions

```yaml
name: Run E2E Tests via Agnox
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Trigger Tests
        run: |
          curl -X POST https://api.agnox.dev/api/ci/trigger \
            -H "Content-Type: application/json" \
            -H "x-api-key: ${{ secrets.AGNOX_API_KEY }}" \
            -d '{
              "projectId": "${{ secrets.AGNOX_PROJECT_ID }}",
              "image": "myorg/my-tests:latest",
              "command": "npx playwright test",
              "folder": "tests/e2e",
              "config": { "environment": "staging" },
              "ciContext": {
                "source": "github",
                "repository": "${{ github.repository }}",
                "prNumber": ${{ github.event.number || 0 }},
                "commitSha": "${{ github.sha }}"
              }
            }'
```

### GitLab CI

```yaml
e2e-tests:
  stage: test
  script:
    - |
      curl -X POST https://api.agnox.dev/api/ci/trigger \
        -H "Content-Type: application/json" \
        -H "x-api-key: $AGNOX_API_KEY" \
        -d '{
          "projectId": "'"$AGNOX_PROJECT_ID"'",
          "image": "myorg/my-tests:latest",
          "command": "npx playwright test",
          "folder": "tests/e2e",
          "config": { "environment": "staging" },
          "ciContext": {
            "source": "gitlab",
            "repository": "'"$CI_PROJECT_PATH"'",
            "commitSha": "'"$CI_COMMIT_SHA"'"
          }
        }'
```

For the full API reference, see [docs.agnox.dev](https://docs.agnox.dev).

---

## Getting Started

1. **Sign up** at [agnox.dev](https://agnox.dev) — your organization is created automatically
2. **Generate an API Key** in Settings → Profile → API Access
3. **Connect your project** using the CLI or the Native Playwright Reporter
4. **Trigger your first run** and watch results stream live in the dashboard

---

## Security at a Glance

Agnox is built with security-first principles:

- **JWT + RBAC** — HS256 with Redis-backed revocation; Admin, Developer, and Viewer roles
- **AES-256-GCM** — all stored secrets (API keys, integration tokens) are encrypted at rest
- **Rate Limiting** — per-organization and per-IP limits (Redis-backed)
- **HMAC Webhook Verification** — constant-time `X-Hub-Signature-256` validation for PR Routing webhooks
- **5-Layer AI Sanitizer** — every LLM-generated MongoDB pipeline is validated against a strict allowlist before execution, preventing NoSQL injection via AI-generated queries
- **Log Sanitization** — secret values are automatically redacted from all streamed container logs

---

## Documentation & Community

| Resource | Link |
|---|---|
| Full Documentation | [docs.agnox.dev](https://docs.agnox.dev) |
| Website | [agnox.dev](https://agnox.dev) |
| Agnox CLI on npm | [@agnox/agnox-cli](https://www.npmjs.com/package/@agnox/agnox-cli) |
| Playwright Reporter on npm | [@agnox/playwright-reporter](https://www.npmjs.com/package/@agnox/playwright-reporter) |
| Contact & Support | [info@agnox.dev](mailto:info@agnox.dev) |

---

## Contributing

This repository contains the public-facing CLI and documentation for Agnox. We welcome bug reports, documentation improvements, and feature suggestions.

- **Found a bug in the CLI?** Open an issue in this repository.
- **Have a feature idea?** Start a discussion or reach out at [info@agnox.dev](mailto:info@agnox.dev).
- **Want to read the full docs?** Head to [docs.agnox.dev](https://docs.agnox.dev).

---

<p align="center">
  Built for engineering teams who care about quality.<br/>
  <a href="https://agnox.dev">agnox.dev</a> &nbsp;·&nbsp; <a href="https://docs.agnox.dev">docs.agnox.dev</a>
</p>
