---
id: automation-planner
title: Automation Planner
sidebar_position: 7
---

# Automation Planner

The **Automation Planner** (Phase 6 of the AI Quality Orchestrator) bridges the gap between manual QA work and automation engineering. It analyses your existing manual test case library, assigns risk-based priority scores, and generates a copy-paste-ready **Markdown automation strategy document** formatted for direct use in Cursor, GitHub Copilot, or any IDE AI assistant.

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
  POST /api/ai/automation-planner/generate
  ↓ Fetches full step data ONLY for selected tests
  ↓ LLM generates a complete Markdown automation strategy document
  ↓ Saved to automationPlans collection for future retrieval
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

### 3. Select Tests and Generate

Check the tests you want to automate (up to 30). A sticky bottom bar appears showing the selection count. Click **Generate Plan** to open the Artifact Modal.

In the modal, choose your **framework** (Playwright, Cypress, Pytest, Vitest, Jest, WebdriverIO) and **design pattern** (Page Object, Screenplay, Fixture, Fluent, Data-Driven), then click **Generate**.

The LLM performs a deep dive on the full step data for your selected tests only and produces a Markdown document containing:

1. **Executive Summary** — what's being automated, business value, coverage improvement estimate
2. **Prerequisites & Environment Setup** — install commands, environment variables, test data notes
3. **Recommended Folder & File Structure** — framework-specific directory layout
4. **Test Coverage Map** — table of suite, test title, priority, and automation notes
5. **Implementation Notes** — per-suite strategy, tricky assertions, shared fixtures
6. **Master AI Coding Prompt** — a single fenced block you paste into Cursor or GitHub Copilot to scaffold the full test suite

### 4. Copy or Download

Use the **Copy** button (clipboard icon) or **Download as .md** to save the artifact. The plan is also automatically saved to your history.

---

## Plan History

Click **History** in the page header to open the saved plans sidebar. Click any previous plan to re-open its Markdown artifact — no LLM call is made, it loads instantly from the `automationPlans` MongoDB collection.

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
| `POST` | `/api/ai/automation-planner/generate` | Stage 2: deep fetch + Markdown artifact generation |
| `GET` | `/api/ai/automation-planner/history` | Last 20 saved plans for the org (optional `?projectId=`) |
| `GET` | `/api/ai/automation-planner/filter-options` | Distinct suites and tags for a project (`?projectId=` required) |

All endpoints require standard JWT auth. `discover` and `generate` require `aiFeatures.automationPlanner === true`.

**Selection limit:** A maximum of 30 tests can be submitted per generation. Requests exceeding this return HTTP 400.

---

## Security

- Every MongoDB query enforces `{ organizationId, projectId }` — cross-tenant access is structurally impossible.
- The `projectId` is verified against the calling org before any data is fetched.
- After the Stage 2 DB fetch, all returned documents are re-validated to belong to the calling org (defence-in-depth).
- Test steps are embedded as structured JSON in the LLM prompt — never raw string interpolation — to neutralise prompt injection via test step content.

---

## Related

- [AI Configuration & BYOK →](./configuration)
- [Spec-to-Test Generation →](./spec-to-test)
- [Smart Test Optimizer →](./test-optimizer)
- [Technical Design Document →](../architecture/phase-6-ai-automation-planner)
