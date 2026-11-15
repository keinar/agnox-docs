# Changelog

Customer-facing release notes for the Agnox platform and the `@agnox/playwright-reporter` package.
This project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Sample project (1-click demo).** A project with no runs shows a quickstart card: load sample data (12 runs, a failure cluster with its root cause, a quarantined flaky test and 12 test cases), copy the Playwright reporter setup with your project ID and a freshly generated API key, or import test cases / connect MCP. Sample runs are marked **Demo**, never count against run quotas and can be removed in one click. Loading the sample data also turns on the **Stability** page for the organization, so its failure clusters and quarantined test can be opened straight away.
- **Public landing page** at `agnox.dev` for signed-out visitors, with the MCP server and CLI workflows, supported migration sources and plan pricing. Signed-in users still land on the dashboard.

### Changed
- **Artifacts tab.** A run's screenshots, videos and traces are grouped by test, each group showing the test's status and file counts, with a **Run-Level Artifacts** group for the rest. Search by test or file name and filter by type (All, Screenshots, Videos, Traces). Groups collapse, and a large run opens with only the first group expanded.
- **Dashboard layout.** Execution source (All, Agnox Hosted, External CI) sits under the KPI cards; status, environment, date and group filters share one toolbar row with the run count, the view toggle and the Columns menu. Trigger and CI badges are neutral, so a row's status stands out.
- **Test cycle report.** The report follows the light or dark theme (with a toggle on the page) and shows the cycle's details, a progress bar by outcome (Passed, Failed, Blocked, Untested), summary cards and a test breakdown table. A skipped test is reported as Blocked. Printing always uses the light theme.
- **Long text.** Test titles in drawers and lists wrap to two lines, and any title, path or error that is still cut off shows in full on hover, without delay.
- **In-app explanations.** An info icon explains Agnox Hosted, External CI, Smart PR, manual and CI test cycles, recurring failures, the stability score (A–F) and quarantine where they appear.

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
