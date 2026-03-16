# Agnox Platform — Test Plan v5.0 Addendum

> **Version:** 1.0.0 | **Date:** 2026-03-16 | **Author:** Principal QA Automation Architect
> **Platform Version:** 3.22.0 | **Addendum Coverage:** v5.0 milestone features
> **Extends:** `TEST_PLAN.md` v1.0.0 (Suites A–D). Suite IDs continue from E.

---

## Table of Contents

1. [Scope & Suite Index](#1-scope--suite-index)
2. [Suite F — Multi-Tenancy: Global Project Context](#2-suite-f--multi-tenancy-global-project-context)
3. [Suite G — Billing, Plans & Storage Limits](#3-suite-g--billing-plans--storage-limits)
4. [Suite H — Spec-to-Test (AI Feature F)](#4-suite-h--spec-to-test-ai-feature-f)
5. [Suite I — Data Management & Integration Unlinking](#5-suite-i--data-management--integration-unlinking)
6. [Cross-Suite Security Matrix](#6-cross-suite-security-matrix)

---

## 1. Scope & Suite Index

This addendum covers **new test suites required for the v5.0 milestone** (`apps/producer-service` v3.22.0). It does not modify or replace existing suites A–D. All conventions from the base TEST_PLAN apply (layer definitions, ID scheme `<SUITE>-<NNN>`, assertion standards, API response contract `{ success: boolean; data?: T; error?: string }`).

| Suite | Coverage Area | Risk Level | New Test IDs |
|-------|--------------|-----------|-------------|
| **F** | Multi-Tenancy: Global Project Context — `projectId` validation on Executions, Test Cases, Test Cycles; `ProjectContext` frontend behaviour; project-count plan limits | P0 | F-001 – F-011 |
| **G** | Billing, Plans & Storage — 5-tier plan access, canonical limit resolution, storage Mechanism A (worker `$inc`) & Mechanism B (nightly reconciler), enforcement middleware | P0/P1 | G-001 – G-011 |
| **H** | Spec-to-Test (Feature F) — Multipart upload, file-type validation, SSE streaming, 4-stage pipeline, Critic deduplication, bulk import | P1 | H-001 – H-014 |
| **I** | Data Management & Unlinking — Bulk delete, suite delete, cycle delete, integration provider unlinking | P1/P2 | I-001 – I-012 |

**Prerequisite migrations for this suite:** 011, 012, 013 must have been executed against the test database before running any test in Suites F–I.

---

## 2. Suite F — Multi-Tenancy: Global Project Context

**Risk Level:** P0 (Critical)
**Layer:** API and E2E

---

### F-001: GET /api/executions Requires a Valid projectId Scoped to the Requesting Org

| Field | Detail |
|---|---|
| **Test ID** | F-001 |
| **Title** | `GET /api/executions` without a `projectId` that belongs to the requesting org returns an empty set or 400 |
| **Pre-conditions** | Org A has two projects: `proj-a1` and `proj-a2`. Org B has `proj-b1`. A valid JWT for Org A exists. `executions` collection contains records for all three projects (all with correct `organizationId`). |
| **Steps** | 1. `GET /api/executions?project=proj-b1` using Org A's JWT. 2. `GET /api/executions?project=proj-a1` using Org A's JWT. |
| **Expected Result** | Step 1: HTTP 200 with `data: []` (org filter `organizationId=org-a` combined with `projectId=proj-b1` yields zero matches — Org A never has proj-b1 data). Step 2: HTTP 200 with only Org A / proj-a1 executions returned. The DB query MUST include both `organizationId` and `projectId` filters. |
| **Layer** | API |

---

### F-002: GET /api/test-cases Requires projectId Query Param

| Field | Detail |
|---|---|
| **Test ID** | F-002 |
| **Title** | `GET /api/test-cases` with a missing `projectId` query parameter is rejected |
| **Pre-conditions** | Valid JWT for Org A. At least one test case exists in `test_cases` collection for Org A. |
| **Steps** | `GET /api/test-cases` (no `projectId` param) using Org A's JWT |
| **Expected Result** | HTTP 400; `{ success: false, error: "..." }` indicating `projectId` is required. No test case data is returned. |
| **Layer** | API |

---

### F-003: GET /api/test-cycles Scoped to Project

| Field | Detail |
|---|---|
| **Test ID** | F-003 |
| **Title** | `GET /api/test-cycles` only returns cycles belonging to the active project within the org |
| **Pre-conditions** | Org A has `proj-a1` with 3 cycles and `proj-a2` with 2 cycles. Valid JWT for Org A. |
| **Steps** | `GET /api/test-cycles?project=proj-a1` using Org A's JWT |
| **Expected Result** | HTTP 200; `data` array contains exactly 3 cycles, all with `projectId: "proj-a1"`. Cycles from `proj-a2` are not present. |
| **Layer** | API |

---

### F-004: Cross-Project Execution Create Is Blocked

| Field | Detail |
|---|---|
| **Test ID** | F-004 |
| **Title** | `POST /api/execution-request` with a `projectId` belonging to a different org is rejected |
| **Pre-conditions** | Org A JWT; Org B has `proj-b1`. Org A user constructs a valid execution-request payload using `projectId: "proj-b1"`. |
| **Steps** | `POST /api/execution-request` with `{ projectId: "proj-b1", image: "...", command: "...", folder: "all", config: {...} }` using Org A's JWT |
| **Expected Result** | HTTP 404 or 400; `{ success: false, error: "..." }`. No task is pushed to `test_queue`. No execution document is created in `executions` collection. `proj-b1` is not leaked in the response. |
| **Layer** | API |

---

### F-005: ProjectContext Persists Active Project Across Page Refresh

| Field | Detail |
|---|---|
| **Test ID** | F-005 |
| **Title** | Selecting a project in the global header dropdown persists it in `localStorage` and survives a full page reload |
| **Pre-conditions** | Logged in as an admin with at least 2 projects. Dashboard is open. |
| **Steps** | 1. Open the project selector dropdown in `DashboardHeader.tsx`. 2. Select `proj-a2`. 3. Hard-reload the browser (`Ctrl+F5`). 4. Observe the active project displayed in the header. |
| **Expected Result** | After reload, the dropdown shows `proj-a2` as the active project. `localStorage.getItem('activeProjectId')` === `proj-a2`. The executions list is scoped to `proj-a2`. |
| **Layer** | E2E |

---

### F-006: ?project= URL Param Syncs Bidirectionally with ProjectContext

| Field | Detail |
|---|---|
| **Test ID** | F-006 |
| **Title** | Navigating to `/test-cases?project=proj-a2` updates the global `ProjectContext` and vice versa |
| **Pre-conditions** | Logged-in user. `activeProjectId` in context is currently `proj-a1`. |
| **Steps** | 1. Navigate directly to `/test-cases?project=proj-a2`. 2. Observe the project selector dropdown. 3. Switch the dropdown back to `proj-a1`. 4. Observe the URL. |
| **Expected Result** | Step 2: Dropdown shows `proj-a2` (context updated from URL). Step 4: URL becomes `/test-cases?project=proj-a1` (URL updated from context). Test cases list re-fetches on each context change. |
| **Layer** | E2E |

---

### F-007: Migration 013 Backfilled projectId on All Legacy Records

| Field | Detail |
|---|---|
| **Test ID** | F-007 |
| **Title** | After migration 013, no execution, test_case, or test_cycle document for an org lacks a `projectId` field |
| **Pre-conditions** | Test database with pre-migration data: at least one execution, one test_case, one test_cycle per org, all without `projectId`. Migration 013 has been run. |
| **Steps** | Query `executions`, `test_cases`, and `test_cycles` collections for documents where `{ organizationId: <orgId>, projectId: { $exists: false } }` |
| **Expected Result** | All three queries return zero documents. Every org's first project (alphabetically by `createdAt`) is assigned as the default backfill target. |
| **Layer** | Unit (migration script test) |

---

### F-008: Free Plan Org Cannot Create More Than 1 Project

| Field | Detail |
|---|---|
| **Test ID** | F-008 |
| **Title** | A `free` plan org is blocked from creating a second project |
| **Pre-conditions** | Org A is on `free` plan. Org A already has 1 project (`proj-a1`). Admin JWT for Org A. |
| **Steps** | `POST /api/projects` with `{ name: "Second Project" }` using Org A admin JWT |
| **Expected Result** | HTTP 429; `{ success: false, error: "..." }` referencing the project limit. No new project is created in `projects` collection. `GET /api/projects` still returns only 1 project. |
| **Layer** | API |

---

### F-009: Starter Plan Org Cannot Create More Than 3 Projects

| Field | Detail |
|---|---|
| **Test ID** | F-009 |
| **Title** | A `starter` plan org with 3 existing projects is blocked from creating a 4th |
| **Pre-conditions** | Org B is on `starter` plan. `projects` collection contains exactly 3 documents with `organizationId: org-b`. Admin JWT for Org B. |
| **Steps** | `POST /api/projects` with `{ name: "Fourth Project" }` using Org B admin JWT |
| **Expected Result** | HTTP 429; `{ success: false, error: "..." }`. No 4th project document is inserted. |
| **Layer** | API |

---

### F-010: GET /api/organization/usage Returns projects.used and projects.limit

| Field | Detail |
|---|---|
| **Test ID** | F-010 |
| **Title** | The usage endpoint includes the `projects` metric with correct `used` and `limit` values |
| **Pre-conditions** | Org A is on `team` plan (unlimited projects). Org A has 5 projects. Valid JWT for Org A. |
| **Steps** | `GET /api/organization/usage` using Org A's JWT |
| **Expected Result** | HTTP 200; `data.projects.used === 5`; `data.projects.limit` equals the canonical `PLANS['team'].limits.maxProjects` value (e.g., `Infinity` or a platform constant). Response also contains `testRuns`, `users`, and `storage` metrics. |
| **Layer** | API |

---

### F-011: ExecutionModal Passes activeProjectId in Execution-Request Payload

| Field | Detail |
|---|---|
| **Test ID** | F-011 |
| **Title** | Launching a run from the dashboard includes the current active project ID in the request body |
| **Pre-conditions** | Logged in. Active project is `proj-a2`. Network tab spy / request interceptor is active. |
| **Steps** | 1. Open the Execution Modal. 2. Fill in required fields. 3. Click "Launch Run". |
| **Expected Result** | The `POST /api/execution-request` request body contains `{ projectId: "proj-a2", ... }`. The created execution document in the DB has `projectId: "proj-a2"`. |
| **Layer** | E2E |

---

## 3. Suite G — Billing, Plans & Storage Limits

**Risk Level:** P0 (Critical) for storage enforcement; P1 (High) for plan tier logic
**Layer:** Unit and API

---

### G-001: getCanonicalLimits Always Returns PLANS Config, Not Stale DB Values

| Field | Detail |
|---|---|
| **Test ID** | G-001 |
| **Title** | `getCanonicalLimits()` overrides a stale DB limit with the authoritative `PLANS` constant |
| **Pre-conditions** | Org document has `plan: 'team'` but `limits.maxTestRuns: 10` (stale value from a prior plan). The canonical `PLANS['team'].limits.maxTestRuns` is `500`. |
| **Steps** | Unit test: call `getCanonicalLimits(orgDoc)` where `orgDoc` has the stale limits |
| **Expected Result** | Returned limits object has `maxTestRuns === 500` (canonical value). The stale DB value `10` is not returned. The function reads from `PLANS[org.plan]` and ignores the stored `org.limits.*` values. |
| **Layer** | Unit |

---

### G-002: checkPlanLimits Reads Canonical Config for Test-Run Enforcement

| Field | Detail |
|---|---|
| **Test ID** | G-002 |
| **Title** | `checkPlanLimits()` middleware blocks a run when the org has reached its canonical monthly test-run limit |
| **Pre-conditions** | Org on `free` plan. Canonical `PLANS['free'].limits.maxTestRuns === 5`. Org has already created 5 executions this billing period. Admin JWT. |
| **Steps** | `POST /api/execution-request` with a valid payload using the org's admin JWT |
| **Expected Result** | HTTP 429; `{ success: false, error: "..." }` indicating the test-run limit is reached. No task is pushed to `test_queue`. |
| **Layer** | API |

---

### G-003: enforceStorageLimit Blocks Execution When currentStorageUsedBytes >= maxStorageBytes

| Field | Detail |
|---|---|
| **Test ID** | G-003 |
| **Title** | The `enforceStorageLimit` preHandler returns 429 when storage is exhausted |
| **Pre-conditions** | Org has `limits.maxStorageBytes: 1073741824` (1 GB). `limits.currentStorageUsedBytes: 1073741824` (exactly at limit). Valid JWT. |
| **Steps** | `POST /api/execution-request` with a valid payload |
| **Expected Result** | HTTP 429; `{ success: false, error: "..." }` mentioning storage limit. Execution is NOT queued. The comparison is `>=` (at-limit also blocks, not just over-limit). |
| **Layer** | API |

---

### G-004: Worker Mechanism A — $inc currentStorageUsedBytes on Execution Finish

| Field | Detail |
|---|---|
| **Test ID** | G-004 |
| **Title** | When a worker finishes an execution, it atomically increments the org's `currentStorageUsedBytes` |
| **Pre-conditions** | `organizations` collection has Org A with `limits.currentStorageUsedBytes: 5000000`. Worker completes execution `task-xyz` which produced a document of approximate BSON size `S`. |
| **Steps** | Unit test: mock the `db.collection('organizations').updateOne()` call in `worker.ts` post-execution finish; verify the `$inc` operator is used with a positive byte delta. |
| **Expected Result** | `updateOne` is called with `{ _id: orgId }` filter and `{ $inc: { 'limits.currentStorageUsedBytes': <positiveNumber> } }`. The operation uses `$inc` (atomic), not `$set`. |
| **Layer** | Unit |

---

### G-005: Storage Reconciler (Mechanism B) Corrects Drift via $bsonSize Aggregation

| Field | Detail |
|---|---|
| **Test ID** | G-005 |
| **Title** | The nightly `storage-reconciler.ts` cron job recalculates true storage from `$bsonSize` and writes the corrected value |
| **Pre-conditions** | Org A has `currentStorageUsedBytes: 999999999` (drifted). True `$bsonSize` sum of all org's `executions` documents is `50000000`. Reconciler is invoked directly in the test (not via cron). |
| **Steps** | Unit test: mock MongoDB aggregation to return `{ totalBytes: 50000000 }`; invoke the reconciler function for Org A; spy on `updateOne`. |
| **Expected Result** | `updateOne` is called with `{ $set: { 'limits.currentStorageUsedBytes': 50000000 } }`. The drifted value is overwritten. Logger emits an `info` entry indicating the correction. No error is thrown. |
| **Layer** | Unit |

---

### G-006: Usage Alerts Returned at 80%, 90%, and 100% Thresholds

| Field | Detail |
|---|---|
| **Test ID** | G-006 |
| **Title** | `GET /api/organization/usage/alerts` returns the correct alert level based on storage consumption |
| **Pre-conditions** | Three orgs: Org X at 79% storage, Org Y at 85% storage, Org Z at 100% storage. |
| **Steps** | Call `GET /api/organization/usage/alerts` for each org using their respective JWTs. |
| **Expected Result** | Org X: HTTP 200; no storage alert (below 80%). Org Y: HTTP 200; alert level `warning` (≥80% but <90%). If 90% threshold applies: a second test at 91% returns `critical`. Org Z: HTTP 200; alert level `exceeded` or `critical`. Response shape: `{ success: true, data: { storage: { level: 'warning'|'critical'|'exceeded', percentUsed: number } } }`. |
| **Layer** | API |

---

### G-007: Stripe Webhook subscription.updated Backfills maxStorageBytes from PLANS Config

| Field | Detail |
|---|---|
| **Test ID** | G-007 |
| **Title** | Processing a `customer.subscription.updated` Stripe event updates `org.plan` and sets `maxStorageBytes` from the canonical `PLANS` config |
| **Pre-conditions** | Org A is on `free` plan. A valid Stripe webhook event `customer.subscription.updated` is constructed with the `team` price ID; webhook HMAC signature is valid. |
| **Steps** | `POST /api/webhooks/stripe` with the constructed event body and valid `Stripe-Signature` header |
| **Expected Result** | HTTP 200. Org A's document updated: `plan: 'team'`; `limits.maxStorageBytes` === `PLANS['team'].limits.maxStorageBytes` (canonical). A `webhook_logs` entry is created with `status: 'success'`. |
| **Layer** | API |

---

### G-008: Invalid Stripe Webhook Signature Returns 400

| Field | Detail |
|---|---|
| **Test ID** | G-008 |
| **Title** | A Stripe webhook request with a tampered or missing signature is rejected before any DB write |
| **Pre-conditions** | Valid event payload; incorrect `Stripe-Signature` header (wrong HMAC value) |
| **Steps** | `POST /api/webhooks/stripe` with the invalid signature |
| **Expected Result** | HTTP 400; `{ success: false, error: "..." }`. No org document is modified. No `webhook_logs` entry is created. |
| **Layer** | API |

---

### G-009: BillingTab Renders All 5 Plan Tiers

| Field | Detail |
|---|---|
| **Test ID** | G-009 |
| **Title** | The billing settings tab renders exactly 5 plan columns with correct labels and feature lists |
| **Pre-conditions** | Logged in as admin. Navigate to `/settings?tab=billing`. |
| **Steps** | Inspect the plan grid rendered by `BillingTab.tsx`. |
| **Expected Result** | 5 plan columns visible: Free, Starter, Business, Team, Enterprise. Enterprise column shows "Contact Sales" CTA (no Stripe checkout link). One column carries a "Most Popular" badge. Currently active plan has a highlighted border or "Current Plan" indicator. Storage limit values displayed match the canonical `PLANS` config (not DB values). |
| **Layer** | E2E |

---

### G-010: Downgrade Below Current Project Count Is Blocked

| Field | Detail |
|---|---|
| **Test ID** | G-010 |
| **Title** | An org with 3 projects on `starter` plan that processes a downgrade webhook to `free` (1 project max) is handled safely |
| **Pre-conditions** | Org has 3 projects; plan downgraded to `free` via Stripe webhook. |
| **Steps** | `POST /api/webhooks/stripe` with `customer.subscription.updated` event setting plan to `free` |
| **Expected Result** | HTTP 200; `org.plan` is set to `free`; `limits.maxProjects` updated to canonical free-plan value. Existing 3 projects are NOT deleted (the platform records the limit violation but does not auto-delete data). Next `POST /api/projects` attempt returns HTTP 429. |
| **Layer** | API |

---

### G-011: Storage Limit Is Not Enforced on Internal Worker Callback Routes

| Field | Detail |
|---|---|
| **Test ID** | G-011 |
| **Title** | The worker callback endpoint `POST /executions/update` is not gated by `enforceStorageLimit` |
| **Pre-conditions** | Org A is at 100% storage. Worker posts a status-update callback for a task that is already RUNNING. |
| **Steps** | `POST /executions/update` with `{ taskId: "task-xyz", status: "PASSED", ... }` and the internal worker callback secret header |
| **Expected Result** | HTTP 200; execution status is updated to `PASSED`; Slack notification fires if configured. The `enforceStorageLimit` middleware does NOT apply to this internal route. |
| **Layer** | API |

---

## 4. Suite H — Spec-to-Test (AI Feature F)

**Risk Level:** P1 (High)
**Layer:** Unit and API (SSE streaming); E2E for wizard UI

---

### H-001: Non-Multipart Request Returns 400

| Field | Detail |
|---|---|
| **Test ID** | H-001 |
| **Title** | `POST /api/ai/spec-to-tests` with `Content-Type: application/json` is rejected before the pipeline runs |
| **Pre-conditions** | Org has `aiFeatures.specToTest: true`. Valid JWT. |
| **Steps** | `POST /api/ai/spec-to-tests` with `Content-Type: application/json` and body `{ projectId: "proj-a1", testStyle: "bdd" }` |
| **Expected Result** | HTTP 400; `{ success: false, error: "..." }` indicating multipart form data is required. No LLM call is made. |
| **Layer** | API |

---

### H-002: File Exceeding 10 MB Limit Is Rejected

| Field | Detail |
|---|---|
| **Test ID** | H-002 |
| **Title** | Uploading a file larger than the 10 MB `@fastify/multipart` limit returns an error |
| **Pre-conditions** | Org has `specToTest: true`. Valid JWT. A 12 MB binary file is prepared. |
| **Steps** | `POST /api/ai/spec-to-tests` as multipart with a 12 MB file, valid `projectId`, and `testStyle: "bdd"` |
| **Expected Result** | HTTP 413 or 400; `{ success: false, error: "..." }` referencing file size limit. No SSE stream is opened. No LLM call is made. |
| **Layer** | API |

---

### H-003: Unsupported File Type Returns 400

| Field | Detail |
|---|---|
| **Test ID** | H-003 |
| **Title** | Uploading a `.xlsx` or `.txt` file (not PDF, DOCX, or MD) is rejected with a clear error |
| **Pre-conditions** | Org has `specToTest: true`. Valid JWT. |
| **Steps** | `POST /api/ai/spec-to-tests` as multipart with a `.xlsx` file and valid `projectId` / `testStyle` |
| **Expected Result** | HTTP 400; `{ success: false, error: "..." }` stating supported file types are PDF, DOCX, and Markdown. |
| **Layer** | API |

---

### H-004: Missing Required Fields Return 400

| Field | Detail |
|---|---|
| **Test ID** | H-004 |
| **Title** | Omitting `projectId` or `testStyle` from the multipart fields causes early rejection |
| **Pre-conditions** | Org has `specToTest: true`. Valid JWT. Valid PDF uploaded. |
| **Steps** | 1. Upload with missing `projectId` field. 2. Upload with missing `testStyle` field. 3. Upload with invalid `testStyle: "invalid"`. |
| **Expected Result** | All three cases: HTTP 400; `{ success: false, error: "..." }` identifying the missing or invalid field. |
| **Layer** | API |

---

### H-005: specToTest Feature Flag Guard Blocks Disabled Orgs

| Field | Detail |
|---|---|
| **Test ID** | H-005 |
| **Title** | An org with `aiFeatures.specToTest: false` receives 403 on `POST /api/ai/spec-to-tests` |
| **Pre-conditions** | Org A has `aiFeatures.specToTest: false`. Valid admin JWT for Org A. |
| **Steps** | `POST /api/ai/spec-to-tests` as multipart with a valid PDF, `projectId`, and `testStyle` |
| **Expected Result** | HTTP 403; `{ success: false, error: "..." }` indicating the feature is not enabled. The flag check (`featureFlagGuard`) fires before `@fastify/multipart` parses the body. |
| **Layer** | API |

---

### H-006: SSE Stream Emits 4 Progress Events in Pipeline Order

| Field | Detail |
|---|---|
| **Test ID** | H-006 |
| **Title** | The SSE response emits exactly 4 named `progress` events in the correct pipeline sequence: Extractor → Generator → Critic → Formatter |
| **Pre-conditions** | Org has `specToTest: true`. LLM is mocked to return valid staged responses. Valid JWT and multipart request. |
| **Steps** | Open SSE connection to `POST /api/ai/spec-to-tests`; collect all `event:` lines from the stream. |
| **Expected Result** | Stream includes 4 `progress` events with `stage` values (in order): `"extractor"`, `"generator"`, `"critic"`, `"formatter"`. Each carries a human-readable `message` field. A final `complete` event closes the stream. Response headers include `Content-Type: text/event-stream`. |
| **Layer** | API |

---

### H-007: SSE complete Event Contains Structured Test Cases

| Field | Detail |
|---|---|
| **Test ID** | H-007 |
| **Title** | The `complete` SSE event carries the final generated test cases array |
| **Pre-conditions** | End-to-end spec-to-test pipeline run with a mocked LLM returning 3 test cases. |
| **Steps** | Collect the `complete` event from the SSE stream; parse its `data` JSON payload. |
| **Expected Result** | `data.testCases` is an array of 3 objects, each with at minimum: `title` (string), `suite` (string), `steps` (array with `action` and `expectedResult` per step), `priority`. `data.total` equals 3. |
| **Layer** | API |

---

### H-008: Critic Stage Deduplicates Against Existing Test Cases via $text Index

| Field | Detail |
|---|---|
| **Test ID** | H-008 |
| **Title** | A generated test case whose title closely matches an existing `test_cases` document is flagged or removed by the Critic stage |
| **Pre-conditions** | `test_cases` collection has a document with `title: "User can login with valid credentials"` for `proj-a1`. The Generator produces a case titled `"User can login with valid credentials"`. The `$text` index (migration 011) is present on `test_cases.title`. |
| **Steps** | Run the spec-to-test pipeline with a spec that generates an exact-title duplicate; observe the `complete` event payload. |
| **Expected Result** | The duplicate title is absent from `data.testCases` in the `complete` event. The `progress` event for the `"critic"` stage indicates at least 1 deduplication action. |
| **Layer** | API |

---

### H-009: Bulk Import Batches Test Cases in Chunks of 50

| Field | Detail |
|---|---|
| **Test ID** | H-009 |
| **Title** | Importing 120 generated test cases calls `POST /api/test-cases/bulk` in 3 sequential batches of 50, 50, and 20 |
| **Pre-conditions** | `SpecToTestModal` is at step 3 (review). 120 cases are selected for import. |
| **Steps** | Click "Import All" in `SpecToTestModal`; capture all outgoing HTTP requests to `/api/test-cases/bulk`. |
| **Expected Result** | Exactly 3 calls to `POST /api/test-cases/bulk`. First two calls have bodies with 50 items each; third call has 20 items. All calls include correct `organizationId` (via JWT) and `projectId`. `test_cases` collection gains 120 new documents. |
| **Layer** | E2E |

---

### H-010: SpecToTestModal 3-Step Wizard Transitions Correctly

| Field | Detail |
|---|---|
| **Test ID** | H-010 |
| **Title** | The SpecToTestModal progresses through Upload → Live Progress → Review/Import and each step renders the correct UI |
| **Pre-conditions** | Logged in. `specToTest` feature is enabled for the org. Navigated to `/test-cases`. |
| **Steps** | 1. Click the "Spec to Test" button to open the modal. 2. Upload a valid PDF and select `testStyle: "bdd"`. 3. Click "Generate". 4. Observe the progress step as SSE events arrive. 5. After `complete` event, observe step 3. |
| **Expected Result** | Step 1: Modal opens at step 1 (file upload + style selector). Step 3: After clicking "Generate", modal transitions to step 2 showing a live pipeline progress bar updating for each `progress` SSE event. Step 4: After `complete`, modal transitions to step 3 showing a reviewable list of generated test cases with checkboxes. An "Import Selected" button is visible. |
| **Layer** | E2E |

---

### H-011: PDF Content Is Extracted Correctly

| Field | Detail |
|---|---|
| **Test ID** | H-011 |
| **Title** | `pdf-parse` successfully extracts text content from a valid single-page PDF spec |
| **Pre-conditions** | A single-page PDF containing the text `"Feature: User Authentication\nScenario: Valid login"` is prepared. Org has `specToTest: true`. |
| **Steps** | Unit test: invoke the Extractor stage function directly with the PDF file buffer. |
| **Expected Result** | Extracted text string contains `"Feature: User Authentication"` and `"Scenario: Valid login"`. No exception is thrown. The function returns a non-empty string. |
| **Layer** | Unit |

---

### H-012: DOCX Content Is Extracted Correctly

| Field | Detail |
|---|---|
| **Test ID** | H-012 |
| **Title** | `mammoth` successfully converts a `.docx` spec file to plain text without retaining formatting artifacts |
| **Pre-conditions** | A `.docx` file containing a simple table with test scenario descriptions is prepared. |
| **Steps** | Unit test: invoke the Extractor stage function directly with the DOCX buffer and `mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'`. |
| **Expected Result** | Extracted text string is non-empty and contains the scenario text from the document. No HTML tags or DOCX XML artifacts are present in the output string. |
| **Layer** | Unit |

---

### H-013: SSE Error Event Closes Stream Gracefully on LLM Failure

| Field | Detail |
|---|---|
| **Test ID** | H-013 |
| **Title** | If the LLM throws during any pipeline stage, an `error` SSE event is emitted and the stream is closed cleanly |
| **Pre-conditions** | Org has `specToTest: true`. LLM is mocked to throw `new Error("LLM timeout")` during the Generator stage. Valid multipart upload. |
| **Steps** | Open SSE connection; observe events. |
| **Expected Result** | The stream emits at minimum the `"extractor"` progress event, then an `event: error` with `data: { message: "..." }` describing the failure. The stream then closes (connection ends). No raw exception stack trace is leaked in the event data. No test cases are partially written to the DB. |
| **Layer** | API |

---

### H-014: Spec-to-Test projectId Must Belong to the Requesting Org

| Field | Detail |
|---|---|
| **Test ID** | H-014 |
| **Title** | Providing a `projectId` from a different org in the spec-to-test request is rejected |
| **Pre-conditions** | Org A JWT. Org B has `proj-b1`. Valid PDF upload. Org A has `specToTest: true`. |
| **Steps** | `POST /api/ai/spec-to-tests` multipart with `projectId: "proj-b1"` using Org A's JWT |
| **Expected Result** | HTTP 400 or 404; `{ success: false, error: "..." }`. No SSE stream is opened. No LLM call is made. The cross-tenant `projectId` validation fires before the pipeline begins. |
| **Layer** | API |

---

## 5. Suite I — Data Management & Integration Unlinking

**Risk Level:** P1 (High) for data deletion; P2 (Medium) for unlinking
**Layer:** API and E2E

---

### I-001: DELETE /api/test-cases/bulk Deletes Up to 100 Test Cases

| Field | Detail |
|---|---|
| **Test ID** | I-001 |
| **Title** | Bulk-deleting 50 test cases in a single request removes all targeted documents |
| **Pre-conditions** | Org A, `proj-a1` has 60 test cases. 50 of their `_id`s are collected. Developer JWT for Org A. |
| **Steps** | `DELETE /api/test-cases/bulk` with body `{ ids: ["id1", ..., "id50"], projectId: "proj-a1" }` |
| **Expected Result** | HTTP 200; `{ success: true, data: { deleted: 50 } }`. `test_cases` collection: 50 documents gone, 10 remain. All deleted documents had `organizationId: org-a` and `projectId: proj-a1`. |
| **Layer** | API |

---

### I-002: DELETE /api/test-cases/bulk With > 100 IDs Returns 400

| Field | Detail |
|---|---|
| **Test ID** | I-002 |
| **Title** | Attempting to bulk-delete more than 100 test cases in a single request is rejected |
| **Pre-conditions** | Valid developer JWT. An array of 101 valid test case IDs. |
| **Steps** | `DELETE /api/test-cases/bulk` with body `{ ids: [101 IDs], projectId: "proj-a1" }` |
| **Expected Result** | HTTP 400; `{ success: false, error: "..." }` indicating the maximum batch size is 100. No test cases are deleted. |
| **Layer** | API |

---

### I-003: DELETE /api/test-cases/bulk Silently Ignores Cross-Org IDs

| Field | Detail |
|---|---|
| **Test ID** | I-003 |
| **Title** | IDs belonging to a different org included in a bulk delete request are ignored without error |
| **Pre-conditions** | Org A has test cases `[tc-a1, tc-a2]`. Org B has `tc-b1`. Developer JWT for Org A. |
| **Steps** | `DELETE /api/test-cases/bulk` with `{ ids: ["tc-a1", "tc-a2", "tc-b1"], projectId: "proj-a1" }` using Org A JWT |
| **Expected Result** | HTTP 200; `data.deleted === 2` (only Org A's cases deleted). `tc-b1` still exists in the `test_cases` collection. No error is thrown for the cross-org ID. |
| **Layer** | API |

---

### I-004: DELETE /api/test-cases/suite Deletes All Cases in a Named Suite

| Field | Detail |
|---|---|
| **Test ID** | I-004 |
| **Title** | Suite-level deletion removes all test cases in the specified suite within the project |
| **Pre-conditions** | `test_cases` collection has 8 cases with `suite: "Checkout Flow"` in `proj-a1`, and 5 cases with `suite: "Login Flow"` in the same project. Developer JWT. |
| **Steps** | `DELETE /api/test-cases/suite` with body `{ suite: "Checkout Flow", projectId: "proj-a1" }` |
| **Expected Result** | HTTP 200; `data.deleted === 8`. All 8 `Checkout Flow` cases are removed. The 5 `Login Flow` cases remain untouched. |
| **Layer** | API |

---

### I-005: Deleting a Suite Containing AUTOMATED Cases Shows Warning Modal

| Field | Detail |
|---|---|
| **Test ID** | I-005 |
| **Title** | The UI displays an amber confirmation modal warning when a suite to be deleted contains AUTOMATED test cases |
| **Pre-conditions** | Suite `"Regression"` in `proj-a1` contains at least one `type: "AUTOMATED"` test case. Logged in as developer. |
| **Steps** | 1. Navigate to `/test-cases?project=proj-a1`. 2. Find suite `"Regression"`. 3. Click the "Delete Suite" action. |
| **Expected Result** | An amber-styled confirmation modal appears with text warning that automated test cases will be permanently deleted. The modal has a "Cancel" and a "Delete Anyway" button. Clicking "Cancel" dismisses the modal without deleting. Clicking "Delete Anyway" triggers the `DELETE /api/test-cases/suite` request. |
| **Layer** | E2E |

---

### I-006: DELETE /api/test-cycles/:id Returns 409 When Cycle Is RUNNING

| Field | Detail |
|---|---|
| **Test ID** | I-006 |
| **Title** | Attempting to delete a test cycle with `status: 'RUNNING'` is blocked with a 409 Conflict |
| **Pre-conditions** | `test_cycles` collection has a cycle `cycle-xyz` with `status: 'RUNNING'` in Org A. Developer JWT. |
| **Steps** | `DELETE /api/test-cycles/cycle-xyz` using Org A developer JWT |
| **Expected Result** | HTTP 409; `{ success: false, error: "..." }` indicating the cycle is currently running. The cycle document remains in the `test_cycles` collection unchanged. |
| **Layer** | API |

---

### I-007: DELETE /api/test-cycles/:id Hard-Deletes a Non-Running Cycle

| Field | Detail |
|---|---|
| **Test ID** | I-007 |
| **Title** | A completed or pending cycle is permanently (hard) deleted by `DELETE /api/test-cycles/:id` |
| **Pre-conditions** | Cycle `cycle-abc` has `status: 'COMPLETED'` in Org A. Developer JWT. |
| **Steps** | `DELETE /api/test-cycles/cycle-abc` using Org A developer JWT |
| **Expected Result** | HTTP 200; `{ success: true }`. `test_cycles` collection: no document with `_id: cycle-abc` exists. A subsequent `GET /api/test-cycles/cycle-abc` returns HTTP 404. |
| **Layer** | API |

---

### I-008: DELETE /api/integrations/:provider Unlinks the Integration (Admin Only)

| Field | Detail |
|---|---|
| **Test ID** | I-008 |
| **Title** | An admin can unlink a connected integration, removing the encrypted credential block from the org document |
| **Pre-conditions** | Org A has `integrations.linear` fully configured (`encryptedToken`, `iv`, `authTag`, `enabled: true`, `teamId`). Admin JWT for Org A. |
| **Steps** | `DELETE /api/integrations/linear` using Org A admin JWT |
| **Expected Result** | HTTP 200; `{ success: true }`. `organizations` collection: the `integrations.linear` sub-document is completely `$unset` (no residual fields). A subsequent `GET /api/integrations/linear` returns `{ enabled: false }` or 404. |
| **Layer** | API |

---

### I-009: Non-Admin Cannot Unlink an Integration

| Field | Detail |
|---|---|
| **Test ID** | I-009 |
| **Title** | A developer or viewer role user is blocked from calling `DELETE /api/integrations/:provider` |
| **Pre-conditions** | Org A has Jira integration configured. A JWT for a user with `role: 'developer'` exists. |
| **Steps** | `DELETE /api/integrations/jira` using the developer JWT |
| **Expected Result** | HTTP 403; `{ success: false, error: "Insufficient permissions" }`. The `integrations.jira` block is unchanged in the DB. |
| **Layer** | API |

---

### I-010: DELETE /api/integrations/:provider With Unknown Provider Returns 400

| Field | Detail |
|---|---|
| **Test ID** | I-010 |
| **Title** | Supplying an unknown provider name (not in the allowlist) returns 400 before any DB write |
| **Pre-conditions** | Admin JWT for Org A. |
| **Steps** | `DELETE /api/integrations/unknown_provider` using admin JWT |
| **Expected Result** | HTTP 400; `{ success: false, error: "..." }` indicating the provider is not supported. The allowlist is: `github`, `gitlab`, `azure`, `bitbucket`, `jira`, `linear`, `monday`, `webhook`. No `$unset` operation is executed. |
| **Layer** | API |

---

### I-011: After Unlinking, GET /api/organization Does Not Show Integration as Enabled

| Field | Detail |
|---|---|
| **Test ID** | I-011 |
| **Title** | Following a successful `DELETE /api/integrations/github`, the org profile endpoint reflects the unlinked state |
| **Pre-conditions** | Org A has `integrations.github.enabled: true`. Admin JWT. |
| **Steps** | 1. `DELETE /api/integrations/github`. 2. `GET /api/organization` using same JWT. |
| **Expected Result** | Step 1: HTTP 200. Step 2: HTTP 200; `data.integrations.github` is either absent or has `enabled: false`. No encrypted credential fields (`encryptedToken`, `iv`, `authTag`) appear in the response. |
| **Layer** | API |

---

### I-012: ManualExecutionDrawer isEditable=false Blocks Step Marking on Completed Cycles

| Field | Detail |
|---|---|
| **Test ID** | I-012 |
| **Title** | The manual execution player renders in read-only mode when `isEditable` prop is `false` (cycle is COMPLETED) |
| **Pre-conditions** | Cycle `cycle-done` has `status: 'COMPLETED'`. Logged in as developer. |
| **Steps** | 1. Navigate to `/test-cycles`. 2. Open `cycle-done`. 3. Click into a manual test case item to open `ManualExecutionDrawer`. |
| **Expected Result** | The Pass / Fail / Skip buttons for each step are disabled or hidden. The drawer renders the recorded step statuses in a read-only state. No `PUT /api/test-cycles/:cycleId/items/:itemId` request is sent when the user attempts to click a step. |
| **Layer** | E2E |

---

## 6. Cross-Suite Security Matrix

The following table maps each new feature to the critical security properties that must hold. Any test that would cause a ✗ in the matrix is a P0 blocker.

| Feature | Tenant Isolation | Auth Required | Admin-Only Write | Input Validation | Secrets Not Leaked |
|---------|-----------------|--------------|-----------------|-----------------|-------------------|
| Project selector (F) | ✓ `projectId` must belong to requesting org | ✓ JWT | — | ✓ projectId required | — |
| Project limit enforcement (F) | ✓ | ✓ | — | — | — |
| Storage enforcement (G) | ✓ org-scoped counter | ✓ | — | — | — |
| Canonical limits (G) | — | ✓ | — | — | — |
| Stripe webhooks (G) | ✓ Stripe signature | Stripe HMAC | — | ✓ | — |
| Spec-to-Test SSE (H) | ✓ `projectId` ownership check | ✓ JWT | — | ✓ file type, size, fields | ✓ no raw LLM key in SSE |
| Spec-to-Test import (H) | ✓ all inserted docs carry `organizationId` | ✓ Dev/Admin | — | ✓ max 50/chunk | — |
| Bulk test-case delete (I) | ✓ cross-org IDs silently ignored | ✓ Dev/Admin | — | ✓ max 100 IDs | — |
| Suite delete (I) | ✓ | ✓ Dev/Admin | — | ✓ suite name required | — |
| Cycle delete (I) | ✓ | ✓ Dev/Admin | — | ✓ 409 if RUNNING | — |
| Integration unlink (I) | ✓ | ✓ Admin | ✓ 403 for non-admin | ✓ provider allowlist | ✓ no credential residue after unset |
