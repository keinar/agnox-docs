---
id: automation-planner
title: Automation Planner
sidebar_position: 7
---

# Automation Planner

The **Automation Planner** (Phase 6 of the AI Quality Orchestrator) bridges the gap between manual QA work and automation engineering. It analyses your existing manual test case library, assigns risk-based priority scores, and generates an **Agent Implementation Prompt** for coding agents such as Claude Code and Cursor, Playwright spec scaffolds, and an automation strategy — grounded in your product spec and repository conventions.

**Feature flag:** `aiFeatures.automationPlanner` — toggle in **Settings → Features → AI Features**.

---

## How It Works

The planner runs in two stages to control LLM token cost and prevent context-window overflow:

```
Stage 1 — Metadata Scan (fast, cheap)
  POST /api/ai/automation-planner/discover
  ↓ Sends only titles, suites, tags — ~2k tokens for 200 tests
  ↓ LLM assigns CRITICAL / HIGH / MEDIUM / LOW risk per suite and per test
  ↓ Returns grouped tree with LLM rationale

        ↓ User selects up to 30 tests ↓

Stage 2 — Deep Dive (on demand, for selected tests only)
  POST /api/ai/automation-planner/plan
  ↓ Fetches full step data ONLY for selected tests (+ optional product spec and repo context)
  ↓ LLM generates the strategy and spec scaffolds; Agnox builds the agent prompt
  ↓ Saved to your plan history for future retrieval
```

---

## User Flow

### 1. Select a Project and Scan

Open **Automation Planner** from the sidebar (Wand2 icon). Select a project from the dropdown and click **Scan Manual Tests**.

Use the **Filters** toggle to narrow the scan to a specific suite or tag before scanning — useful for large test libraries where you only want to plan one area at a time.

### 2. Review the Risk Tree

After scanning, tests are displayed grouped by suite. Each group and each individual test shows a **risk badge**:

| Badge | Colour | Meaning |
|-------|--------|---------|
| `CRITICAL` | Red | Authentication, payments, core user journeys |
| `HIGH` | Orange | Key workflows with significant failure impact |
| `MEDIUM` | Yellow | Secondary workflows, settings, conditional UI |
| `LOW` | Blue | Cosmetic states, empty states, low business impact |

A one-sentence LLM rationale is shown for each suite group.

### 3. Select Tests and Add Context

Check the tests you want to automate (up to 30). A sticky bottom bar appears showing the selection count. Click **Generate Plan** to open the plan dialog.

Choose your **framework** (Playwright, Cypress, Pytest, Vitest, Jest, WebdriverIO) and **design pattern** (Page Object, Screenplay, Fixture, Fluent, Data-Driven). Then, optionally, give the planner context in two collapsible sections:

**Product Spec & Requirements Context**
- Upload a spec file (`.md`, `.txt` or `.json`) or paste product requirements, user stories or acceptance criteria (up to 30,000 characters).
- The planner uses it to fill in expected results that the manual steps leave vague, and to name things the way the product does.
- The spec text is sent to the model for this plan only. It is **not** saved with the plan.

**Repository & Architecture Context**
- **Repository** — `owner/repo` or a GitHub URL.
- **Base URL**, **Auth fixture** (e.g. `loggedInPage` or a storageState file), **Page Objects folder**, and free-text **folder & fixture conventions**.
- **Read from GitHub** shows the repository's top-level tree and its `playwright.config` without an AI call. Tick **Include … when generating** to send that snapshot with the plan. Agnox uses the GitHub integration's token when the organization has one, and GitHub's public API otherwise; private repositories need the integration.
- The repository fields are remembered per project in your browser.

Product spec text and repository files are passed to the model as reference data in delimited blocks, never as instructions.

### 4. Use the Output

Click **Generate Plan**. The LLM performs a deep dive on the full step data for your selected tests only, and the result opens in three tabs:

**🤖 Agent Implementation Prompt (Claude Code / Cursor)** — the primary output. A complete, copy-ready prompt for a coding agent working in your test repository. It tells the agent to:

1. inspect the repository's existing Playwright config, fixtures and Page Objects first, and reuse them;
2. implement each selected case as one test titled `<test case key>: <title>`, following your conventions and the product spec;
3. wrap every manual step in `await test.step('<step>', async () => { ... })`, so [`@agnox/playwright-reporter`](../integrations/playwright-reporter.md) reports step-level progress back to Agnox;
4. run the new specs locally (three repeats) and fix them without weakening assertions;
5. call the [Agnox MCP](../developer-tools/mcp-server.md) tool `sync_test_cases` (the JSON payload is included) to link the new specs to the catalog.

Click **Copy Prompt for Claude Code / Cursor** and paste it into Claude Code, Cursor or Windsurf at the root of your test repository.

**📄 Playwright .spec.ts Scaffolds** — one code scaffold per spec file, with **Copy** and **Download** buttons.

**📊 Automation Strategy & ROI** — executive summary, risk breakdown and execution order, environment and architecture recommendations, a coverage map and implementation notes.

**Copy full document** copies the whole Markdown plan. Every plan is saved to your history automatically.

For the end-to-end workflow with coding agents, see [The 2027 Agentic QA Workflow](../playbooks/agentic-qa-workflow-mcp.md).

### Without an AI key

Organizations without their own AI key see a sample plan for an example web shop instead. Select tests and click **Show the sample plan** to see the same three tabs (agent prompt, spec scaffold and strategy). No AI call is made and none of your data is read.

---

## Plan History

Click **History** in the page header to open the saved plans sidebar. Click any previous plan to re-open it in the same tabs — no LLM call is made, it loads instantly from your saved history. Plans saved before the agent prompt was introduced open as a single Markdown document.

---
## Targeted Discovery (Filters)

Use the filter bar to narrow a scan before it runs:

- **Suite** — restrict to one named test suite
- **Tag** — restrict to tests carrying a specific tag

Filters are shown in a banner on the results screen when active. The `/filter-options` endpoint pre-populates these dropdowns with the distinct suite names and tags for the selected project — no manual entry required.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ai/automation-planner/discover` | Stage 1: metadata scan + LLM risk stratification |
| `POST` | `/api/ai/automation-planner/plan` | Stage 2: deep fetch + agent prompt, spec scaffolds and strategy (`/generate` is an alias) |
| `POST` | `/api/ai/automation-planner/repo-context` | Top-level tree and `playwright.config` of a GitHub repository (`{ projectId, url }`, no AI call) |
| `GET` | `/api/ai/automation-planner/history` | Last 20 saved plans for the org (optional `?projectId=`) |
| `GET` | `/api/ai/automation-planner/filter-options` | Distinct suites and tags for a project (`?projectId=` required) |

All endpoints require standard JWT auth. `discover`, `plan` and `repo-context` require `aiFeatures.automationPlanner === true`.

**Selection limit:** A maximum of 30 tests can be submitted per generation. Requests exceeding this return HTTP 400.

---

## Security

- Every data access is scoped to your organization and project — cross-tenant access is structurally impossible.
- The `projectId` is verified against the calling org before any data is fetched.
- After the Stage 2 DB fetch, all returned documents are re-validated to belong to the calling org (defence-in-depth).
- Test steps are embedded as structured JSON in the LLM prompt — never raw string interpolation — to neutralise prompt injection via test step content.

---

## Related

- [AI Configuration & BYOK →](./configuration)
- [Spec-to-Test Generation →](./spec-to-test)
- [Smart Test Optimizer →](./test-optimizer)
