# Changelog

Customer-facing release notes for the Agnox platform and the `@agnox/playwright-reporter` package.
This project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Local runs are kept apart from CI runs.** `@agnox/playwright-reporter` v2.5.0 reports a run from a developer machine as **Local** and a run in CI (`CI`, `GITHUB_ACTIONS`, `GITLAB_CI`, `JENKINS_URL`, `TF_BUILD`, `CIRCLECI`, `BITBUCKET_BUILD_NUMBER`, `BUILDKITE`, `TEAMCITY_VERSION` or `TRAVIS` set) as **External CI**. Local runs never count in Pass Rate, Stability Score, trends, flaky-test detection, auto-quarantine or failure clusters. On the Executions page they carry a **Local** badge and appear under the new **Local** source filter; a new project whose only runs are local shows them with a banner, so the first run from a laptop appears right away. Local runs count toward External CI Runs, never toward Agnox Hosted Runs. New reporter options: `ciOnly: true` (or `AGNOX_CI_ONLY=true`) reports only from CI, and `AGNOX_REPORT=true` forces reporting of one local run; `source` overrides the detection. Older reporters keep reporting External CI runs. The public API (`GET /api/v1/executions`), the MCP tool `list_recent_executions` and `agnox runs list` return each run's source and accept a `source` filter.
- **Sample project (1-click demo).** A project with no runs shows a quickstart card: load sample data (12 runs, a failure cluster with its root cause, a quarantined flaky test and 12 test cases), copy the Playwright reporter setup with your project ID and a freshly generated API key, or import test cases / connect MCP. Sample runs are marked **Demo**, never count against run quotas and can be removed in one click. Loading the sample data also turns on the **Stability** page for the organization, so its failure clusters and quarantined test can be opened straight away.
- **Product video on the landing page.** A 72-second product film plays in the hero of `agnox.dev`, built from the real dashboard: connecting the reporter and MCP server, importing test cases, Smart PR, stability grades with auto-quarantine, grouped artifacts with AI root cause, and a coding agent fixing a failure over MCP. It plays as a silent, captioned preview; **Watch the full film with sound** restarts it with audio and player controls. Visitors who prefer reduced motion see a still until they press that button. If the video cannot be loaded, the interactive preview is shown instead.
- **Public landing page** at `agnox.dev` for signed-out visitors, with the MCP server and CLI workflows, supported migration sources and plan pricing. Signed-in users still land on the dashboard.
- **`@agnox/playwright-reporter` v2.4.0: test steps.** The titles of a test's top-level `test.step()` blocks are reported with its result and become the **Steps** of its automated test case. The steps follow the code: when a later passing run reports different steps, the test case is updated. Hooks, fixtures and Playwright API calls are not reported, so typed values never reach the catalog. Tests run on Agnox infrastructure get the same steps. A test without `test.step()` keeps an empty step list.
- **`@agnox/mcp-server` v1.1.0: `get_failing_test_context`.** A new MCP tool returns the context of one failing test, by test id or title, instead of the whole run: its error, a short stack snippet, the last `test.step()` reached, spec file, a link to the report and its stability context (grade, pass rate on `main` vs the current branch, and whether the failure looks like a branch regression or a known flake). It defaults to the project's latest failed run, so a coding agent can ask about a single test with far less context.
- **Start Cycle.** A test cycle that has not started shows a **Start Cycle** button. Recording the first result also starts it, so a manual cycle no longer refuses results with "cycle is not in a RUNNING state".
- **Stability page: Test health.** Stability grades (A–F) across the project, a **Quarantined Tests** list with one-click un-quarantine and a link to each test case, and a **Flaky Tests** list (grade C, D or F, worst first), above Recurring Failures and the AI group analysis. These lists need no AI key.
- **Ask AI and Automation Planner previews.** Without an AI key, both pages stay in the sidebar and show how to connect your key (BYOK) with a link to Settings → AI Models, plus sample questions with answers and a sample automation plan. The samples make no AI call.
- **A project from the first minute.** A new organization starts with a project named **My First Project**, so the quickstart (sample data, reporter setup, test case import) is the first thing a new account sees. An organization that has no project gets the same quickstart with a **Create project** step.
- **Test Cases: resizable panes.** Drag the edge of the Folders sidebar or of the test case drawer to resize it, or focus the edge and use the arrow keys; double-click returns to the default. Agnox remembers both widths in your browser. The full-screen view is unchanged.
- **Test Cycles follow your folders.** The cycle builder shows test cases in their folder tree, and a folder's checkbox selects everything under it, sub-folders included. An opened cycle lists its tests under the same folders. Test cases imported from Qase, TestRail, Xray, Zephyr Scale or CSV keep their folders here instead of appearing under Uncategorized.
- **Automation Planner: folders and spec scaffolds.** The planner groups and filters manual test cases by folder, so imported cases can be scanned folder by folder. The generated plan has a **Spec Scaffolds** section: one spec file per folder with a test per manual case, its preconditions as setup, every step as a named step and every expected result as an assertion. Where a manual case does not say enough to write code, the scaffold has a TODO instead of a guess.
- **Ask AI: project scope.** Questions are answered for the project selected in the sidebar, and the page says which one.

### Changed
- **Artifacts tab.** A run's screenshots, videos and traces are grouped by test, each group showing the test's status and file counts, with a **Run-Level Artifacts** group for the rest. Search by test or file name and filter by type (All, Screenshots, Videos, Traces). Groups collapse, and a large run opens with only the first group expanded.
- **Dashboard layout.** Execution source (All, Agnox Hosted, External CI) sits under the KPI cards; status, environment, date and group filters share one toolbar row with the run count, the view toggle and the Columns menu. Trigger and CI badges are neutral, so a row's status stands out.
- **Test cycle report.** The report follows the light or dark theme (with a toggle on the page) and shows the cycle's details, a progress bar by outcome (Passed, Failed, Blocked, Untested), summary cards and a test breakdown table. A skipped test is reported as Blocked. Printing always uses the light theme.
- **Long text.** Test titles in drawers and lists wrap to two lines, and any title, path or error that is still cut off shows in full on hover, without delay.
- **In-app explanations.** An info icon explains Agnox Hosted, External CI, Smart PR, manual and CI test cycles, recurring failures, the stability score (A–F) and quarantine where they appear.
- **Artifacts of a run in progress.** The Artifacts tab is available while a run is still going: it says the run is in progress, refreshes on its own and has a Refresh button. A file that is not complete yet is shown as still being written instead of a broken image.
- **Automation Planner** uses the same dark theme colours as the rest of the app and selects the active project when it opens.
- **Settings → Features without an AI key.** AI features that call your AI provider are marked **LLM-powered** and their switches are locked until the organization adds an AI API key; **Open AI Models** takes you to the tab where the key is added. **Flakiness & Stability Detective** is marked **Statistical + LLM** and can be turned on without a key: stability grades, the flaky test list and quarantine need none, only the written group analysis does.
- **Docker image notice.** The dashboard no longer asks every project to configure a Docker image. The notice appears in the Run dialog, where an Agnox Hosted run is started, and the image can be entered there for a single run. Projects that report from their own CI or hold manual test cases never see it.
- **Test case editor.** Description and Preconditions grow with their content and can be dragged taller. Every step shows **Action** and **Expected Result** labels above its fields.
- **Automation Planner** scans manual test cases only and reports how many cases are already automated. A test case the AI leaves out of its ranking is still listed, with a default risk level.
- **Ask AI** answers questions about test cycles (pass rates, items by status or folder), test case folders, severity, tags, stability grades and individual test results. When a question finds no data, the answer says what was searched instead of reporting zero.

### Fixed
- Test cases imported into folders were all listed under **Uncategorized** when building a test cycle.
- A test cycle could not be created from imported test cases whose steps have an action and no expected result.
- Ask AI could not answer questions about test cycle results: it looked for fields that test cycles do not have.
- Results could not be recorded in a manual test cycle, because nothing moved the cycle from PENDING to RUNNING.
- Saving an automated test case no longer removes steps that have no expected result.

## [3.30.0] — 2026-11-12

### Added
- **`@agnox/playwright-reporter` v2.3.0: automatic artifact uploads.** Screenshots, videos and traces from External CI runs are uploaded to Agnox automatically and appear on the run in the dashboard. Control it with the `uploadArtifacts` option: `'failed-only'` (default), `'all'` or `'none'`. Limits: 25 MB per file and 150 MB per run; larger files are skipped and never fail your test run.
- **Data retention by plan.** Runs and their artifacts are kept for 7 days (Free), 14 days (Starter), 30 days (Team) or 90 days (Business); Enterprise retention is configurable. Expired and deleted runs are cleaned up automatically every day, and the freed space is reflected in your storage usage.
- **Concurrent run limits.** Agnox Hosted Runs respect your plan's concurrency limit; additional runs wait in the queue instead of failing.
- **CI & Webhooks API reference.** New documentation for `POST /api/ci/trigger`, `POST /api/webhooks/ci/pr` and API key creation, with GitHub Actions, GitLab CI, Azure DevOps and Bitbucket examples.

### Changed
- **Separate run quotas.** Monthly usage is now tracked separately for **Agnox Hosted Runs** (executed on Agnox infrastructure) and **External CI Runs** (reported from your own CI with the Playwright reporter). Both reset on the first day of each calendar month. Plans: Free, Starter ($39/mo), Team ($99/mo), Business ($249/mo) and Enterprise.
- **Hosted runs on multiple architectures.** The Docker setup guide now recommends multi-arch images (`docker buildx build --platform linux/amd64,linux/arm64`), and a clear error is shown when an image does not match the runner's architecture.
- **Reporter reliability.** The reporter caps end-of-run reporting at 15 seconds and stops retrying when Agnox is unreachable, so it never slows down or breaks your pipeline.
- **Documentation overhaul.** Quick Start, Playwright Reporter, GitHub Actions, Docker Setup, AI configuration (BYOK), billing and API pages were rewritten to match the current product.

### Fixed
- High-volume CI reporting is no longer throttled by the general per-IP rate limit.
- Secret values passed to a single run are redacted from that run's logs.

## [3.29.0] — 2026-11-11

### Added
- **Bring Your Own Key (BYOK) AI.** All AI features run on your organization's own provider key (stored encrypted with AES-256-GCM, billed by your provider with no Agnox markup). Adding a key unlocks every capability tier (Fast, Balanced, Deep reasoning) on every plan. Without a key, AI entry points are hidden and Smart PR Routing runs all tests.
- **AI model tiers and fallback**, cross-run failure correlation, locator self-healing suggestions and history-aware Smart PR Routing.
- **Stability grades and quarantine.** Tests get a stability grade; flaky tests can be quarantined automatically or manually.
- **Opt-in CI test cycles.** The reporter (v2.2.0) can create a test cycle per CI run (`createCycle`) or report into an existing one (`cycleId`).
- **Project deletion**, schedule editing, pausing and "Run Now".

### Changed
- Paginated test case and test cycle lists for large projects.
- A unified "Create issue" dialog for all issue trackers.
- In-app toast notifications replace browser alerts.
- Security hardening across the platform.

## [3.28.0]

### Added
- **Test Cases upgrade:** folder tree, readable `AG-TC-` IDs, severity and type fields, tags, a full-page editor, quick-add, deep links and drag-and-drop reordering.

## [3.27.0]

### Added
- Search and filters for test cycles and test cases.

## [3.26.0]

### Added
- Separate **Manual** and **CI** tabs on the Test Cycles page.

## [3.25.0]

### Added
- **`@agnox/playwright-reporter` v2.0.0: runtime context capture.** An automatic fixture records console output, network failures and page context for every test. Import `test` and `expect` from the reporter to enable it.

## [3.24.0]

### Added
- **Automation Planner** — AI-assisted planning that turns manual test cases into a prioritized automation backlog.

## [3.22.0]

### Added
- **Global project selector** across the dashboard.
- **Five plan tiers** with storage usage tracking.
- **Spec-to-Test** — generate test cases from a requirements document.
- Bulk and suite-level deletion of test cases, test cycle deletion and integration unlinking.
- **AI Models** settings tab.

## [3.21.0]

### Added
- **Monday.com** integration.
- **Generic outbound webhook** with HMAC signature (`x-agnox-signature`) for verifying deliveries.

## [3.20.0]

### Added
- **Linear** integration.

## [3.19.0]

### Added
- AI root-cause comments on **Bitbucket** pull requests.

## [3.18.0]

### Added
- **Microsoft Teams** notifications.

## [3.17.0]

### Added
- Smart PR Routing badge and AI reasoning on runs; routed runs are grouped under `Smart-PR-Run` by default.

## [3.15.0]

### Added
- Smart PR Routing uses push and pull-request context and a test manifest; target environment can be set with `?env=`.

## [3.14.0]

### Added
- The AI model used is recorded on every analysis.

## [3.13.0]

### Added
- Test stability scores, automatic quarantine of flaky tests and failure clustering.

## [3.12.0]

### Added
- New documentation site at `docs.agnox.dev`.
- HMAC signature verification for incoming webhooks.
- Prompt-injection protection for the quality chatbot.

## [3.10.0]

### Added
- **AI Quality Orchestrator:** Auto-Bug Generation, Flakiness Detective, Test Optimizer, Smart PR Routing and the Quality Chatbot, all powered by your own AI key (BYOK).

## [3.9.0]

### Added
- **Getting Started checklist** with guided tours for configuring a project, launching your first run and exploring the platform. Re-open it any time from the sidebar.

## [3.8.0]

### Added
- **`@agnox/playwright-reporter`** — the official Playwright reporter that streams results from your own CI to Agnox in real time. Reporter failures never affect your test suite.
- **Source filter** on the dashboard to separate Agnox Hosted runs from External CI runs.

## [3.7.0]

### Added
- `POST /api/ci/trigger` accepts API key authentication (`x-api-key`).
- Project ID shown with a copy button in Run Settings.

## [3.6.0]

### Changed
- More accurate AI Root Cause Analysis: a second validation pass checks every finding against the logs, and more log context is analyzed.

## [3.4.0]

### Added
- **Environment variables and secrets** per project. Secrets are encrypted (AES-256-GCM), always masked in the dashboard and API, and redacted from run logs.

## [3.3.0]

### Added
- **Slack notifications** with configurable statuses (Passed, Failed, Error, Unstable).
- "Connected" badges on integration cards.

### Changed
- Rebranded to **Agnox**.

### Fixed
- Slack links open the correct run.
- Accurate test counts in CI pull-request comments.
- Logout now revokes the session on the server.

## [3.2.0]

### Added
- **Native CI/CD integrations:** AI root-cause comments on GitHub, GitLab and Azure DevOps pull requests.
- `POST /api/ci/trigger` to start test cycles from your pipeline.

### Changed
- Integration tokens are encrypted at rest (AES-256-GCM).

## [3.1.0]

### Added
- **Printable test cycle reports.**
- Organization-level feature toggles for the Manual Test Repository and Hybrid Cycles.
- The current version is shown in the dashboard.

## [1.1.0]

### Added
- **Quality Hub:** test case repository with AI-generated steps, hybrid manual + automated test cycles and an interactive manual execution player.
