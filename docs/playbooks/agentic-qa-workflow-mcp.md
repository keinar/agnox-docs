---
id: agentic-qa-workflow-mcp
title: The 2027 Agentic QA Workflow (Claude Code, Cursor & Agnox MCP)
sidebar_label: Agentic QA Workflow (MCP)
sidebar_position: 2
description: How to combine the Agnox Automation Planner's Agent Implementation Prompt with @agnox/mcp-server so AI coding agents author, triage, quarantine and heal Playwright tests inside your IDE.
keywords: [claude code, cursor, windsurf, mcp, model context protocol, ai test automation, playwright, agentic qa]
---

# The 2027 Agentic QA Workflow (Claude Code, Cursor & Agnox MCP)

Coding agents such as Claude Code, Cursor and Windsurf can now write, run and fix Playwright tests on their own. What they lack is **context**: which manual cases matter, how your repository is organised, what failed last night and why. Without it, they generate isolated spec files that ignore your fixtures and drift from the product.

The workflow below gives the agent that context from two directions:

- **Before coding**, the [Automation Planner](../ai-capabilities/automation-planner.md) produces an **Agent Implementation Prompt**: the selected manual cases, your product spec and your repository conventions, written as instructions for a coding agent.
- **While coding and after every run**, [`@agnox/mcp-server`](../developer-tools/mcp-server.md) lets the agent read failures, clusters and flaky tests from Agnox, and write back quarantine decisions and new test cases.

```text
 Manual cases ──► Automation Planner ──► Agent Implementation Prompt
                                                 │
                                                 ▼
                     ┌──────────── Coding agent in your IDE ────────────┐
                     │ inspect repo → implement → run → sync_test_cases │
                     └───────────────────────┬──────────────────────────┘
                                             │  @agnox/playwright-reporter
                                             ▼
                        Agnox: runs, steps, failure clusters, grades
                                             │  @agnox/mcp-server
                                             ▼
                     triage → heal → quarantine/release  (back in the IDE)
```

---

## 1. Set up once

**Reporter.** Add [`@agnox/playwright-reporter`](../integrations/playwright-reporter.md) to `playwright.config.ts` so every local and CI run, including each `test.step()`, reaches Agnox.

**MCP server.** Register the server with your agent. For Claude Code:

```bash
claude mcp add agnox \
  -e AGNOX_API_KEY=<your key> \
  -e AGNOX_PROJECT_ID=<project id> \
  -- npx -y @agnox/mcp-server
```

For Cursor, Windsurf and Claude Desktop, use the `mcpServers` block shown in the [MCP Server guide](../developer-tools/mcp-server.md#quickstart). The server exposes six tools:

| Tool | Used for |
|---|---|
| `list_recent_executions` | Find the run to look at |
| `get_execution_failures` | Error, spec file, failure signature, test key and page context (URL, test ids, DOM snapshot) of each failed test |
| `list_failure_clusters` | Group failures by signature to tell one systemic cause from many bugs |
| `get_flaky_and_quarantined_tests` | Tests graded D/F, and tests already quarantined |
| `toggle_test_quarantine` | Quarantine or release a test |
| `sync_test_cases` | Register automated specs as Agnox test cases |

**Project context.** Put your conventions where the agent reads them: a `CLAUDE.md`, `.cursor/rules` or `AGENTS.md` that names the fixtures module, the Page Objects folder and the selector strategy. The agent prompt tells the agent to read these first.

---

## 2. Author: from manual case to merged spec

### Plan

1. In **Automation Planner**, scan the project and select the manual cases to automate. Risk ranking puts revenue paths and authentication first.
2. Click **Generate Plan**. Before generating, open the context panel:
   - **Product Spec & Requirements Context** — upload a `.md`, `.txt` or `.json` PRD, or paste user stories and acceptance criteria. Expected results that the manual steps leave vague are taken from here.
   - **Repository & Architecture Context** — the repository (`owner/repo`), base URL, auth fixture, Page Objects folder and any folder or fixture conventions. If the project has a GitHub integration (or the repository is public), **Read from GitHub** pulls the top-level tree and `playwright.config` so the plan matches the real layout.
3. Open the **Agent Implementation Prompt** tab and click **Copy Prompt for Claude Code / Cursor**.

### Implement

Paste the prompt into Claude Code, Cursor or Windsurf at the root of the test repository. It tells the agent to:

1. **Inspect first** — read `playwright.config`, the fixtures, Page Objects, auth helpers and a few existing specs, and reuse them instead of creating a parallel structure.
2. **Implement each case** as one test titled `<test case key>: <title>`, wrapping every manual step in `await test.step('<step>', async () => { ... })` with the expected result as an assertion inside the step.
3. **Verify locally**, running the new specs three times (`--repeat-each=3`) without weakening assertions or adding fixed waits.
4. **Link back** by calling `sync_test_cases` with the file and title path of every new test.

The **Playwright .spec.ts Scaffolds** tab holds a starting point for each file if you prefer to review code before handing over to the agent, and **Automation Strategy & ROI** explains the order and the reasoning.

Product spec text and repository files are passed to the planner model as reference data inside delimited blocks, never as instructions, and the spec itself is not stored with the plan.

### Review

Treat the agent's change like any pull request. Check that:

- every step name matches the manual case, so step-level results in Agnox read like the manual run;
- no selector, URL or credential was invented (the prompt asks the agent to leave a `// TODO:` instead);
- the tests use your fixtures, not new ad-hoc setup.

---

## 3. Triage: let the agent read the failure first

When a run goes red, ask the agent in the IDE rather than opening the dashboard:

> "Look at the latest failed run in Agnox and tell me whether it's one problem or several."

The agent calls `list_recent_executions` with `{ "status": "FAILED", "limit": 1 }`, then `list_failure_clusters`. One cluster covering most of the failures usually means a shared cause (an expired login, a service down, a changed API) rather than many separate bugs. Fix that once.

For a single failure, `get_execution_failures` returns the error, the spec file, and the page context captured at failure: the URL, the `data-testid` values on the page and a DOM snapshot. That is usually enough for the agent to tell a product bug from a test bug without re-running anything.

Everything the MCP server returns from a test run sits under `untrusted_data`. The tool descriptions tell the agent to treat it as data, never as instructions, so text on a page under test cannot steer the agent.

---

## 4. Heal: fix the test, prove the fix

For a broken locator, the snapshot and test ids from `get_execution_failures` let the agent propose a new selector that exists on the page. Ask it to:

1. update the Page Object, not the spec, so every test using that element is fixed at once;
2. prefer `getByRole` / `getByTestId` over CSS or XPath;
3. run the affected spec with `--repeat-each=3` before calling it fixed.

If the failure is a product bug, the right outcome is a bug report, not a greener test. [Auto-Bug](../ai-capabilities/auto-bug.md) drafts one from the same failure data.

---

## 5. Quarantine: a decision, not a reflex

When a test is flaky and the fix will take time, quarantining keeps CI honest without blocking everyone:

> "Which tests in this project are flaky right now? Quarantine `checkout › pays with card` until the payment sandbox is stable."

The agent calls `get_flaky_and_quarantined_tests`, then `toggle_test_quarantine` with the test key. Quarantined failures stop failing reporter runs (the quality gate passes only when every failure belongs to a quarantined test and every result arrived). Release the test with the same tool once the fix lands. See [Flakiness Governance](./flakiness-governance-at-scale.md) for when to quarantine and when not to.

Write tools carry MCP `destructiveHint` annotations, so clients can ask before running them. Keep that confirmation on for `toggle_test_quarantine`.

---

## Guardrails that make this safe

| Risk | Guardrail |
|---|---|
| Agent invents selectors or credentials | The prompt forbids it and asks for `// TODO:` markers; review catches the rest |
| Agent "fixes" a test by weakening it | The prompt forbids weakening assertions or adding fixed waits; require `--repeat-each=3` |
| Quarantine used to hide real bugs | Confirm write tools; review quarantined tests weekly |
| Prompt injection from pages under test | MCP results are wrapped as `untrusted_data`; spec and repo context are passed to the planner as delimited data |
| API key leaks | The MCP server sends the key only in `x-api-key`, never logs it and never follows redirects |

---

## Related

- [Automation Planner →](../ai-capabilities/automation-planner.md)
- [MCP Server →](../developer-tools/mcp-server.md)
- [Architecting Scalable Playwright Suites →](./scalable-playwright-architecture.md)
- [Flakiness Governance & Stability Engineering →](./flakiness-governance-at-scale.md)
