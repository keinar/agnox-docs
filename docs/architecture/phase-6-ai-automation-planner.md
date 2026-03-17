---
id: phase-6-ai-automation-planner
title: "Phase 6: AI Automation Planner — Technical Design Document"
sidebar_position: 20
---

> **Status:** ✅ Completed (v3.24.0)
> **Author:** Principal Staff Engineering / Product
> **Date:** 2026-03-17
> **Feature Flag:** `aiFeatures.automationPlanner`
> **Migrations:** `014-add-automation-planner-flag.ts`, `015-add-automation-plans-collection.ts`

---

## 1. Executive Summary

The **AI Automation Planner** is Phase 6 of the Agnox AI Orchestrator. It bridges the gap between manual QA work and automation engineering by turning the accumulated library of manual test cases into a structured, prioritized automation roadmap.

The planner operates in three distinct phases:

1. **Discovery** — scans manual tests (metadata only) and renders a strategic tree view annotated with AI-assigned risk levels and current automation coverage gaps.
2. **Configuration** — the user selects tests to automate and chooses a target framework and design pattern.
3. **Generation** — a deep-dive LLM call fetches full test step data for selected tests only and produces a rich, copy-paste-ready **Master Prompt Artifact** that engineers paste into Cursor, GitHub Copilot, or any IDE AI.

This feature has a hard constraint: **never send the full corpus of test steps to the LLM in bulk**. A 2-Stage scan architecture enforces this at the API layer.

---

## 2. Problem Statement

| Pain Point | Current State | Target State |
|---|---|---|
| Manual-to-automation gap | Engineers manually triage hundreds of test cases to decide what to automate first | AI scores each test for automation ROI and highlights quick wins |
| Context loss when writing automation | Engineers rewrite test logic from scratch based on memory/Jira tickets | A generated Master Prompt carries full preconditions, steps, and expected results into the IDE AI |
| Framework boilerplate cost | Setting up POM/Screenplay scaffolding is repetitive and error-prone | The artifact includes structural guidance and framework-specific conventions |
| Token cost / context limits | Naively sending all test data to an LLM is expensive and exceeds context windows | 2-Stage scan: metadata first, full steps only for selected tests |

---

## 3. User Flow & UX Specification

### 3.1 Entry Point

The feature is accessible from the main sidebar under a new **"Automation Planner"** nav item (icon: `Bot`), visible only when `aiFeatures.automationPlanner === true`. It is project-scoped — the active `projectId` from `ProjectContext` governs all data fetching.

---

### 3.2 Phase 1 — Discovery (The Tree View)

**Route:** `/automation-planner`

The page renders a two-panel layout:

**Left panel — Test Domain Tree**

```
📁 Authentication (12 tests)
    ├── 🔴 HIGH  Login with SSO             [not automated]
    ├── 🔴 HIGH  Password Reset Flow        [not automated]
    ├── 🟡 MED   Remember Me Toggle         [not automated]
    └── 🟢 LOW   Log Out                    [automated ✓]

📁 Checkout (9 tests)
    ├── 🔴 HIGH  Guest Checkout             [not automated]
    ├── 🔴 HIGH  Coupon Code Validation     [not automated]
    └── 🟢 LOW   Cart Empty State           [automated ✓]
```

Each tree node (test) displays:
- **Risk Badge** (`CRITICAL` / `HIGH` / `MEDIUM` / `LOW`) — AI-assigned in Stage 1.
- **Automation Status** — derived from a `linkedAutomationId` field on the test case document (null = not automated).
- **Checkbox** for selection.

The tree is grouped by `suiteName` (or tag if suite is absent). The ordering within each group is: `HIGH` risk first, then `MED`, then `LOW`.

**Right panel — Coverage Summary Card**

```
Project Coverage
─────────────────────────────
Total Manual Tests:    47
Already Automated:      9  (19%)
Not Automated:         38  (81%)
────────────────
HIGH Risk Gaps:        14  ← prioritise these
MED Risk Gaps:         16
LOW Risk Gaps:          8

[Select All HIGH-Risk Gaps →]   ← CTA button
```

**State management:** The tree and summary are populated from a single `POST /api/ai/automation-planner/discover` call (Stage 1). Results are held in component state for the session duration to avoid re-calling the LLM on every visit.

---

### 3.3 Phase 2 — Configuration

Once the user has checked ≥1 test, a sticky bottom bar appears:

```
[14 tests selected]   Framework: [Playwright ▾]   Pattern: [Page Object Model ▾]   [Generate Master Prompt →]
```

**Framework options (enum):**
- Playwright
- Cypress
- Pytest
- Vitest
- Jest
- WebdriverIO

**Design Pattern options (enum):**
- Page Object (`page-object`)
- Screenplay (`screenplay`)
- Fixture (`fixture`)
- Fluent (`fluent`)
- Data-Driven (`data-driven`)

The user's framework + pattern selection is persisted in `localStorage` as `automationPlanner:config` so it survives page refreshes.

---

### 3.4 Phase 3 — Generation (The Artifact)

Clicking "Generate Plan" triggers `POST /api/ai/automation-planner/generate` (Stage 2) via the `ArtifactModal.tsx` component. A loading state blocks the CTA for the duration of the LLM call.

On success, the UI renders a **full-page Artifact viewer**:

---

```markdown
# Automation Brief — Authentication Suite
Generated: 2026-03-17T14:22:00Z  |  Framework: Playwright (TypeScript)  |  Pattern: Page Object Model
─────────────────────────────────────────────────────────────────────

## Executive Summary
14 manual tests selected across 3 suites. 12 are HIGH/MED risk with no automation coverage.
Estimated automation effort: ~2–3 sprints. Recommended priority: Authentication first.

## Prerequisites
### Environment Variables Required
| Variable          | Description                    |
|-------------------|--------------------------------|
| BASE_URL          | Target app URL                 |
| TEST_USER_EMAIL   | QA account email               |
| TEST_USER_PASSWORD| QA account password            |
| ADMIN_API_KEY     | Needed for data seeding        |

### Test Data Setup
- Requires a user seeded with roles: [viewer, admin]
- Requires at least one active subscription in test environment

## Framework & Pattern Guidelines
- Use `PlaywrightBasePage` as base class for all page objects.
- Selectors MUST use data-testid attributes; never use CSS classes.
- All tests must be wrapped in `test.describe()` blocks matching the suite name.
- Use `test.beforeEach()` for login steps shared across a describe block.

─────────────────────────────────────────────────────────────────────
## MASTER PROMPT
(Paste the block below directly into Cursor / GitHub Copilot Chat)
─────────────────────────────────────────────────────────────────────

You are an expert automation engineer. Using the Playwright framework with TypeScript and the Page Object Model pattern, generate a complete, production-ready test suite for the following manual test cases.

### Test Case 1: Login with SSO
**Suite:** Authentication
**Risk Level:** HIGH
**Preconditions:**
- User must have an active SSO provider configured in settings
- Browser must not have a cached session

**Steps:**
1. Navigate to /login
2. Click "Sign in with SSO"
3. Enter corporate email in the SSO redirect form
4. Complete IdP authentication
5. Assert redirect to /dashboard

**Expected Result:** User lands on /dashboard with their name visible in the top-right avatar.

---

### Test Case 2: Password Reset Flow
...
```

---

**Artifact UI Controls:**
- **Copy to Clipboard** button (top-right of artifact panel).
- **Download as .md** button — saves file as `automation-brief-{projectName}-{date}.md`.
- **Back** link — returns to the tree without losing selection state.

The artifact is also persisted in a new MongoDB collection (`automation_briefs`) so users can retrieve it later without regenerating. See §6.2.

---

## 4. Architecture: 2-Stage LLM Scan

This is the most critical architectural constraint of the feature.

```
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 1 — METADATA SCAN  POST /api/ai/automation-planner/discover   │
│                                                                      │
│  MongoDB Query (test_cases collection):                              │
│    { organizationId, projectId [, suite, tags: {$in} ] }            │
│    Projection: { _id, title, suite, type,                           │
│                  stabilityScore, isQuarantined }                     │
│                                                                      │
│  Optional filters (body): suite?: string, tags?: string[]           │
│                                                                      │
│  LLM Input (~2k tokens for 200 tests):                              │
│    Array of { id, title, suite, type, stabilityScore, isQuarantined }│
│                                                                      │
│  LLM Output:                                                         │
│    { groups: [{ suite, riskLevel: CRITICAL|HIGH|MEDIUM|LOW,         │
│                 rationale, tests: [{ id, title, riskLevel }] }],    │
│      summary: string }                                               │
│                                                                      │
│  LLM failure fallback: ungrouped MEDIUM risk, graceful degradation  │
└─────────────────────────────────────────────────────────────────────┘

                     ↓ User selects tests + config ↓

┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 2 — DEEP DIVE   POST /api/ai/automation-planner/generate      │
│                                                                      │
│  MongoDB Query (test_cases collection):                              │
│    { _id: { $in: selectedIds }, organizationId, projectId }         │
│    Full documents: title, suite, preconditions, steps,              │
│                   (steps[].action, steps[].expectedResult)          │
│                                                                      │
│  Input validation: 1–30 IDs; unknown IDs silently skipped           │
│                                                                      │
│  LLM Input (~500–4k tokens, bounded by 30-test cap):                │
│    { framework, designPattern, projectName, tests: [full detail] }  │
│                                                                      │
│  LLM Output: GitHub-flavoured Markdown document with sections:      │
│    Executive Summary · Prerequisites · Folder Structure ·           │
│    Coverage Map · Implementation Notes · Master AI Coding Prompt    │
│                                                                      │
│  Persisted to: automationPlans collection                           │
│  Response: { projectName, markdown, planId }                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.1 Selection Limits (Hard Enforced at API Layer)

| Limit | Value | Rationale |
|---|---|---|
| Max tests per generation | 30 | Prevents context overflow; ~4k tokens of step data at worst |
| Max tests for metadata scan | 500 | Redis-cached; LLM call is ~5k tokens max |
| Stage 1 cache TTL | 1 hour | Balances freshness vs. cost |

If a user selects more than 30 tests, the API returns HTTP 422 with `error: "Selection too large. Maximum 30 tests per generation."` The UI enforces this client-side as well (disables CTA + shows inline warning).

---

## 5. API Endpoints

### 5.1 `POST /api/ai/automation-planner/discover`

**Auth:** JWT (standard)
**Feature flag guard:** `aiFeatures.automationPlanner`

**Request body:**
```typescript
{
  projectId: string;      // required — validated against org ownership
  suite?: string;         // optional pre-scan filter: only this suite
  tags?: string[];        // optional pre-scan filter: tests matching any of these tags
}
```

**Logic:**
1. Assert `aiFeatures.automationPlanner === true` on the org.
2. Verify `projectId` belongs to the calling org (tenant isolation).
3. Build MongoDB filter; apply optional `suite` / `tags.$in` filters.
4. Fetch metadata-only projection (`_id`, `title`, `suite`, `type`, `stabilityScore`, `isQuarantined`).
5. If 0 results: return empty groups + context-aware empty message (skip LLM).
6. Send compact payload to LLM for risk stratification.
7. On LLM failure: fall back to ungrouped MEDIUM risk (graceful degradation — never 500).
8. Return grouped tree with 4-level risk (`CRITICAL` / `HIGH` / `MEDIUM` / `LOW`).

**Response shape:**
```typescript
{
  success: true,
  data: {
    projectId: string;
    projectName: string;
    totalScanned: number;
    groups: ILlmGroup[];
    summary: string;
    filtersApplied: { suite: string | null; tags: string[] | null } | null;
  }
}
```

---

### 5.2 `POST /api/ai/automation-planner/generate`

**Auth:** JWT (standard)
**Feature flag guard:** `aiFeatures.automationPlanner`

**Request body:**
```typescript
{
  projectId: string;
  selectedTestIds: string[];  // 1–30 items
  framework: string;          // e.g. "playwright", "cypress", "pytest"
  designPattern: string;      // e.g. "page-object", "screenplay", "fixture"
}
```

**Logic:**
1. Validate inputs. Reject if `selectedTestIds.length > 30` (HTTP 400).
2. Verify `projectId` belongs to calling org.
3. Deep-fetch full test case documents including `steps` and `preconditions`.
4. Enforce `organizationId + projectId` on DB query (defence-in-depth).
5. Build Stage 2 LLM prompt requesting strict GitHub-flavoured Markdown output.
6. Safety-net extractor handles JSON-wrapped responses from models that ignore instructions.
7. Persist to `automationPlans` collection.
8. Return `{ projectName, markdown, planId }`.

**Response shape:**
```typescript
{
  success: true,
  data: {
    projectName: string;
    markdown: string;   // full GFM document — 6 sections
    planId: string;     // MongoDB ObjectId of persisted plan
  }
}
```

---

### 5.3 `GET /api/ai/automation-planner/history`

Returns the last 20 generated plans for the org (no LLM call). Feature flag guard applies. Optionally filtered by `?projectId=`.

**Response:** `{ success: true, data: IAutomationPlanDoc[] }` — full document including `markdown` field.

---

### 5.4 `GET /api/ai/automation-planner/filter-options`

**Query params:** `projectId` (required)

Returns distinct `suite` names and flattened distinct `tags` values for the given project. Used to populate filter bar dropdowns. No LLM call; tenant-isolated.

**Response:** `{ success: true, data: { suites: string[]; tags: string[] } }`

---

## 6. Data Models

### 6.1 LLM Response Types (internal, route-local)

```typescript
type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface ILlmTestNode {
  id: string;
  title: string;
  riskLevel: RiskLevel;
}

interface ILlmGroup {
  suite: string;
  riskLevel: RiskLevel;
  rationale: string;       // one-sentence group-level rationale from LLM
  tests: ILlmTestNode[];
}

interface ILlmDiscoveryResponse {
  groups: ILlmGroup[];
  summary: string;         // 2–3 sentence strategic overview
}
```

Unknown or malformed `riskLevel` values returned by the LLM fall back to `'MEDIUM'` — a single bad token never breaks the full response.

### 6.2 `automationPlans` MongoDB Collection

**Migration:** `015-add-automation-plans-collection.ts`

```typescript
interface IAutomationPlanDoc {
  organizationId: string;
  projectId: string;
  projectName: string;         // denormalised for display without a join
  testIds: string[];           // IDs of selected test cases
  framework: string;
  designPattern: string;
  markdown: string;            // full GFM artifact
  createdAt: Date;
}
```

**Indexes (created by migration 015):**
- `{ organizationId: 1, createdAt: -1 }` — org-scoped history list (`idx_org_created`)
- `{ organizationId: 1, projectId: 1, createdAt: -1 }` — project-filtered history (`idx_org_project_created`)
- No TTL — plans are retained indefinitely.

### 6.3 Feature Flag Addition to `IAiFeatureFlags`

```typescript
// In packages/shared-types/index.ts — appended to IAiFeatureFlags:
/** Phase 6: AI-driven automation planner. Migration 014. */
automationPlanner?: boolean;
```

The field is **optional** (`?`) so existing org documents without the flag are treated as disabled until migration 014 runs. Migration 014 back-fills `automationPlanner: true` on all existing organizations (enabled by default for existing customers).

---

## 7. Multi-Tenancy & Security

| Concern | Enforcement |
|---|---|
| Tenant isolation | Every MongoDB query in both stages MUST include `{ organizationId, projectId }` filter |
| Project scoping | `projectId` is read from the authenticated JWT claims (`req.user.activeProjectId`) — never from the request body |
| Selection tampering | Stage 2 re-validates that all `testCaseIds` belong to `organizationId + projectId` after DB fetch |
| LLM prompt injection | Test titles and steps are embedded in a structured JSON payload, not raw string interpolation, to neutralise prompt injection via test step content |
| Brief access | `GET /briefs/:briefId` filters by `organizationId` — a valid JWT from another org cannot access another org's briefs |

---

## 8. LLM Prompt Strategy

### Stage 1 — Risk Scoring System Prompt

```
You are a QA Risk Analyst. Given a list of manual test cases (title, suite, tags, status),
assign a risk level (HIGH, MED, or LOW) and a one-sentence rationale to each.

Risk scoring heuristics:
- HIGH: Tests covering authentication, payments, data mutations, or core user journeys.
- MED: Tests covering secondary workflows, settings, or conditional UI states.
- LOW: Tests covering cosmetic/UI states, empty states, or edge cases with low business impact.

Input: JSON array of { id, title, suiteName, tags, status }
Output: JSON array of { id, riskLevel, riskReason }

IMPORTANT: Output ONLY the JSON array. No markdown, no explanation.
```

### Stage 2 — Master Prompt Generation System Prompt

```
You are an expert automation architect. Your job is to produce a complete Automation Brief
for the following manual test cases.

Target framework: {framework}
Design pattern: {pattern}

You must return a JSON object with these exact keys:
{
  "executiveSummary": "...",
  "prerequisites": {
    "envVars": [{ "variable": "...", "description": "..." }],
    "testDataNotes": ["..."]
  },
  "frameworkGuidelines": ["..."],
  "masterPrompt": "..."  // Full markdown block for IDE AI consumption
}

The masterPrompt MUST:
1. Begin with a clear instruction to the IDE AI ("You are an expert automation engineer...").
2. Include every test case as a numbered section with its preconditions, steps, and expected result.
3. Include specific framework-idiomatic conventions (e.g., for POM: class names, file structure).
4. NEVER invent test steps. Only use what is provided below.

Test cases (full detail):
{JSON array of { title, suiteName, tags, preconditions, steps, expectedResult }}
```

---

## 9. Frontend Component Map

All UI is co-located in a single page file with inline sub-components:

```
src/pages/AutomationPlannerPage.tsx         ← route /automation-planner (all UI)
  ├── RiskBadge                             ← inline chip: CRITICAL (red) / HIGH (orange) /
  │                                            MEDIUM (yellow) / LOW (blue)
  ├── SuiteGroup                            ← collapsible group card + checkboxes per test
  ├── HistoryPanel                          ← right-side history drawer (last 20 plans)
  └── FilterBar                             ← suite + tag dropdowns with Clear button

src/components/ArtifactModal.tsx            ← full-screen modal for Markdown artifact
                                               (both new generation and history view)
```

**State phases:** `idle` → `scanning` → `results` → (error)

**Selection cap:** `MAX_SELECTION = 30` enforced client-side; sticky bottom bar appears when ≥ 1 test selected.

**Routing:**
```typescript
// App.tsx
<FeatureGatedRoute
  path="/automation-planner"
  element={<AutomationPlannerPage />}
  aiFeatureKey="automationPlanner"
/>
```

**Sidebar entry (Sidebar.tsx):**
```typescript
{ label: 'Automation Planner', path: '/automation-planner', icon: Wand2, aiFlag: 'automationPlanner' }
```

**localStorage persistence:** Framework + design-pattern selections persist across page refreshes via key `automationPlanner:config` (handled inside `ArtifactModal.tsx`).

---

## 10. Migration Scripts

Two migrations were created and are idempotent (safe to re-run):

### `migrations/014-add-automation-planner-flag.ts`

Back-fills `aiFeatures.automationPlanner = true` on all existing org documents where the field is absent. Existing customers have the feature enabled by default.

```
Run: npx tsx migrations/014-add-automation-planner-flag.ts
```

### `migrations/015-add-automation-plans-collection.ts`

Creates the `automationPlans` collection and its two compound indexes:
- `{ organizationId: 1, createdAt: -1 }` (named `idx_org_created`)
- `{ organizationId: 1, projectId: 1, createdAt: -1 }` (named `idx_org_project_created`)

```
Run: npx tsx migrations/015-add-automation-plans-collection.ts
```

---

## 11. Implementation — Completed ✅

All four steps were delivered in v3.24.0. Key implementation decisions that diverged from the original design:

| Design Spec | Actual Implementation | Reason |
|---|---|---|
| `GET /tree` | `POST /discover` (body: `projectId`, `suite?`, `tags?`) | Filters cannot be passed reliably as query params when they may be arrays |
| `GET /briefs` | `GET /history` | More intuitive naming; full `markdown` field always returned |
| `GET /briefs/:briefId` | Removed; history returns full docs | Simplification — history endpoint returns complete `markdown` |
| Collection: `automation_briefs` | Collection: `automationPlans` | Camel-case consistency with other collections |
| Migration 011 | Migrations 014 + 015 | Split for atomicity; 011 was already used by spec-to-test |
| Flag default: `false` | Flag back-filled as `true` | Product decision: feature enabled for existing customers |
| Sidebar icon: `Bot` | Sidebar icon: `Wand2` | Visual distinction from AI Chatbot (`MessageSquare`) |
| Redis caching of Stage 1 | No Redis cache (in-memory per request) | Avoided Redis dependency for this feature; re-scan is explicit user action |
| Sub-component files | All co-located in `AutomationPlannerPage.tsx` | Pragmatic — no external consumers; reduces file proliferation |

---

## 12. Test Coverage Plan

| Suite | Test Cases |
|---|---|
| Unit: `chat-sanitizer` analogue | No equivalent needed — no pipeline construction in this feature |
| Integration: Stage 1 API | Returns correct node shape; respects `organizationId+projectId` filter; returns cached result on second call; skips LLM when 0 tests |
| Integration: Stage 2 API | Rejects >30 tests with 422; rejects mismatched org IDs; persists brief to DB; returns correct shape |
| Integration: History API | Returns only briefs for calling org; `briefId` from another org returns 404 |
| E2E (Playwright): Planner flow | Feature-flag off → nav item hidden; feature-flag on → tree renders; selection + generate → artifact visible; copy button → clipboard; download → file saved |

---

## 13. Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | Should `linkedAutomationId` be a new field we add to `test_cases` documents to track which automated test covers a manual test? Or do we derive "automated" from a tag convention? | Product | Open |
| 2 | Max brief retention policy — are `automation_briefs` retained forever or do we add a 90-day TTL index in a future migration? | Product | Open |
| 3 | Should the framework enum be extended beyond the 5 listed here (e.g., WebdriverIO, Robot Framework)? | Engineering | Open |
| 4 | Multi-project scenario: does the "Select All HIGH-Risk Gaps" CTA span across projects or is it strictly single-project scoped? (Current design: single-project only.) | Product | Confirmed: single-project |
| 5 | Does Stage 2 generation need a streaming response for long briefs, or is a standard JSON response acceptable given the 30-test cap? | Engineering | Open |

---

## 14. Out of Scope (Phase 6)

The following are explicitly **not** part of this phase:

- Executing or scheduling the generated automation code.
- Two-way sync: auto-marking a manual test as "automated" when a linked test passes in CI.
- Diff-aware brief regeneration (only regenerate tests whose steps changed).
- Multi-project batch generation.
- Exporting briefs to Jira or Confluence.

These are candidates for Phase 7 or beyond.
