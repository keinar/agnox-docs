# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/).

## [3.25.1] — 2026-03-19

### Changed
- `docs/getting-started/intro.md` — Updated AI feature count from six to seven; added Automation Planner bullet and Navigation entry.
- `README.md` — Added Automation Planner and Spec-to-Test to AI Providers description and Tech Stack; added v3.25.0 Phase 8.1 row to Project Status table.
- `PROJECT_CONTEXT.md` — Added `aiFeatures.automationPlanner` field to organizations schema block.
- `package.json` — Version bumped `3.25.0` → `3.25.1`.

---

## [3.25.0] — 2026-03-18

### Added
- **Phase 8.1 — Framework-Agnostic Runtime Context:** `packages/playwright-reporter/src/fixtures.ts` — new `_agnoxContextCapture` auto-fixture (`{ auto: true }`) captures structured `IRuntimeContext` (failureUrl, pageTitle, consoleErrors, networkErrors, domSnapshot via ARIA tree, viewportSize, retryIndex) from the live Playwright browser at the exact moment of test failure. Zero individual test-file modifications required.
- `test` and `expect` re-exported from `@agnox/playwright-reporter/index.ts` — customers opt in by updating a single shared fixtures file; all other test files remain untouched.
- `IRuntimeContext` and `INetworkError` interfaces added to `packages/playwright-reporter/src/types.ts`.

### Changed
- `@agnox/playwright-reporter` bumped to **v2.0.0** (backwards-compatible; v1.x configs continue to work without changes).
- `onTestEnd` in `packages/playwright-reporter/src/index.ts` reads the `agnox:runtimeContext` annotation written by the auto-fixture and includes `runtimeContext` in the `test-end` ingest event.
- Updated `docs/architecture/runtime-context-agnostic-design.md` status from PROPOSED to Phase 8.1 IMPLEMENTED. Phases 8.2 (Cypress) and 8.3 (Pytest) remain planned.
- Updated `PROJECT_CONTEXT.md` to v3.25.0 with Phase 8.1 feature entry and `fixtures.ts` in the monorepo structure map.
- Updated `README.md` Native Playwright Reporter section to document v2.0 auto-fixture and optional one-line migration.
- Updated `PUBLIC_README.md` with structured failure context bullet point.

---

## [3.24.0] — 2026-03-17

### Added
- **AI Automation Planner (Phase 6):** `POST /api/ai/automation-planner/discover` — Stage 1 metadata scan with optional `suite`/`tags` pre-scan filters; sends compact test-case metadata to the LLM for 4-level risk stratification (CRITICAL/HIGH/MEDIUM/LOW) grouped by suite; graceful fallback to ungrouped MEDIUM risk on LLM failure.
- **AI Automation Planner (Phase 6):** `POST /api/ai/automation-planner/generate` — Stage 2 deep-dive; fetches full step data only for selected tests (max 30); LLM generates a 6-section GitHub-flavoured Markdown automation strategy document; safety-net extractor handles JSON-wrapped model responses; result persisted to new `automationPlans` collection.
- **AI Automation Planner (Phase 6):** `GET /api/ai/automation-planner/history` — last 20 saved plans for the org, optionally filtered by `?projectId=`.
- **AI Automation Planner (Phase 6):** `GET /api/ai/automation-planner/filter-options` — distinct suite names and flattened tag values for filter bar dropdowns; no LLM call.
- `automationPlans` MongoDB collection with compound indexes `{ organizationId, createdAt }` and `{ organizationId, projectId, createdAt }` (migration 015).
- `aiFeatures.automationPlanner?: boolean` field added to `IAiFeatureFlags` in `packages/shared-types/index.ts`.
- `AutomationPlannerPage.tsx` — full UI with `SuiteGroup`, `HistoryPanel`, `FilterBar`, and `RiskBadge` sub-components; phases: idle → scanning → results; 30-test selection cap enforced client-side.
- `ArtifactModal.tsx` — full-screen Markdown artifact viewer with copy-to-clipboard and download-as-`.md` controls; handles both new generation (calls `/generate`) and history re-open (pre-populated markdown, no LLM call).
- `Wand2` sidebar nav entry with `aiFlag: 'automationPlanner'`; `FeatureGatedRoute` at `/automation-planner`.
- Migration 014: backfills `aiFeatures.automationPlanner = true` on all existing organizations.
- Migration 015: creates `automationPlans` collection and indexes.
- New doc page `docs/ai-capabilities/automation-planner.md`.

### Changed
- `docs/architecture/phase-6-ai-automation-planner.md` status updated from "Design / Pre-implementation" to "Completed ✅"; endpoints, collection name, risk levels, migration numbers, frontend component map, and sidebar icon corrected to match implementation.
- `docs/ai-capabilities/configuration.md` feature count updated to seven; `automationPlanner` flag added to the feature flags table and Related section; Automation Planner two-stage architecture note added.
- `PROJECT_CONTEXT.md` header updated to v3.24.0 / Phase v6.0; Phase 24 entry added to product features table; `automationPlans` collection added to MongoDB schema; automation-planner routes added to API routes table; migrations list extended to 014/015; docs directory structure corrected to reflect actual Docusaurus layout; `/automation-planner` added to frontend routing map; endpoint count updated to 80+.
- `README.md` AI Orchestrator feature list and sprint table updated to include v3.24.0.
- `PUBLIC_README.md` capability table updated to include Automation Planner.
- Root `package.json` version bumped 3.23.0 → 3.24.0.

### Purged (Ghost Content)
- Stale docs directory paths (`docs/architecture/overview.md`, `docs/api/`, `docs/setup/`, `docs/features/`, `docs/integration/`, `docs/deployment/`, `docs/system/`) removed from `PROJECT_CONTEXT.md` — these paths no longer exist; content lives in the Docusaurus tree.
- "Design / Pre-implementation" status label removed from phase-6 architecture doc.
- Incorrect endpoint names (`/tree`, `/briefs`, `/briefs/:briefId`) purged from phase-6 doc.
- Incorrect collection name `automation_briefs` purged from phase-6 doc.
- Incorrect migration number `011` purged from phase-6 doc.
- 3-level risk scale (HIGH/MED/LOW) replaced with 4-level (CRITICAL/HIGH/MEDIUM/LOW).
- Incorrect sidebar icon reference `Bot` replaced with actual icon `Wand2`.
- Incorrect sub-component file listing replaced with accurate co-located structure.

## [3.23.0] — 2026-03-17

### Changed
- `docs/getting-started/intro.md` — Updated AI Quality Orchestrator feature count from 5 to 6 (added Spec-to-Test Generation); expanded Enterprise Connectors description to include Linear, Monday.com, MS Teams, and Generic Webhook.
- `docs/architecture/system-overview.md` — Replaced `Google Gemini AI` diagram node with `AI Providers (BYOK)`; replaced `Slack` node with `Notifications & Webhooks`; added Global Project Selector to Dashboard Client features; renamed "Security" settings tab to "AI Models"; added new producer routes (spec-to-tests, monday, integration unlinking, bulk/suite test-case deletion, cycle deletion); updated Dual-Agent diagram to remove Gemini model hardcode; added `ingest_sessions` collection and storage tracking notes; updated Worker analysisService description to multi-provider.
- `docs/architecture/deployment.md` — Bumped version header from 3.5.0 to 3.23.0 and date to 2026-03-17.
- `docs/architecture/infrastructure.md` — Updated AI prerequisites section to reference multi-provider BYOK (Gemini/OpenAI/Anthropic); added `ENCRYPTION_KEY` and optional AI provider keys to `.env` template; updated AI Analysis step to mention multi-provider dual-agent pipeline; expanded troubleshooting table with startup guard note.
- `docs/architecture/ci-cd.md` — Updated `PLATFORM_GEMINI_API_KEY` description and AI Analysis troubleshooting row to reflect multi-provider BYOK.
- `docs/api-reference/authentication.md` — Corrected Free plan `maxTestRuns` from 100 to 50; added `maxConcurrentRuns` and `maxStorageBytes` to example limits object.
- `docs/api-reference/organizations.md` — Corrected Free plan `maxTestRuns` (100 → 50); added `maxStorageBytes` and `currentStorageUsedBytes` to limits; added Monday.com integration endpoints (`GET/PUT /api/integrations/monday`, `POST /api/monday/items`); added `DELETE /api/integrations/:provider` endpoint.
- `docs/api-reference/api-overview.md` — Added Integrations and PR Routing Webhook rows to the Endpoint Categories table.
- `docs/core-features/executions.md` — Replaced "Gemini-powered" with provider-agnostic description in Investigation Hub tab table.
- `docs/integrations/slack.md` — Added Monday.com, MS Teams, and Generic Webhook to the Other Connectors list.
- `docs/integrations/overview.md` — Corrected MS Teams card description from "Adaptive Card" to "MessageCard".
- `README.md` — Updated billing description from 3 tiers to 5 tiers; added Spec-to-Test to AI Quality Orchestrator capability list; added v3.19.0–v3.22.0 entries to project status table and Q1 2026 roadmap.
- `package.json` — Version bumped from `3.22.0` to `3.23.0`.

- `docs/core-features/executions.md` — Removed "Phase 5 introduces" prefix from Auto-Quarantine section (feature is shipped, not planned).
- `docs/ai-capabilities/flakiness-detective.md` — Removed "Phase 5 introduces" prefix and "Smart Execution Analytics (Phase 5)" heading; feature is fully shipped.

### Ghosts Purged
- `docs/architecture/system-overview.md`: `Google Gemini AI` diagram node (platform has been multi-provider BYOK since v3.10.0).
- `docs/architecture/system-overview.md`: Dual-Agent pipeline hardcoded `gemini-2.5-flash` model strings — replaced with resolver reference.
- `docs/architecture/system-overview.md`: Settings sidebar listed "Security" tab — renamed to "AI Models" in v3.22.0.
- `docs/architecture/deployment.md`: Stale version header `3.5.0 / February 27, 2026`.
- `docs/architecture/infrastructure.md`: Single-provider AI prerequisite (Gemini only).
- `docs/architecture/ci-cd.md`: Single-provider AI analysis troubleshooting.
- `docs/api-reference/authentication.md`: `maxTestRuns: 100` for Free plan (Free plan limit is 50 as of v3.22.0).
- `docs/api-reference/organizations.md`: Missing storage limit fields and missing Monday.com/unlink integration endpoints.
- `docs/integrations/overview.md`: "Adaptive Card" description for MS Teams (actual format is `MessageCard`).
- `README.md`: 3-tier billing description ("Free, Team, and Enterprise tiers") after 5-tier model shipped in v3.22.0.
- `docs/core-features/executions.md`: "Phase 5 introduces" framing for Auto-Quarantine (now a shipped feature, not a phase preview).
- `docs/ai-capabilities/flakiness-detective.md`: "Phase 5 introduces" framing and "Smart Execution Analytics (Phase 5)" heading — feature has been live since v3.13.0.
- `docs/architecture/system-overview.md`: "(Sprint 9)" labels on `/api/test-cases/*`, `/api/test-cycles/*`, `test_cases`, and `test_cycles` — replaced with current capability descriptions.

## [3.22.0] — 2026-03-16

### Added
- **Global Project Selector (v5.0)** — `ProjectContext.tsx` provides a platform-wide `activeProjectId` persisted in `localStorage`. A project dropdown in `DashboardHeader.tsx` (and a mobile mirror in `Sidebar.tsx`) synchronises the context, URL `?project=` param, and all data-fetching hooks simultaneously. All executions, test cases, test cycles, analytics KPIs, grouped execution views, and the execution modal now filter strictly by `activeProjectId`. Migration 013 backfills `projectId` on all legacy executions, test_cases, and test_cycles records.
- **5-Tier Billing Model** — Plans expanded from 3 tiers (Free/Team/Enterprise) to 5 (Free/Starter/Business/Team/Enterprise). Canonical limits are now enforced from `plans.ts` as the single source of truth (`getCanonicalLimits()` helper); stale DB-stored limits are always overridden at query time.
  - Free: 50 runs/mo, 1 project, 3 users, 1 concurrent, 500 MB storage
  - Starter: $29/mo — 250 runs, 3 projects, 5 users, 2 concurrent, 2 GB
  - Team: $99/mo — 1,000 runs, unlimited projects, 20 users, 5 concurrent, 10 GB
  - Business: $299/mo — 2,500 runs, unlimited projects, 100 users, 15 concurrent, 50 GB, audit logs
  - Enterprise: Custom — unlimited, SSO, dedicated support, 500 GB
- **Storage Tracking (Dual Mechanism)** — Mechanism A: worker atomically `$inc`s `limits.currentStorageUsedBytes` on every execution finish. Mechanism B: `jobs/storage-reconciler.ts` nightly cron (02:00 UTC) recalculates true byte usage via MongoDB `$bsonSize` aggregation and corrects any drift. `enforceStorageLimit` preHandler added to `POST /api/execution-request`.
- **AI Spec-to-Test Generation (Feature F)** — `POST /api/ai/spec-to-tests` SSE streaming endpoint guarded by `specToTest` feature flag. Accepts multipart upload (PDF via `pdf-parse`, DOCX via `mammoth`, or Markdown/text, max 10 MB). Runs a 4-stage agentic pipeline: Stage 1 Extractor → Stage 2 Generator → Stage 3 Critic (dedup via MongoDB `$text` search + LLM grounding) → Stage 4 Formatter. SSE events stream per-stage progress and the final `complete` payload. Frontend: `SpecToTestModal.tsx` 3-step wizard (upload → live progress → review/import). Imports tests in 50-case chunks via `POST /api/test-cases/bulk`. "Import from Spec" button visible in Test Cases page when flag is enabled.
- **Bulk & Suite Deletion for Test Cases** — `DELETE /api/test-cases/bulk` (up to 100 IDs) and `DELETE /api/test-cases/suite` (all cases in a suite) added. Frontend shows an amber warning modal when any AUTOMATED test case is in the deletion selection.
- **Test Cycle Deletion** — `DELETE /api/test-cycles/:id` — returns 409 if cycle is currently `RUNNING`; hard-deletes otherwise. Confirmation dialog in `TestCycles.tsx`.
- **ManualExecutionDrawer re-marking** — `isEditable` prop allows QA engineers to re-mark steps while a cycle is `RUNNING`; completed cycles remain read-only.
- **Integration Unlinking** — `DELETE /api/integrations/:provider` (Admin only) `$unset`s encrypted credentials from the org document. `IntegrationsTab.tsx` gains unlink buttons with a confirmation modal for all configured providers.
- **Active Projects metric** — `UsageTab.tsx` gains a 4th metric card (Active Projects with limit). `GET /api/organization/usage` now returns `projects: { used, limit }`.
- **Spec-to-Test feature flag toggle** — `FeaturesTab.tsx` gains a Spec-to-Test Generation row under AI Features.
- **`SecurityTab` renamed to `AiModelsTab`** — Settings tab ID changed from `security` to `ai-models`; displayed label changed to "AI Models".

### Changed
- `packages/shared-types/index.ts` — `IAiFeatureFlags.specToTest` added; `OrganizationPlan` union expanded to `'free' | 'starter' | 'team' | 'business' | 'enterprise'`; `IOrganization.limits` gains `maxStorageBytes` and `currentStorageUsedBytes`.
- `apps/producer-service/src/config/plans.ts` — `maxStorage` renamed to `maxStorageBytes`; `starter` and `business` tiers added; `isUpgrade` order map extended.
- `migrations/011-add-spec-to-test-flag.ts` — backfills `aiFeatures.specToTest = false` and adds `$text` index on `test_cases.title`.
- `migrations/012-pricing-tiers.ts` — backfills per-tier `maxStorageBytes` and actual `currentStorageUsedBytes` via `$bsonSize` for all orgs.
- `migrations/013-assign-default-projects.ts` — backfills `projectId` on all executions, test_cases, and test_cycles records per org.

## [3.21.1] — 2026-03-16

### Changed
- `docs/integrations/webhooks.md` — Removed ghost features (multiple endpoints, retry logic, delivery log, configurable triggers, send-test-event) that were never implemented; corrected payload schema to flat shape matching `webhook-service.ts`; clarified single-webhook-per-org, fire-and-forget behaviour.
- `docs/integrations/monday.md` — Removed ghost features (automatic on-finish triggering, re-run status updates, column mapping, configurable trigger statuses); updated description to reflect manual item creation from Investigation Hub and Auto-Bug Generator.
- `PROJECT_CONTEXT.md` — Bumped version header from 3.20.0 to 3.21.1; updated current phase; added MondayProvider.ts, CreateMondayItemModal.tsx, ChangelogModal.tsx, webhook-service.ts to component inventory.

## [3.21.0] — 2026-03-13

### Added
- **Monday.com Integration** — Full Monday.com item creation from the Investigation Hub and Auto-Bug Generator.
  - `GET/PUT /api/integrations/monday` — Store and retrieve an encrypted Monday.com API token, `boardId`, and optional `groupId` per organization; token persisted as AES-256-GCM `IEncryptedPayload` and never returned in plaintext.
  - `POST /api/monday/items` — Create a Monday.com item from any execution; the resulting item ID and URL are written back to `execution.mondayItems[]` for bidirectional linkage.
  - `MondayProvider.ts` — New worker integration provider in `apps/worker-service/src/integrations/` that creates board items and attaches description updates via Monday.com GraphQL API v2024-01.
  - `CreateMondayItemModal.tsx` — New frontend modal for creating a Monday.com item directly from the Investigation Hub drawer (rose/LayoutGrid icon).
  - `IntegrationsTab.tsx` — Monday.com settings card added to **Settings → Connectors** alongside existing GitHub, GitLab, Azure DevOps, Bitbucket, Slack, MS Teams, and Linear cards.
  - `ExecutionDrawer.tsx` — Monday.com action button rendered for `FAILED`/`ERROR` executions when `integrations.monday.enabled` is `true`.
  - `AutoBugModal.tsx` — "Submit to Monday.com" button added alongside Jira and Linear; gated on `integrations.monday.enabled`.
  - `IOrganization.integrations.monday` — New `monday?` sub-document added to `shared-types/index.ts` (`encryptedToken`, `iv`, `authTag`, `enabled`, `boardId`, `groupId?`, `updatedAt?`).
  - `useOrganizationFeatures` hook — `integrations` object now includes `monday` connection status, `boardId`, and `groupId`.
- **Generic Outbound Webhook Integration** — Fire-and-forget `execution.finished` event dispatched to any configured HTTPS endpoint when an execution reaches a terminal state.
  - `webhook-service.ts` — New `sendWebhook()` service in `apps/producer-service/src/services/`. Dispatches a signed JSON payload (`event`, `executionId`, `taskId`, `status`, `summary`, `groupName`, timestamps). Optional `x-agnox-signature: sha256=<hex>` HMAC-SHA256 header when an encrypted secret is configured. 10-second hard timeout; fire-and-forget — never blocks the execution response.
  - `IOrganization.integrations.webhook` — New `webhook?` sub-document added to `shared-types/index.ts` (`enabled`, `url`, `encryptedSecret?`, `iv?`, `authTag?`).
  - Organization GET endpoint now returns `webhook.enabled` and `webhook.url` in the integrations response block.
- **In-App Changelog Modal** — `ChangelogModal.tsx` surfaces the last 5 platform release summaries in a modal with version badges, feature bullets, and a link to the full release history on GitHub.

### Changed
- `packages/shared-types/index.ts` — `monday?` and `webhook?` blocks added to `IOrganization.integrations`.
- `apps/producer-service/src/routes/integrations.ts` — `GET/PUT /api/integrations/monday` and `POST /api/monday/items` endpoints added.
- `apps/producer-service/src/services/webhook-service.ts` — New file.
- `apps/producer-service/src/routes/organization.ts` — `monday` and `webhook` integration status included in GET org integrations response.
- `apps/worker-service/src/integrations/MondayProvider.ts` — New file.
- `apps/dashboard-client/src/components/CreateMondayItemModal.tsx` — New file.
- `apps/dashboard-client/src/components/AutoBugModal.tsx` — "Submit to Monday.com" button added.
- `apps/dashboard-client/src/components/ExecutionDrawer.tsx` — Monday.com action button added.
- `apps/dashboard-client/src/components/ExecutionRow.tsx` — Monday.com-related UI changes.
- `apps/dashboard-client/src/components/ChangelogModal.tsx` — New file; in-app changelog modal added to dashboard.
- `apps/dashboard-client/src/hooks/useOrganizationFeatures.ts` — `integrations.monday` and `integrations.webhook` added to hook return shape.
- `package.json` — Version bumped from `3.20.0` to `3.21.0`.

## [3.20.0] — 2026-03-13

### Added
- **Linear Integration** — Full bidirectional Linear issue integration across the platform.
  - `GET/PUT /api/integrations/linear` — Store and retrieve an encrypted Linear API key and `teamId` per organization; key is persisted as an AES-256-GCM `IEncryptedPayload` and never returned in plaintext.
  - `POST /api/linear/issues` — Create a Linear issue from any execution; the resulting issue ID and URL are written back to `execution.linearIssues[]` for bidirectional linkage.
  - `LinearProvider.ts` — New integration provider in `apps/worker-service/src/integrations/` responsible for posting AI analysis reports to Linear issues.
  - `CreateLinearIssueModal.tsx` — New frontend modal for creating a Linear issue directly from the Investigation Hub drawer (indigo Zap icon button).
  - `IntegrationsTab.tsx` — Linear settings card added to **Settings → Connectors** alongside the existing GitHub, GitLab, Azure DevOps, Bitbucket, Slack, and MS Teams cards.
  - `ExecutionDrawer.tsx` — Linear action button (indigo/Zap icon) rendered for `FAILED`/`ERROR` executions when `integrations.linear.enabled` is `true`.
  - `AutoBugModal.tsx` — "Submit to Linear" button added alongside "Submit to Jira"; gated on the `integrations.linear.enabled` flag.
  - `IOrganization.integrations.linear` — New `linear?` sub-document added to `shared-types/index.ts` (`encryptedToken`, `iv`, `authTag`, `enabled`, `teamId`, `updatedAt?`).
  - `useOrganizationFeatures` hook — Now returns an `integrations` object containing both `jira` and `linear` connection status.

### Changed
- `packages/shared-types/index.ts` — `linear?` block added to `IOrganization.integrations`.
- `apps/producer-service/src/routes/integrations.ts` — `'linear'` added to provider allowlist; `GET/PUT /api/integrations/linear` endpoints added.
- `apps/producer-service/src/routes/linear.ts` — New route file handling `POST /api/linear/issues`.
- `apps/producer-service/src/config/routes.ts` — `linearRoutes` registered.
- `apps/worker-service/src/integrations/LinearProvider.ts` — New file.
- `apps/worker-service/src/integrations/ProviderFactory.ts` — `LinearProvider` imported and wired in for `'linear'` source executions.
- `apps/dashboard-client/src/components/settings/IntegrationsTab.tsx` — Linear card added.
- `apps/dashboard-client/src/components/ExecutionDrawer.tsx` — Linear issue button added.
- `apps/dashboard-client/src/components/AutoBugModal.tsx` — "Submit to Linear" button added.
- `apps/dashboard-client/src/components/CreateLinearIssueModal.tsx` — New file.
- `apps/dashboard-client/src/hooks/useOrganizationFeatures.ts` — `integrations` object added to return shape.
- `package.json` — Version bumped from `3.19.0` to `3.20.0`.

## [3.19.0] — 2026-03-13

### Added
- **Bitbucket CI Integration** — `BitbucketProvider.ts` added to `apps/worker-service/src/integrations/`, implementing `ICiProvider` via native `fetch` with Bearer token auth. Posts AI Analysis reports as PR comments to `https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pullrequests/{id}/comments` using Bitbucket's `{ content: { raw } }` payload format.
- **`ProviderFactory` extended** — `case 'bitbucket'` added so the worker dynamically instantiates `BitbucketProvider` for executions sourced from Bitbucket pipelines.
- **Shared-types updated** — `bitbucket?` integration block (same shape as GitHub/GitLab/Azure: `encryptedToken`, `iv`, `authTag`, `enabled`, `updatedAt?`) added to `IOrganization.integrations`. `'bitbucket'` added to the `source` union on both `ITestCycle.ciContext` and `IIngestCiContext`.
- **Producer API updated** — `PATCH /api/organization/integrations/:provider` allowlist extended to accept `'bitbucket'`; GET `/api/organization` response now includes `integrations.bitbucket.enabled`.
- **Bitbucket settings card** — `IntegrationsTab.tsx` gains a full Bitbucket card (Bitbucket logo SVG, `bg-[#0052CC]` brand colour, PAT input, Connected badge, save/error feedback) alongside the existing GitHub, GitLab, and Azure DevOps cards.

### Changed
- `apps/worker-service/src/integrations/ProviderFactory.ts` — `BitbucketProvider` imported and wired in.
- `apps/worker-service/src/worker.ts` — type cast for `cycle.ciContext.source` widened to include `'bitbucket'`.
- `packages/shared-types/index.ts` — `'bitbucket'` added to both `source` union types; `bitbucket?` block added to `IOrganization.integrations`.
- `apps/producer-service/src/routes/integrations.ts` — provider allowlist updated.
- `apps/producer-service/src/routes/organization.ts` — `bitbucket.enabled` field included in GET response.
- `apps/dashboard-client/src/components/settings/IntegrationsTab.tsx` — Bitbucket state, hydration, handler types, label, icon, and brand colour added.
- `package.json` — Version bumped from `3.18.0` to `3.19.0`.

## [3.18.0] — 2026-03-12

### Added
- **MS Teams Webhook Notifications** — `notifier.ts` extended with a new `sendTeamsNotification()` function that sends a `MessageCard` to a configured MS Teams Incoming Webhook independently of Slack. The card includes a colour-coded theme bar (green/red/amber), a facts table (status, folder, group name, duration), a truncated AI analysis snippet for FAILED/ERROR executions, and a deep link to the Investigation Hub. A failure to deliver the Teams webhook is fire-and-forget and never blocks execution flow.
- **MS Teams Organization Fields** — `IOrganization` in `shared-types` extended with `msTeamsWebhookUrl?` and `msTeamsNotificationEvents?` fields. The PATCH `/api/organization` endpoint now accepts both fields: the URL is validated against a strict `*.webhook.office.com/webhookb2/` regex (SSRF protection) and stored AES-256-GCM encrypted; `msTeamsNotificationEvents` defaults to `['FAILED', 'ERROR', 'UNSTABLE']`.
- **MS Teams Settings UI** — New Microsoft Teams card in `Settings → Integrations` (`IntegrationsTab.tsx`): webhook URL input with masked display for existing URLs, per-status event toggles (PASSED / FAILED / ERROR / UNSTABLE), Connected status badge, and save feedback.

### Changed
- `apps/producer-service/src/utils/notifier.ts` — `sendExecutionNotification()` now dispatches Slack and MS Teams notifications independently; `resolveWebhookUrl()` helper handles both encrypted `IEncryptedPayload` objects and legacy plaintext strings for both channels.
- `apps/producer-service/src/routes/organization.ts` — PATCH handler extended with `msTeamsWebhookUrl` and `msTeamsNotificationEvents` fields; GET response masks the stored URL as `••••••••` when set.
- `packages/shared-types/index.ts` — `msTeamsWebhookUrl?` and `msTeamsNotificationEvents?` added to `IOrganization`.
- `apps/dashboard-client/src/components/settings/IntegrationsTab.tsx` — MS Teams card added alongside Slack card.
- `README.md` — Sprint 8 section updated with MS Teams notification entries; project status table and roadmap updated.
- `PUBLIC_README.md` — Notifications capability row added to the capabilities table.
- `package.json` — Version bumped from `3.17.1` to `3.18.0`.

## [3.17.1] — 2026-03-11

### Changed
- `PROJECT_CONTEXT.md` — Version header bumped to 3.17.1; current phase updated to "DocSync — Smart PR Badge & AI Reasoning Audit Trail"; Phase 19 row extended with v3.17.0 additions: `isSmartPR` badge, `aiReasoning` audit trail, `groupName` default, and `?groupName=` parameter documentation.
- `README.md` — AI badge updated from "Gemini 2.5 Flash" to "BYOK | Gemini | GPT-4o | Claude" to accurately reflect the multi-provider BYOK engine. Mermaid architecture diagram updated: `Google Gemini AI` node replaced with `AI Providers (BYOK)` node. Component Overview table updated: single Gemini row replaced with multi-provider BYOK row listing all three supported providers and the platform-fallback chain. Smart PR Routing reference table extended with Smart PR Badge, AI Reasoning Audit Trail, and `groupName` default rows. Feature D bullet updated to mention the Smart PR badge and audit trail.
- `package.json` — Version bumped from `3.17.0` to `3.17.1`.

### Ghosts Purged
- `PROJECT_CONTEXT.md`: Stale version header `3.15.0 / 2026-03-08 / Smart PR Webhooks` replaced with `3.17.1 / 2026-03-11`.
- `README.md`: `Gemini 2.5 Flash` badge and diagram nodes replaced — platform has been multi-provider (BYOK) since v3.10.0.
- `README.md` Component Overview: Single-provider `Google Gemini | AI Model | Root cause analysis` row replaced with accurate multi-provider BYOK row.

## [3.17.0] — 2026-03-10

### Added
- **Smart PR Badge & AI Reasoning Audit Trail** — Every execution dispatched by the Smart PR webhook now carries `isSmartPR: true` and an `aiReasoning` field, enabling the Execution List to render a distinct **Smart PR** badge and surface the LLM's folder-selection rationale directly in the Investigation Hub for full auditability.
- **`groupName` Default for PR Runs** — The PR webhook now defaults the execution's `groupName` to `'Smart-PR-Run'` when the caller omits `?groupName=`. This ensures Smart PR executions are always associated with a stable group so Auto-Quarantine and Flakiness Detective receive the historical data they need.
- **Webhook URL Example Updated** — The **Settings → Run Settings** webhook callout now includes `?env=prod` in the displayed URL, clarifying environment-pinning usage to new integrators.

### Changed
- `apps/producer-service/src/routes/pr-routing.ts` — Added `isSmartPR`, `aiReasoning`, and explicit `trigger: 'github'` fields to both the execution placeholder document and the RabbitMQ task payload; `groupName` defaults to `'Smart-PR-Run'` when omitted.
- `apps/dashboard-client/src/components/settings/RunSettingsTab.tsx` — Webhook URL callout updated to include `?env=prod` in the example URL for clarity.
- `docs/ai-capabilities/pr-routing.md` — `?groupName=` section fully documented: explains the default value, recommends linking Smart PR runs to a group for Flakiness Detective and Auto-Quarantine participation, and provides a concrete webhook URL example.
- `docs/core-features/executions.md` — Added groupName consistency note inside the Auto-Quarantine section (Docusaurus `:::info` admonition) explaining that the quarantine mechanism requires the same `groupName` across runs to recognize consecutive failures.

## [3.16.0] — 2026-03-10

### Changed
- `docs/ai-capabilities/pr-routing.md` — Added documentation for the new `groupName` query parameter in the Smart PR Webhook, explaining its role in linking executions to specific Execution Groups for Flakiness Detective and Auto-Quarantine validation.

## [3.15.0] — 2026-03-08

### Added
- **Smart PR Webhooks (AI-Driven Routing)** — Robust CI context extraction from GitHub webhook payloads now supports both `pull_request` and `push` event formats. Branch, commit SHA, and PR/commit URL are extracted with graceful fallbacks (`body.ref`, `body.after`, `body.head_commit.url`) so the Execution Drawer always renders the full CI context panel.
- **Test Manifest Seeding** — PR Routing LLM prompt dynamically incorporates the project's `projectTestStructures` manifest when available, enabling precise file-to-test mapping instead of generic folder guessing.
- **Dynamic `?env=` Parameter** — The PR Routing webhook (`POST /api/webhooks/ci/pr`) accepts an optional `?env=prod|staging|dev` query parameter to pin the target environment. Falls back to the legacy staging → dev → prod auto-detection chain when omitted.

### Changed
- `apps/producer-service/src/routes/pr-routing.ts` — CI context extraction refactored to support push events (`body.ref`, `body.after`, `body.head_commit?.url`) alongside pull_request events, eliminating missing branch/commit/URL in the UI.
- `apps/dashboard-client/src/components/ExecutionDrawer.tsx` — Smart PR panel commit rendering hardened with `String()` coercion to prevent runtime errors on unexpected payload shapes.
- `apps/dashboard-client/src/components/ChangelogModal.tsx` — Added v3.15.0 release entry for Smart PR Webhooks.

## [3.14.0] — 2026-03-05

### Changed
- **AI Model Artifact Persistence** — The specific AI model used for an analysis is now immutably recorded directly on the `Execution` object instead of relying on the organization's current default model.
- **AI Analysis Pipeline Hardening** — Fixed a technical error in the AI analysis route and added `allure-playwright` fallback support.
- **Bug Fixes** — Performed a comprehensive regression review across 22 uncommitted files and fixed 4 specific bugs.
- `docs/core-features/executions.md` — Documented the new AI Model Artifact Persistence feature under the AI Root-Cause Analysis section.
- `PROJECT_CONTEXT.md` — Added `aiModel` field to `executions` schema and updated feature registry to Phase 19 completion state. Version bumped to 3.14.0.
- `PLAN.md` — Marked Phase 5 Smart Execution Analytics and pipeline hardening tasks as complete.
- `package.json` — Version bumped from `3.13.0` to `3.14.0`.

## [3.13.0] — 2026-03-05

### Added
- **Smart Execution Analytics (Phase 5)** — Persistent tracking of individual test health metrics: `stabilityScore` (A-F), `averageDurationMs`, and `isQuarantined` state.
- **Auto-Quarantine & Quality Gate Bypass** — Automatically quarantine tests that fail 3 consecutive times to prevent CI/CD pipeline blocking. Webhooks return `PASSED` if all failed tests are quarantined.
- **AI Failure Clustering** — MD5-based `errorHash` generation for failures, grouping similar errors to optimize AI token usage and analysis accuracy.
- **`SmartAnalyticsService`** — Native backend logic for scoring algorithms, performance degradation checks (🐌 Snail badge), and historical metric aggregation.
- **Enhanced Feature Tour** — Added "Smart Analytics" discovery step highlighting Auto-Quarantine and Stability Scoring in the Run Settings dashboard.

### Changed
- `apps/dashboard-client/src/components/Onboarding/tourManager.ts` — New 6th step added to `buildFeatureTour`.
- `docs/core-features/executions.md` — Added "Auto-Quarantine & Quality Gate Bypass" section.
- `docs/ai-capabilities/flakiness-detective.md` — Added "Smart Execution Analytics (Phase 5)" documentation.
- `docs/ai-capabilities/configuration.md` — Added "Smart Analytics" to feature flags table.
- `PLAN.md` — Marked AI Quality Orchestrator Phase 5 as complete (v3.13.0).
- `PROJECT_CONTEXT.md` — Version bumped to 3.13.0; feature registry updated with Phase 5 details.
- `package.json` — Version bumped from `3.12.0` to `3.13.0`.

## [3.12.0] — 2026-03-04

### Added
- **Docusaurus documentation restructure** — Core user-facing docs migrated to `docs/` directory tree, organized into `getting-started/`, `core-features/`, `ai-capabilities/`, `integrations/`, `api-reference/`, and `architecture/` sections. Previous monolithic `user-guide.md` chunked into per-feature pages.
- **SAST Critical/High vulnerability resolution** — All Critical and High severity findings from the security audit resolved. Security score advanced to 100/100.
- **Synchronous startup guard** — Producer service validates `ENCRYPTION_KEY` (exactly 32 chars), `PLATFORM_JWT_SECRET`, and `PLATFORM_MONGO_URI` at process boot; service refuses to start on any missing or malformed required secret.
- **`ENCRYPTION_KEY` enforcement** — Startup guard enforces exactly 32 characters for the AES-256-GCM key; documented in `docs/getting-started/installation.md` under "Backend Startup Requirements".
- **Webhook HMAC signature validation** — PR Routing endpoint (`POST /api/webhooks/ci/pr`) now enforces `X-Hub-Signature-256` HMAC-SHA256 verification with constant-time comparison; unsigned or tampered GitHub deliveries rejected 401 before any task dispatch. Requires `webhookSecret` set in Settings → Run Settings and mirrored in the GitHub webhook form.
- **5-Layer AI Pipeline Sanitizer** (`utils/chat-sanitizer.ts`) — Formally documented: stage allowlist, forced `organizationId` injection, `$limit` cap (max 1,000), collection whitelist (`executions`, `test_cycles` only), recursive operator scan. `PipelineSanitizationError` thrown on any violation.
- **Shift-left data redaction** — Credential field values (`password`, `token`, `secret`, `key`, `apiKey`, `authorization`) stripped from AI prompts before LLM transmission.
- **Prompt injection denylist** — Inbound chatbot messages scanned for known injection phrases (`ignore previous instructions`, `act as`, etc.); matched requests rejected 400.
- **Rate limiting isolation** — Ingest and AI endpoints use independently tuned Redis rate limiters (Ingest events: 500 req/min; AI chat: separate limit) to prevent cross-feature interference.

### Changed
- `docs/getting-started/installation.md` — Added "Backend Startup Requirements" section with required env var table (`ENCRYPTION_KEY`, `PLATFORM_JWT_SECRET`, `PLATFORM_MONGO_URI`) and optional platform keys.
- `docs/ai-capabilities/pr-routing.md` — GitHub Setup section updated with Webhook Secret step (step 3) and new "HMAC Signature Verification" subsection documenting the full validation pipeline.
- `docs/ai-capabilities/chatbot.md` — "Security Model" renamed to "Security Model & Defense-in-Depth"; added Layer 0 (shift-left data redaction) and Layer 0.5 (prompt injection denylist) before the existing 5-layer table.
- `README.md` — "Enterprise-Grade Security" section extended with three new bullets: 5-Layer AI Sanitizer, Webhook HMAC Verification, Synchronous Startup Guard. "Security" section score updated from 92/100 to 100/100; same three bullets added.
- `PROJECT_CONTEXT.md` — Security Posture section extended with four new bullets reflecting all security hardening additions.
- `.agents/doc-sync/SKILL.md` — Bumped to v1.2.0; target documents updated to reference `docs/**/*.md` dynamic scan in place of deprecated `docs/architecture/overview.md` and `docs/features/user-guide.md` paths.
- `package.json` — Version bumped from `3.11.0` to `3.12.0`.

## [3.11.0] — 2026-03-03

### Changed
- `docs/features/user-guide.md` — Section 15 (AI Quality Orchestrator) significantly expanded with richer, step-by-step guidance for all five AI features:
  - **BYOK Configuration:** New step-by-step setup guide (Settings → Security → AI Configuration) documenting model selection, per-provider key input, status badges (Configured / Using Platform Default), Remove flow, and the AES-256-GCM encryption guarantee.
  - **Auto-Bug Generator:** Detailed log-truncation strategy (first 10% + last 90%, max 80k chars, `[LOG TRUNCATED]` marker), full field breakdown of the generated report (`title`, `stepsToReproduce`, `expectedBehavior`, `actualBehavior`, `severity`, `codePatches`).
  - **Smart Test Optimizer:** Renamed section to match product name; documented the BDD conversion flow step by step (`Given / When / Then`), described Pass 1 (Analyzer, temp 0.4) and Pass 2 (Critic, temp 0.0) separately, and clarified the side-by-side diff modal UX including the Edge Cases panel.
  - **Smart PR Routing:** Added GitLab webhook setup instructions (Settings → Webhooks → Push events) alongside the existing GitHub steps; added format note for the webhook URL (`?token=<orgId>`); clarified that `reasoning` in the response explains the folder-selection rationale.
  - **Quality Chatbot:** Added supported chart types table (bar / line / pie); replaced prose security note with a 5-column guard table documenting each layer (stage allowlist, `organizationId` injection, `$limit` cap, collection whitelist, operator scan); added conversation 24h TTL note.
  - **Dual-Agent (Actor-Critic) Architecture:** New dedicated subsection with ASCII pipeline diagram, temperature settings, schema enforcement details, and explanation of why a two-pass validation prevents confident-but-wrong outputs.
- `docs/architecture/overview.md` — Two updates:
  - **New "Dual-Agent (Actor-Critic) AI Architecture" subsection** added after the Worker Service section, showing the full pipeline (`logs.slice(-60000)` → Analyzer at temp 0.4 with `responseSchema` → Critic at temp 0.0 with override authority → final Markdown) along with design decisions (JSON schema enforcement, fallback object on JSON parse failure).
  - **Technology Stack Summary table — AI row** updated from "Google Gemini API / Root cause analysis" to reflect multi-provider BYOK support (Gemini, OpenAI, Anthropic) and the `resolveLlmConfig()` resolver.
- `package.json` — Version bumped from `3.10.0` to `3.11.0`.

## [3.10.0] — 2026-03-03

### Added
- **AI Orchestrator — Phase 1 (Foundation)**: New `IAiConfig` and `IAiFeatureFlags` shared-types interfaces; `IOrganization` extended with `aiConfig` and `aiFeatures`. Migration 009 (`migrations/009-add-ai-orchestrator.ts`) backfills granular AI feature flags and `aiConfig.defaultModel` for all existing orgs.
- **AI Orchestrator — `resolveLlmConfig()` utility** (`apps/producer-service/src/utils/llm-config.ts`): Single-source-of-truth BYOK resolver — reads org's `defaultModel` and encrypted per-provider keys, decrypts via `encryption.ts`, and falls back to `PLATFORM_GEMINI_API_KEY` / `PLATFORM_OPENAI_API_KEY` / `PLATFORM_ANTHROPIC_API_KEY`. Throws `LlmNotConfiguredError` (→ 503) when no key is available.
- **AI Orchestrator — BYOK & AI Config API** (`GET/PATCH /api/organization/ai-config`): Admins can select the org's default AI model (`gemini-2.5-flash`, `gpt-4o`, `claude-3-5-sonnet`) and store per-provider API keys encrypted at rest; response returns only `byokConfigured` flags, never plaintext keys.
- **AI Orchestrator — Granular Feature Flags** (`PATCH /api/organization/features` extended): `aiFeatures` block now accepted alongside existing module flags: `rootCauseAnalysis`, `autoBugGeneration`, `flakinessDetective`, `testOptimizer`, `prRouting`, `qualityChatbot`.
- **Feature A — Auto-Bug Generator** (`POST /api/ai/generate-bug-report`): Fetches execution logs, applies first-10% + last-90% truncation at 80k chars, and generates a structured bug report (`title`, `stepsToReproduce`, `expectedBehavior`, `actualBehavior`, `codePatches`, `severity`). Guarded by `autoBugGeneration` feature flag.
- **`AutoBugModal.tsx`**: Edit-before-submit form pre-populated with AI-generated bug report fields; "Submit to Jira" button opens `CreateJiraTicketModal` with `initialSummary` / `initialDescription` pre-filled.
- **`ExecutionDrawer.tsx`** — "Auto Bug" button (Sparkles icon) added for `FAILED`/`ERROR` executions when `autoBugGeneration` is enabled.
- **Feature B — Flakiness Detective** (`POST /api/ai/analyze-stability`): Fetches last 20 executions for a group, calculates flakiness score (0–100), and returns structured `findings[]` and `recommendations[]`. Results persisted in new `stability_reports` collection (Migration 010). Guarded by `flakinessDetective` flag.
- **`GET /api/ai/stability-reports`**: Returns last 50 stability reports for the org (no feature-flag guard — history always readable).
- **`StabilityPage.tsx`** (route: `/stability`): Group selector → "Analyze Stability" → flakiness gauge + verdict badge + findings/recommendations + clickable history list (loads past reports without a new LLM call).
- **Feature C — Test Case Optimizer** (`POST /api/ai/optimize-test-cases`): Dual-agent pipeline (Analyzer → Critic) accepts up to 20 test-case IDs and returns optimized BDD steps, detected duplicates, and edge cases per case. Guarded by `testOptimizer` flag.
- **`OptimizedTestCasesModal.tsx`**: Side-by-side diff view (original vs. optimized steps) with per-case "Apply Optimization" and "Apply All" actions that call `PUT /api/test-cases/:id`.
- **`BulkActionsBar.tsx`** extended with optional `onOptimize` / `showOptimize` props; "Optimize with AI" button appears when test cases are selected and `testOptimizer` is enabled.
- **Feature D — Smart PR Routing** (`POST /api/webhooks/ci/pr?token=<orgId>`): Receives GitHub push webhooks, extracts changed files, maps them to a `targetFolder` via LLM, dispatches a RabbitMQ task using `computeOrgPriority()`, and returns `{ taskId, targetFolder, reasoning, dispatchedAt }`. Guarded by `prRouting` flag. Route file: `apps/producer-service/src/routes/pr-routing.ts`.
- **`RunSettingsTab.tsx`** — PR Routing toggle + webhook URL callout added; uses `useOrganizationFeatures`.
- **Feature E — Quality Chatbot** (`POST /api/ai/chat`): Two-turn LLM pipeline — Step 1 translates natural-language question into `{ collection, pipeline }`, Step 2 summarises DB results as `{ answer, chartData? }`. Pipeline sanitized by `sanitizePipeline()` in `utils/chat-sanitizer.ts` (5-layer NoSQL injection guard: stage allowlist, force `organizationId`, `$limit` cap, collection whitelist, operator scan). Conversation history stored in `chat_sessions` collection (24h TTL). Guarded by `qualityChatbot` flag.
- **`GET /api/ai/chat/history`** and **`GET /api/ai/chat/:conversationId`**: History endpoints (no feature-flag guard — always readable).
- **`ChatPage.tsx`** (route: `/chat`): Two-panel layout (left: session history sidebar, right: chat); CSS bar chart rendered when `chartData` is returned; suggested-question chips; history refreshed after first turn of a new conversation.
- **`SecurityTab.tsx`** — Full BYOK UI: default AI model dropdown, per-provider key management rows (Configured / Using Platform Default badges, masked key input, Remove button). Replaces legacy single `aiAnalysisEnabled` toggle.
- **`FeaturesTab.tsx`** — New "AI Features" section with 6 toggle rows (Root Cause Analysis, Auto-Bug Generation, Flakiness Detective, Test Optimizer, Smart PR Routing, Quality Chatbot); opt-in model (all default `false`).
- **`Sidebar.tsx`** — "Stability" (Activity icon) and "Ask AI" (MessageSquare icon) nav items conditionally rendered via `aiFeatures` flags.
- **`App.tsx`** — `/stability` and `/chat` routes added as `FeatureGatedRoute` entries with `aiFeatureKey` prop.
- **Migration 010** (`migrations/010-add-stability-reports.ts`): Creates `stability_reports` collection with indexes on `organizationId + createdAt` and `organizationId + groupName`.
- **New MongoDB collections**: `stability_reports` (flakiness analysis history, tenant-isolated) and `chat_sessions` (multi-turn AI chat context, 24h TTL, tenant-isolated).
- **New env vars** (optional): `PLATFORM_OPENAI_API_KEY`, `PLATFORM_ANTHROPIC_API_KEY` — platform-default fallback keys for the respective providers.

### Changed
- `packages/shared-types/index.ts` — Added `IAiConfig`, `IAiFeatureFlags`; `IOrganization` extended with `aiConfig?` and `aiFeatures?`; `openai` and `@anthropic-ai/sdk` SDKs installed in producer.
- `PROJECT_CONTEXT.md` — Added Phase 19 (AI Orchestrator) to the feature registry; added AI routes, new collections, new components/pages, new utilities; bumped version header to `3.10.0`.
- `docs/architecture/overview.md` — Added AI Orchestrator routes to Producer Service routes list; added `stability_reports` and `chat_sessions` to MongoDB collections.
- `docs/features/user-guide.md` — Added Section 15 (AI Quality Orchestrator) with subsections for all five AI features.
- `package.json` — Version bumped from `3.9.0` to `3.10.0`.

## [3.9.0] — 2026-03-03

### Added
- **Onboarding Widget** (`apps/dashboard-client/src/components/onboarding/OnboardingWidget.tsx`) — Floating bottom-right checklist widget for new users with three items: "Connect Docker Image", "Run Your First Test", and "Explore Platform Features". Widget state (dismissed, completed items) is persisted in `localStorage` under `aac:onboarding-dismissed` and `aac:onboarding-completed`.
- **`buildEmptyStateTour`** — 11-step guided driver.js tour walking users through configuring a project in Run Settings, launching their first execution, and viewing results in the Investigation Hub. Uses `MutationObserver` for reliable DOM-based step advancement and `setInterval` URL polling for cross-page navigation detection.
- **`buildFeatureTour`** — 5-step platform discovery tour highlighting Test Cases, Test Cycles, Settings > Team Members, and Settings > Env Variables by spotlighting sidebar navigation items.
- **Sidebar "Getting Started" recovery button** — Desktop and mobile sidebar footers gain a `Rocket`-icon button that dispatches `agnox:open-onboarding` custom window event to re-open a previously dismissed onboarding widget without a page reload.
- **Replay mode** — Completed checklist items remain clickable and render a "Replay" badge, enabling users to revisit any guided tour after completing it.
- `data-testid` additions in `ExecutionModal.tsx`: `modal-launch-button`, `modal-schedule-tab`, `modal-environment-select` — used as driver.js tour anchors.

### Changed
- `DRIVER_BASE_CONFIG` — `allowClose: false` applied globally to all driver.js tour instances to prevent accidental tour dismissal.
- `PROJECT_CONTEXT.md` — Added Phase 18 (Onboarding UX) to the sprint table; added `OnboardingWidget` to the component hierarchy; bumped version header to `3.9.0`.
- `docs/features/user-guide.md` — Added "Getting Started Checklist" subsection under section 2 (Navigating the Dashboard).
- `package.json` — Version bumped from `3.8.1` to `3.9.0`.

## [3.8.1] — 2026-03-01

### Changed
- `packages/playwright-reporter/README.md` — Added dedicated **Troubleshooting / FAQ** section documenting the three most common pitfalls: missing `dotenv.config()` at the top of `playwright.config.ts`, `baseUrl` accidentally pointed at the application under test instead of the Agnox API, and `MODULE_NOT_FOUND` caused by the git-ignored `dist/` folder not being built in CI.
- `docs/integration/quickstart.md` — Added **Dual Architecture** comparison table at the top of the guide explaining the difference between Agnox Hosted (Docker) and External CI (Passive Reporter) integration modes. Added Option D (Native Playwright Reporter) walkthrough and expanded Troubleshooting section with reporter-specific entries.
- `docs/setup/ci-cd.md` — Added **Section 5: Using the `@agnox/playwright-reporter` in CI** with required CI secrets, a full GitHub Actions workflow example, and a troubleshooting table for `MODULE_NOT_FOUND`, silent reporter, and wrong `baseUrl` issues.
- `README.md` — Fixed duplicate "Option C (Legacy)" label (was colliding with existing "Option C" for generic execution request) — renamed to "Option E (Legacy)".

### Purged (Ghosts)
- `README.md`: Duplicate heading "Option C (Legacy)" conflicted with "Option C" (generic execution endpoint). Corrected to "Option E (Legacy)".

## [3.8.0] — 2026-03-01

### Added
- **`@agnox/playwright-reporter` package** — New official Playwright reporter (`packages/playwright-reporter/`) that implements Playwright's `Reporter` interface and streams live test results to the Agnox Ingest API in real-time. Features: batched event delivery (`EventBatcher`), configurable flush interval and batch size, auto-detection of CI environment (GitHub Actions, GitLab CI, Azure DevOps, Jenkins), and a "Do No Harm" design where reporter failures are always silent no-ops that never affect the user's test suite.
- **Dashboard Source Filter** — New "Source" segment in `FilterBar.tsx` (Cloud icon) with chips for `agnox-hosted`, `external-ci`, and `All`. Enables teams to separate Agnox-hosted Docker runs from external CI passive runs at a glance.
- **`Execution` type extensions** — `source` (`'agnox-hosted' | 'external-ci'`), `ingestMeta` (`IIngestMeta`), and `batchId` fields added to the `Execution` interface. `IIngestMeta` and `IIngestCiContext` interfaces added to `types/index.ts`.

### Changed
- `useExecutions.ts` / `useGroupedExecutions.ts` — `source` filter parameter wired through the URL builder and passed to `GET /api/executions` and `GET /api/executions/grouped`.
- `PROJECT_CONTEXT.md` — Added `playwright-reporter` package to the monorepo structure map and packages section; bumped version header to `3.8.0`; updated current phase to "Playwright Reporter (Phase 2)".
- `README.md` — Added "Native Playwright Reporter" feature section documenting the new `@agnox/playwright-reporter` package.
- `package.json` — Version bumped from `3.7.0` to `3.8.0`.

## [3.7.0] — 2026-03-01

### Added
- **`/api/ci/trigger` API Key Authentication** — The CI trigger endpoint now accepts `x-api-key` header auth via `createApiKeyAuthMiddleware`. The global JWT `authMiddleware` bypasses this route (added to `PUBLIC_PATHS`); authentication is handled at the route level, checking `x-api-key` first and falling back to Bearer JWT. CI/CD callers no longer need a user Bearer token to trigger test cycles.
- **Project ID Field in Run Settings** — `RunSettingsTab.tsx` now displays a read-only "Project ID (Required for CI/CD API triggers)" field at the top of the Execution Defaults section. Clicking the field selects its content; a one-click **Copy** button writes the value to the clipboard and shows a success banner.

### Changed
- `PROJECT_CONTEXT.md` — Added `POST /api/ci/trigger` to the routes table (new CI/CD Integration section); updated `run-settings` tab description to mention Project ID field; bumped version header to `3.7.0`.
- `docs/architecture/overview.md` — Added `/api/ci/trigger` to the Producer Service routes list.
- `docs/features/user-guide.md` — Section 8 (API Keys) expanded with a "Triggering Tests from CI/CD Pipelines" sub-section documenting the dedicated endpoint and Project ID retrieval.
- `README.md` — Option B in the CI/CD integration section replaced with the native `POST /api/ci/trigger` endpoint (GitHub Actions + GitLab CI examples); original generic execution request moved to Option C; added v3.7.0 "What's Included" entry.
- `package.json` — Version bumped from `3.6.0` to `3.7.0`.

## [3.6.0] — 2026-02-28

### Added
- **Dual-Agent AI Analysis Pipeline** — `analysisService.ts` now runs two sequential Gemini 2.5 Flash calls: an **Analyzer** (temperature 0.4) generates a structured JSON `{ rootCause, suggestedFix }` using a constrained `responseSchema`; a **Critic** (temperature 0.0) validates the output against the raw logs and overrides hallucinations before producing the final developer-facing Markdown. Improves analysis accuracy and eliminates non-grounded suggestions.
- **Extended Log Context** — Log slice passed to Gemini increased from 30 000 to 60 000 characters, capturing full suite output and earlier setup failures.

### Changed
- `PROJECT_CONTEXT.md` — Updated `analysisService.ts` description to reflect dual-agent pipeline; added Phase 15 to the feature registry.
- `docs/architecture/overview.md` — Updated Worker Service key files section to reflect dual-agent pipeline; fixed incorrect `AGNOX_MONITOR_SECRET` references to the correct `MONITORING_SECRET_KEY` env var name.
- `docs/features/user-guide.md` — AI Analysis section updated to explain the Analyzer + Critic validation step.
- `README.md` — AI-Powered Root Cause Analysis section updated to document the dual-agent architecture.
- `PLAN.md` — Marked Sprint 7 tasks (7.1–7.5) as complete; marked Task 9.5 and Tasks 10.1–10.2 as complete with implementation notes reflecting the live HTML report substitution for the originally planned PDF backend.

### Purged (Ghosts)
- `PLAN.md`: Sprint 7 tasks (7.1–7.5) were all marked `[ ]` despite Phase 7 being fully implemented and shipped — corrected to `[x]`.
- `PLAN.md`: Task 9.5 (Dual Progress Bar) and Tasks 10.1/10.2 (PDF backend/UI) were `[ ]` despite the cycle report being live as `CycleReportPage.tsx` with browser-print-to-PDF — corrected to `[x]` with implementation notes.
- `docs/architecture/overview.md`: `AGNOX_MONITOR_SECRET` env var name replaced with the actual variable `MONITORING_SECRET_KEY` (two occurrences).

## [3.5.0] — 2026-02-26 — DocSync & Multi-Tenant Architecture Alignment

### Changed
- **Documentation Sync** — Synchronized `README.md`, `PROJECT_CONTEXT.md`, and all setup guides (`infrastructure.md`, `client-integration.md`, `deployment.md`, `ci-cd.md`) to reflect the new Multi-Tenant architecture.
- **Legacy Env Vars Removed** — Removed references to deprecated variables including `INJECT_ENV_VARS`, `ADMIN_USER`, `ADMIN_PASS`, `DEFAULT_TEST_IMAGE`, `DEFAULT_BASE_URL`, `STAGING_URL`, and `PRODUCTION_URL`.
- **Infrastructure Standardization** — Updated documentation to emphasize the `PLATFORM_*` prefix for infrastructure secrets, completely removing self-hosted assumptions and decoupling platform from client test workloads.
- **Feature Documentation** — Documented the background Docker image pre-fetching mechanism built to minimize execution wait times in `PROJECT_CONTEXT.md` and `docs/architecture/overview.md`.
- **Security Artifact Updates** — Struck through obsolete mitigations in `SECURITY_PLAN.md` related to `INJECT_ENV_VARS` as it has been replaced by the more secure `projectEnvVars` DB collection and AES-256-GCM encryption. Marked corresponding `SECURITY_AUDIT.md` issues as resolved.

## [3.4.0] — 2026-02-26 — Env Variables & Secrets Management

### Added
- **`projectEnvVars` MongoDB collection** — Stores per-project environment variables with AES-256-GCM encryption for secret values. Migration 007 creates the required indexes.
- **Env Vars CRUD API** — Four new endpoints under `/api/projects/:projectId/env` (GET/POST/PUT/DELETE). Secret values are always masked as `••••••••` in API responses; plaintext is never returned to the client.
- **`resolveProjectEnvVars()` helper** — Shared server-side function that fetches and decrypts all project env vars in memory for injection into test run payloads.
- **Execution pipeline integration** — Both the `test-cycles` POST handler and the `execution-request` handler now fetch, decrypt, and merge project env vars into the RabbitMQ task payload before queuing.
- **`secretKeys` field in worker TaskMessageSchema** — Communicates which env var keys hold secret values so the worker can redact them from logs.
- **`sanitizeLogLine()` in worker** — Redacts secret values (by value, not key) from every streamed container log chunk before dashboard broadcast or buffer accumulation.
- **`EnvironmentVariablesTab` React component** — New Settings tab (`env-vars`) with project selector, Add/Edit form with animated secret toggle, and masked table view with hover-reveal Edit/Delete actions.

### Changed
- `Settings.tsx` — Added `env-vars` tab to the tab registry and `TabId` union type.
- `PROJECT_CONTEXT.md` — Updated migration count to 007, added `projectEnvVars` schema (collection total: 13), added env var endpoints to Projects API table, added `env-vars` to Settings tabs, fixed Notable Absences row for encryption (now resolved), corrected `zod` worker entry (IS used for `TaskMessageSchema`), resolved Known Gap #9.
- `docs/architecture/overview.md` — Corrected RabbitMQ queue name from `automation_queue` to `test_queue`, updated message format to include `secretKeys`, added `projectEnvVars` to MongoDB collections, added env var route to Producer routes.
- `README.md` — Added Sprint 9/10/11 and Env Vars entries to Project Status table and Roadmap, added Sprint 10/11/Env Vars "What's Included" sections, expanded Smart Environment Management section.

### Purged (Ghosts)
- `PROJECT_CONTEXT.md` Notable Absences: "No AES library / no implementation exists" — encryption has existed since Sprint 2 (Jira tokens).
- `PROJECT_CONTEXT.md` Known Gaps #9: "AES-256-GCM mentioned in CLAUDE.md but no implementation" — same as above.
- `PROJECT_CONTEXT.md` worker packages: `zod` incorrectly listed as unused; it powers `TaskMessageSchema` in `worker.ts`.
- `docs/architecture/overview.md`: `automation_queue` replaced with correct queue name `test_queue`.

## [3.3.1] — 2026-02-25 — Security & RBAC Testing Suite (Suite A)

### Added
- **Testing Strategy Documentation** — Documented the 3-Layer Testing Architecture (Unit, API Integration, E2E) at `docs/testing/strategy.md`.
- **API Integration Tests** — Added comprehensive API integration tests for RBAC, Data Isolation (Multi-tenancy), and Account Lockout using Vitest, Supertest, and MongoMemoryServer.
- **E2E Playwright Tests** — Completed Playwright Page Object Model (POM) and UI flow tests for Role-Based Access Control and Execution boundaries.

## [3.3.0] — 2026-02-25 — Slack Notifications & Execution Polishes

### Added
- **Configurable Slack Notifications** — Users can configure which test execution statuses (PASSED, FAILED, ERROR, UNSTABLE) trigger Slack notifications.
- **Connected Status Badges** — Added "Connected" status badges for Jira, GitHub, GitLab, and Azure DevOps integration cards based on their enabled states.

### Changed
- **Slack Notification Workflow** — Modifying the `slackWebhookUrl` is now optional upon saving if the Slack integration is already connected. The backend supports receiving and processing notifications.
- **Global Brand Refresh** — Updated global branding from "Agnostic Automation Center" to "Agnox" across documentation and UI, safely avoiding backend/API path changes.
- **AI Analysis Tab** — The "AI Analysis" tab is now hidden when an execution has an "ERROR" status since AI cannot analyze platform/container launch errors effectively.

### Fixed
- **Windows Worker Compatibility** — Normalized Windows file paths to forward slashes in the worker backend.
- **Slack Deep Linking** — Corrected the Slack webhook deep link in the producer backend to properly target specific test execution drawers. 
- **Allure Parse Metrics** — Fixed the test metrics reported in CI/CD PR comments by accurately parsing Allure summary data.
- **Frontend Session Revocation** — Fixed frontend logout logic to synchronously call the backend `/api/auth/logout` endpoint before clearing local storage.

## [3.2.0] — 2026-02-24 — Native CI/CD Integrations

### Added
- **Native CI Providers** — Added robust strategy-pattern `CiProvider` implementations for GitHub, GitLab, and Azure DevOps to natively post AI root-cause analysis as PR/MR comments.
- **Dynamic API Routing** — Refactored integration API to use a unified `PATCH /api/organization/integrations/:provider` endpoint for secure PAT token storage.
- **Provider Settings UI** — Added a native "Integrations" UI in the Dashboard to securely manage GitHub, GitLab, and Azure DevOps personal access tokens (PATs).
- **Automated CI Triggers** — Added `POST /api/ci/trigger` webhook endpoint for CI environments to natively initiate test cycles and supply standard SCM push context.

### Changed
- **Encrypted Storage** — Migrated integration credentials to use strict AES-256-GCM encryption at rest within the `Organization` document.
- **Worker Execution Flow** — Refactored the Worker Service pipeline to dynamically resolve the SCM provider and dispatch AI comments upstream asynchronously.

## [3.1.1] — 2026-02-23 — Security Hardening Documentation

### Added
- **Security Architecture Document** — Created `docs/SECURITY_ARCHITECTURE.md` detailing the enterprise-grade, defense-in-depth security measures implemented during Sprints 1-3.
- **Documentation Sync** — Synchronized `PROJECT_CONTEXT.md`, `README.md`, and `architecture/overview.md` to reflect the new `PLATFORM_*` namespace, Redis JWT blacklisting, and SSRF mitigations.

## [3.1.0] — 2026-02-22 — Quality Hub & Reporting Evolution

### Added
- **Live HTML Reports** — Dedicated preview screen for Test Cycles (`CycleReportPage.tsx`) with stat cards, expandable item list, and native browser-print optimization (`@media print` CSS forces all manual steps visible, high-contrast badges)
- **Feature Management** — Organization-level toggles for Manual Test Repository and Hybrid Cycles, enabling progressive rollout per tenant
- **Automated Versioning** — Single-source-of-truth version pipeline: `vite.config.ts` reads root `package.json` at build time and injects `__APP_VERSION__` into the entire UI via `VersionDisplay` component

### Changed
- `version.ts` — removed hardcoded version string; now reads from Vite-injected build constant
- `Sidebar.tsx` — replaced inline version text with `<VersionDisplay />` component in both desktop and mobile footers
- `ChangelogModal.tsx` — added v3.1.0 release notes
- `vite.config.ts` — pinned HMR WebSocket to dev-server port, eliminating stray console errors
- `index.css` — added `@media print` block (shadow removal, `<details>` force-expand, manual-steps visibility)
- `CycleReportPage.tsx` — print-friendly contrast overrides on all status badges, type badges, and text elements

## [1.1.0] — 2026-02-22

### Added
- **Test Case Repository** — `test_cases` MongoDB collection with full CRUD API (`POST/GET/PUT/DELETE /api/test-cases`) and AI-powered bulk step generation via Google Gemini
- **Test Cases Page** (`TestCases.tsx`) — Suite-grouped accordion view with search, project selector, and `TestCaseDrawer.tsx` for creating/editing test cases
- **Hybrid Cycle Builder** — `test_cycles` MongoDB collection, `POST/GET /api/test-cycles`, `CycleBuilderDrawer.tsx` for composing manual + automated cycles with suite-grouped checkbox selection
- **Test Cycles Page** (`TestCycles.tsx`) — Cycle listing with expandable item detail rows, status badges, automation rate progress bars, and pass/fail counters
- **Manual Execution Player** (`ManualExecutionDrawer.tsx`) — Interactive step-by-step checklist with Pass/Fail/Skip buttons per step, progress bar, auto-advance, and "Complete Test" button
- **Manual Item Update Endpoint** — `PUT /api/test-cycles/:cycleId/items/:itemId` using MongoDB `arrayFilters` for efficient nested updates, with automatic cycle summary recalculation
- **Automated Cycle Sync** — Worker forwards `cycleId`/`cycleItemId` from RabbitMQ task payloads; Producer syncs cycle item status on terminal execution results and auto-completes cycles
- **Sidebar Navigation** — Added "Test Cases" (ClipboardList icon) and "Test Cycles" (Layers icon) entries
- **Routes** — `/test-cases` and `/test-cycles` routes registered in `App.tsx`

### Changed
- `PLAN.md` — Sprint 9 tasks 9.1–9.4 marked complete
- `PROJECT_CONTEXT.md` — Advanced phase to Sprint 9, added `test_cases` and `test_cycles` schemas, updated routing map and component hierarchy, bumped collection count to 12
- `docs/features/user-guide.md` — Added sections 11 (Test Cases) and 12 (Test Cycles & Manual Player)
- `docs/architecture/overview.md` — Added test case and cycle routes to Producer service, added `test_cases` and `test_cycles` to MongoDB collections
- `README.md` — Added Quality Hub feature entries (Test Case Repository, Hybrid Cycles, Manual Player, AI Step Generation)
- `package.json` version bumped from `1.0.0` to `1.1.0`
