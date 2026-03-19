---
id: intro
title: What is Agnox?
sidebar_position: 1
---

# What is Agnox?

**Agnox** is an **AI Quality Orchestrator** — a unified platform that brings together automated test execution, manual QA workflows, and intelligent AI features into a single, seamless experience for modern engineering teams.

## The Problem Agnox Solves

Modern QA teams face fragmented tooling: CI logs in GitHub Actions, manual test plans in spreadsheets, bug reports in Jira, and flakiness data scattered across dashboards. Agnox centralizes the entire quality operation in one place.

## Two Ways to Run Tests

Agnox supports two integration modes — choose the one that fits your workflow:

| | **Agnox Hosted** | **External CI (Passive Reporter)** |
|---|---|---|
| **How it works** | Agnox provisions a Docker container and executes your tests | Your CI pipeline runs tests; a lightweight reporter streams results to Agnox in real time |
| **Requires Docker image** | Yes — push your image to Docker Hub | No — works with any existing Playwright setup |
| **Best for** | Full isolation, multi-framework, scheduled runs | Teams already running Playwright in GitHub Actions, GitLab CI, or locally |

## Official Framework SDKs

For teams using the External CI path, Agnox provides **official Adapters** for each major testing framework. Installing an Adapter is a single configuration-level change — **no individual test files are modified**.

Adapters automatically capture **Runtime Context at the exact moment of failure**: the current page URL, console errors, failed network requests, and a DOM snapshot. This structured data feeds directly into the AI Root Cause Analysis engine, delivering significantly more accurate diagnostics than log parsing alone.

See the [Integrations Overview →](../integrations/overview) for a full comparison of AI RCA quality with and without an Adapter, and for the list of available packages.

## Platform Highlights

### Investigation Hub
Triage failures instantly with a real-time streaming terminal and visual artifact gallery. Drill into screenshots, traces, and logs from a single unified interface — and let AI surface the root cause automatically.

### Quality Hub
Build a living manual test repository with suite-grouped test cases. Generate structured test steps in seconds with AI, then combine manual and automated items into **Hybrid Test Cycles**.

### AI Quality Orchestrator
Seven opt-in AI features that work across your quality data:
- **Auto-Bug Generator** — structured bug reports from failed logs, submittable to Jira, Linear, or Monday.com
- **Flakiness Detective** — stability analysis and actionable recommendations
- **Smart Test Optimizer** — BDD conversion with duplicate detection
- **Smart PR Routing** — automatically route CI runs to relevant test folders
- **Quality Chatbot** — natural-language queries over your test database
- **Spec-to-Test Generation** — upload a PDF, DOCX, or Markdown spec to auto-generate a test case library
- **Automation Planner** — AI scores your manual test library by risk level and generates a complete Markdown automation strategy document ready for Cursor or GitHub Copilot

### Enterprise Connectors
Create Jira, Linear, or Monday.com issues directly from failed tests. Receive real-time Slack and MS Teams notifications. Trigger runs from GitHub Actions, GitLab CI, Azure DevOps, Bitbucket, or any CI system. Send execution payloads to any endpoint via the generic outbound webhook.

## Navigation

The Agnox dashboard is organized as follows:

- **Dashboard** — Live execution feed with flat and grouped views
- **Test Cases** — Manual test case repository (Quality Hub)
- **Test Cycles** — Hybrid cycle management and execution player
- **Stability** — Flakiness Detective reports *(AI feature)*
- **Ask AI** — Quality Chatbot *(AI feature)*
- **Automation Planner** — AI-driven automation strategy generator *(AI feature)*
- **Settings** — Organization, team, billing, integrations, AI configuration

### Light / Dark Theme

Use the theme toggle in the top-right header. Your preference is saved in `localStorage` and applied on every subsequent visit.

### Getting Started Checklist

New users see a floating **Getting Started** widget in the bottom-right corner with an interactive 3-step checklist:

| Step | Action |
|------|--------|
| **Connect Docker Image** | Guided tour through Run Settings → first test execution → Investigation Hub |
| **Run Your First Test** | Resumes the tour at the execution step |
| **Explore Platform Features** | 5-step discovery tour covering Test Cases, Test Cycles, Team Members, and Env Variables |

You can reopen the checklist at any time via the rocket icon at the bottom of the sidebar.

## Next Steps

- [Quick Start →](./quick-start) — get your first test running in 5 minutes
- [Installation →](./installation) — sign up and configure your account
