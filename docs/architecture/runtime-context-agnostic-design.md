---
id: runtime-context-agnostic-design
title: Framework-Agnostic Runtime Context Capture (Phase 8)
sidebar_position: 20
---

**Author:** Claude Code (Principal Architect Mode)
**Date:** 2026-03-18
**Status:** PROPOSED — Pending approval before implementation.
**Scope:** `packages/shared-types`, `packages/playwright-reporter`, `apps/worker-service/src/analysisService.ts`, new packages `@agnox/cypress-plugin`, `@agnox/pytest-plugin`

---

## The Prime Directive: Zero Test-Code Modification

> **Customers will never modify their test files.**

This is the non-negotiable constraint that governs every decision in this document. Agnox provides official SDKs and Plugins (collectively: **Adapters**) for each testing framework. Customers integrate an Adapter at the **configuration layer only** — one file, one import, no test code touched.

The two permitted integration touchpoints per framework are:

| Touchpoint | Example | Framework |
|---|---|---|
| Config file | `playwright.config.ts`, `cypress.config.ts`, `wdio.conf.ts` | All |
| Global support / setup file | `cypress/support/e2e.ts`, `conftest.py` | Cypress, Pytest |

Any design that requires customers to wrap individual test functions, add `try/catch` blocks, import fixtures per-test, or call any Agnox API from within test code is **rejected** at the architecture review stage.

**Why this matters commercially:** Enterprise customers have test suites with hundreds or thousands of test files. A requirement to modify each file is a showstopper for adoption. The Adapter must be invisible once installed.

---

## SDK Release Roadmap

Phase 8 is broken into three sequential releases, each delivering a complete, production-ready Adapter for a major testing ecosystem.

### Phase 8.1 — `@agnox/playwright-reporter` v2.0 (JS/TS)

**Target:** Playwright users already on the existing `v1.x` reporter.
**Delivery:** Upgrade the existing npm package. Backwards-compatible — `v1.x` configs continue to work unchanged.

Key additions over v1:
- Export an `{ auto: true }` fixture that captures `IRuntimeContext` automatically.
- Users update their **single shared fixtures file** (e.g. `tests/fixtures/base.ts`) to re-export `test` from `@agnox/playwright-reporter` instead of `@playwright/test`. Individual test files are never touched.
- Reporter's `onTestEnd` reads the `agnox:runtimeContext` annotation and includes it in the `test-end` ingest event.

**Migration path (one-line change):**
```diff
// tests/fixtures/base.ts
- import { test, expect } from '@playwright/test';
+ import { test, expect } from '@agnox/playwright-reporter';
```

**No other changes anywhere in the test suite.**

---

### Phase 8.2 — `@agnox/cypress-plugin` (JS/TS)

**Target:** Cypress 12+ users (Component and E2E).
**Delivery:** New npm package. Two files to edit — both are configuration/support files, never individual test specs.

Customer setup:

```typescript
// cypress.config.ts — config file, not a test file
import { agnoxPlugin } from '@agnox/cypress-plugin';
export default defineConfig({
  reporter: '@agnox/cypress-reporter',
  e2e: {
    setupNodeEvents(on, config) {
      agnoxPlugin(on, config, { apiKey: '...', projectId: '...' });
      return config;
    },
  },
});
```

```typescript
// cypress/support/e2e.ts — global support file, not a test file
import '@agnox/cypress-plugin/support';
```

Zero test spec files are modified.

---

### Phase 8.3 — `agnox-pytest` (Python)

**Target:** Pytest users with Selenium, Playwright-Python, or any WebDriver-compatible driver.
**Delivery:** New PyPI package. Zero test files modified — the plugin registers automatically via Pytest's plugin discovery.

Customer setup:

```ini
# pyproject.toml — project config, not a test file
[tool.pytest.ini_options]
agnox_api_key = "..."
agnox_project_id = "..."
```

```python
# conftest.py — global fixtures file, not a test file
pytest_plugins = ['agnox_pytest']
```

The plugin hooks into `pytest_runtest_makereport` at the `call` phase — while the browser is still alive — to capture `driver.current_url` and related context. No individual test functions are modified.

---

## 0. Problem Statement

### The Hack We Are Replacing

`tests/fixtures/baseTest.ts` currently contains:

```typescript
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'failed' || testInfo.status === 'timedOut') {
    try {
      console.error(`[Agnox Context] Current Page URL: ${page.url()}`);
    } catch { /* page may already be closed */ }
  }
});
```

And `apps/worker-service/src/analysisService.ts` has hardcoded text matching for this exact string in both the Analyzer and Critic system prompts:

> *"CRITICAL: Pay special attention to logs prefixed with '[Agnox Context]'. This reveals the exact URL at the moment of failure..."*

**This design has four fatal flaws for a SaaS platform:**

| Flaw | Impact |
|---|---|
| Playwright-only | Cypress, Pytest, WebdriverIO customers get zero runtime context |
| Requires test-code modification | Customer must manually add our fixture to every project |
| Relies on string parsing | The AI is prompted to grep for a magic string in 30k chars of noise |
| Context is partial | Only captures URL; no network errors, console errors, or DOM state |

### The Goal

Capture runtime context **automatically** at the point of failure, in a **structured, typed payload**, sent directly on the `test-end` event. The AI Worker consumes a structured object — not free-form log text — eliminating token waste and hallucination risk.

---

## 1. Guiding Principle: The Reporter Contract

Every Agnox reporter/plugin (regardless of framework) must fulfill the following contract on test failure:

1. **Capture** a structured `IRuntimeContext` object from the live browser/driver state.
2. **Attach** it to the test's result metadata via the framework's native mechanism.
3. **Serialize** it as the `runtimeContext` field on the `test-end` ingest event.
4. **Never fail** the test suite if context capture fails (graceful degradation).

The mechanism for steps 1–2 is framework-specific. Steps 3–4 are uniform across all reporters.

---

## 2. Schema Extension

### 2.1 New Type: `IRuntimeContext`

Add to `packages/shared-types/index.ts`:

```typescript
/**
 * Structured browser/driver state captured at the exact moment a test fails.
 * Populated by the framework-specific Agnox reporter or plugin.
 * All fields are optional — partial context is always better than none.
 */
export interface IRuntimeContext {
  /** The page URL at the moment of test failure. */
  failureUrl?: string;

  /** The page <title> at the moment of test failure. */
  pageTitle?: string;

  /** console.error() messages captured during the test. */
  consoleErrors?: string[];

  /** Network requests that failed (status >= 400 or network error). */
  networkErrors?: INetworkError[];

  /**
   * Lightweight DOM snapshot. Prefer aria-tree format over raw HTML.
   * MUST be capped at 8 KB by the reporter before attaching.
   * Raw HTML is acceptable only for simple, non-React pages.
   */
  domSnapshot?: string;

  /** Viewport dimensions at the time of capture. */
  viewportSize?: { width: number; height: number };

  /** The number of retry attempts at the time of failure (Playwright-specific). */
  retryIndex?: number;
}

export interface INetworkError {
  /** The request URL. */
  url: string;
  /** HTTP status code — absent for connection-level failures. */
  status?: number;
  /** HTTP method (GET, POST, etc.) */
  method?: string;
  /** Playwright resource type (xhr, fetch, document, etc.) */
  resourceType?: string;
}
```

**Design constraints on `domSnapshot`:**
- Cap at **8 KB** in the reporter before sending. If the snapshot exceeds 8 KB, truncate with `...[truncated]`.
- Prefer **ARIA tree** (Playwright's `page.accessibility.snapshot()`) over raw `outerHTML` — it is ~10× smaller and contains far more signal per token.
- Never capture `innerHTML` of the entire `<body>`. That is the DOM-noise problem we're already solving with `stripDomNoise()`.

---

### 2.2 Updated `IIngestEvent` — `test-end` Variant

Modify the `IIngestEvent` discriminated union in both `packages/shared-types/index.ts` and the mirrored copy in `packages/playwright-reporter/src/types.ts`:

```typescript
// BEFORE
| {
    type: 'test-end'; testId: string;
    status: 'passed' | 'failed' | 'skipped' | 'timedOut';
    duration: number; error?: string; timestamp: number
  }

// AFTER
| {
    type: 'test-end'; testId: string;
    status: 'passed' | 'failed' | 'skipped' | 'timedOut';
    duration: number; error?: string; timestamp: number;
    /**
     * Structured browser/driver state at the moment of failure.
     * Only populated when status is 'failed' or 'timedOut'.
     * Absent for passed and skipped tests (no overhead on happy path).
     */
    runtimeContext?: IRuntimeContext;
  }
```

**Backwards compatibility:** The field is `optional`. The Ingest API Zod schema must use `.optional()`. Old reporters that do not send this field continue to work — the AI Worker falls back to log-based analysis.

---

### 2.3 Updated `ITestResult` (stored on `IExecution`)

Extend `ITestResult` in `packages/shared-types/index.ts` to persist the context alongside each test result:

```typescript
export interface ITestResult {
  testId: string;
  name?: string;
  status: string;
  duration: number;
  error?: string | null;
  timestamp?: number;
  errorHash?: string;
  performanceDegradation?: boolean;
  attemptCount?: number;
  /** Persisted from the ingest event — drives structured AI analysis. */
  runtimeContext?: IRuntimeContext;
}
```

This means the structured context survives teardown and is stored permanently in the `executions` collection. The AI can re-analyse it without re-running the tests.

---

## 3. How the AI Worker Consumes Structured Context

### 3.1 The Problem with the Current Approach

`analyzeTestFailure()` in `analysisService.ts` receives `logs: string` — a minified, truncated slice of stdout. The Analyzer system prompt instructs the LLM to look for the string `[Agnox Context]`. This is:

- **Fragile**: If `console.error` output is buffered differently or interleaved, the prefix can be split across lines.
- **Wasteful**: The URL is buried in 30k characters of noise.
- **Limited**: Only the URL is captured; no network errors or console errors.

### 3.2 The New Approach: Structured Context Injection

The `analyzeTestFailure()` signature will be extended to accept structured context alongside raw logs:

```typescript
// PROPOSED new signature
export async function analyzeTestFailure(
  logs: string,
  image: string,
  failedTests: Array<{
    testId: string;
    error?: string | null;
    errorHash?: string;
    runtimeContext?: IRuntimeContext;  // NEW
  }>,
  llmConfig: IResolvedLlmConfig
): Promise<IAnalysisResult>
```

The Analyzer prompt gains a dedicated `RUNTIME CONTEXT` section that is rendered from the structured data — no string parsing required:

```typescript
// Build context section before constructing analyzerPrompt
function buildRuntimeContextSection(
  failedTests: Array<{ testId: string; runtimeContext?: IRuntimeContext }>
): string {
  const testsWithContext = failedTests.filter(t => t.runtimeContext);
  if (testsWithContext.length === 0) return '';

  const lines: string[] = ['\n\nRUNTIME CONTEXT AT FAILURE:'];
  for (const test of testsWithContext) {
    const ctx = test.runtimeContext!;
    lines.push(`\nTest: ${test.testId}`);
    if (ctx.failureUrl)      lines.push(`  Failure URL: ${ctx.failureUrl}`);
    if (ctx.pageTitle)       lines.push(`  Page Title: ${ctx.pageTitle}`);
    if (ctx.viewportSize)    lines.push(`  Viewport: ${ctx.viewportSize.width}×${ctx.viewportSize.height}`);
    if (ctx.retryIndex !== undefined) lines.push(`  Retry Attempt: ${ctx.retryIndex}`);
    if (ctx.consoleErrors?.length) {
      lines.push('  Console Errors:');
      ctx.consoleErrors.slice(0, 5).forEach(e => lines.push(`    - ${e}`));
    }
    if (ctx.networkErrors?.length) {
      lines.push('  Failed Network Requests:');
      ctx.networkErrors.slice(0, 10).forEach(r =>
        lines.push(`    - [${r.method ?? 'REQ'}] ${r.url}${r.status ? ` → HTTP ${r.status}` : ' (connection failed)'}`)
      );
    }
    if (ctx.domSnapshot) {
      lines.push(`  DOM Snapshot (capped 8KB):\n${ctx.domSnapshot}`);
    }
  }
  return lines.join('\n');
}
```

The Analyzer system prompt is updated — the magic-string instruction is replaced:

```
// REMOVE from system prompt:
"CRITICAL: Pay special attention to logs prefixed with '[Agnox Context]'..."

// REPLACE with:
"A structured RUNTIME CONTEXT section will be provided below the logs when
available. This contains the exact browser URL, failed network requests, and
console errors at the moment of failure. Always prioritise this structured
data over log text when diagnosing URL, routing, or network-related failures."
```

The `extractCriticExcerpt()` keyword regex in `ai-payload-minifier.ts` should have `Agnox Context` removed from `DIAGNOSTIC_KEYWORD_RE` (it is no longer relevant now that context is structured).

---

## 4. Framework-Specific Extraction Strategies

### 4.1 Playwright (JS/TS) — `@agnox/playwright-reporter`

**The Problem:** The Playwright reporter runs in a **separate Node.js process** from the test workers. The reporter has no direct access to `page` objects. The communication channel between test code and reporter is the `TestResult` object — specifically its `annotations` and `attachments` arrays.

**The Solution: Auto Fixture with `{ auto: true }`**

Export an extended `test` object from `@agnox/playwright-reporter` (or a `/fixtures` subpath) that injects a zero-config fixture:

```typescript
// packages/playwright-reporter/src/fixtures.ts
import { test as base, TestInfo } from '@playwright/test';

/**
 * Agnox-extended test fixture.
 * Drop-in replacement for @playwright/test's `test` object.
 * Automatically captures runtime context on failure — no test code changes needed.
 *
 * Usage (update your fixture file or tests):
 *   import { test, expect } from '@agnox/playwright-reporter';
 *   // instead of: import { test, expect } from '@playwright/test';
 */
export const test = base.extend<{
  /**
   * Internal fixture. { auto: true } means it runs for every test
   * without being explicitly referenced in test code.
   */
  _agnoxContextCapture: void;
}>({
  _agnoxContextCapture: [
    async ({ page }, use, testInfo: TestInfo) => {
      // Collect console errors throughout the test
      const consoleErrors: string[] = [];
      const networkErrors: Array<{ url: string; status?: number; method?: string; resourceType?: string }> = [];

      const onConsole = (msg: any) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200));
      };
      const onRequestFailed = (request: any) => {
        networkErrors.push({
          url: request.url(),
          method: request.method(),
          resourceType: request.resourceType(),
          // No status on failed requests — connection-level failure
        });
      };
      const onResponse = async (response: any) => {
        if (response.status() >= 400) {
          networkErrors.push({
            url: response.url(),
            status: response.status(),
            method: response.request().method(),
            resourceType: response.request().resourceType(),
          });
        }
      };

      page.on('console', onConsole);
      page.on('requestfailed', onRequestFailed);
      page.on('response', onResponse);

      await use(); // ← run the test

      // Only capture context on failure — zero overhead on passing tests
      if (testInfo.status !== 'passed' && testInfo.status !== 'skipped') {
        try {
          const ctx: Record<string, unknown> = {
            failureUrl: page.url(),
            pageTitle: await page.title(),
            viewportSize: page.viewportSize() ?? undefined,
            retryIndex: testInfo.retry,
            consoleErrors: consoleErrors.slice(0, 20),
            networkErrors: networkErrors.slice(0, 20),
          };

          // Lightweight DOM snapshot via ARIA tree (much smaller than outerHTML)
          try {
            const ariaSnapshot = await page.accessibility.snapshot();
            if (ariaSnapshot) {
              const snapshotStr = JSON.stringify(ariaSnapshot);
              ctx.domSnapshot = snapshotStr.length > 8192
                ? snapshotStr.slice(0, 8192) + '...[truncated]'
                : snapshotStr;
            }
          } catch {
            // accessibility.snapshot() fails on non-chromium; skip silently
          }

          // Attach as a typed annotation — reporter reads this in onTestEnd
          testInfo.annotations.push({
            type: 'agnox:runtimeContext',
            description: JSON.stringify(ctx),
          });
        } catch {
          // page may already be closed after timeout; degrade silently
        }
      }

      page.off('console', onConsole);
      page.off('requestfailed', onRequestFailed);
      page.off('response', onResponse);
    },
    { auto: true }, // ← KEY: zero test-code impact
  ],
});

export { expect } from '@playwright/test';
```

**Reporter changes in `onTestEnd`:**

```typescript
// In packages/playwright-reporter/src/index.ts

onTestEnd(test: TestCase, result: TestResult): void {
  // ... existing summary accumulation ...

  // Extract structured context from annotations written by the auto fixture
  let runtimeContext: IRuntimeContext | undefined;
  const ctxAnnotation = result.annotations.find(
    a => a.type === 'agnox:runtimeContext'
  );
  if (ctxAnnotation?.description) {
    try {
      runtimeContext = JSON.parse(ctxAnnotation.description) as IRuntimeContext;
    } catch { /* malformed JSON; degrade to undefined */ }
  }

  this.batcher.push({
    type: 'test-end',
    testId: test.id,
    status: ingestStatus,
    duration: result.duration,
    error: result.errors[0]?.message,
    timestamp: Date.now(),
    runtimeContext, // undefined for passing tests → field is omitted by JSON.stringify
  });
}
```

**Zero-code migration for existing Agnox customers:**

Before (requires manual fixture changes):
```typescript
// tests/fixtures/baseTest.ts — MANUAL HACK
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'failed') {
    console.error(`[Agnox Context] Current Page URL: ${page.url()}`);
  }
});
```

After (one change to fixture file, zero changes to individual tests):
```typescript
// tests/fixtures/baseTest.ts — CLEAN
export { test, expect } from '@agnox/playwright-reporter';
// The auto fixture handles everything automatically
```

---

### 4.2 Cypress — `@agnox/cypress-plugin`

**The Architecture Challenge:** In Cypress, the browser (test code) and the Node.js process (reporter/plugin) are in separate processes. The URL and DOM state live in the browser. The Agnox reporter (Mocha-compatible) runs in Node.js. They cannot share memory directly.

**The Bridge: `cy.task()` + In-Memory Plugin Store**

Cypress provides `cy.task()` as the official IPC channel from browser → Node.js plugin. The Agnox plugin registers a task handler; the Agnox support file (browser-side) calls it on failure.

```
Browser (test)                    Node.js (plugin process)
───────────────                   ────────────────────────
afterEach → capture context  →    cy.task('agnox:captureContext', ctx)
                                  → stores ctx in Map keyed by test title
                                                 ↓
                              Mocha reporter's afterEach reads from Map
                                  → attaches to test-end ingest event
```

**`@agnox/cypress-plugin` package structure:**

```
packages/cypress-plugin/
├── src/
│   ├── plugin.ts          # Node.js side: registers cy.task, holds context store
│   ├── support.ts         # Browser side: afterEach hook
│   └── reporter.ts        # Mocha-compatible reporter that reads the store
└── package.json
```

**`plugin.ts` (Node.js side — added to `setupNodeEvents`):**

```typescript
// packages/cypress-plugin/src/plugin.ts

export interface AgnoxCypressOptions {
  apiKey: string;
  projectId: string;
  baseUrl?: string;
}

// Keyed by test full title. Cleared after the reporter reads each entry.
const contextStore = new Map<string, IRuntimeContext>();

export function agnoxPlugin(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
  options: AgnoxCypressOptions
): void {
  on('task', {
    'agnox:captureContext'({ testTitle, context }: {
      testTitle: string;
      context: IRuntimeContext;
    }) {
      contextStore.set(testTitle, context);
      return null; // cy.task must return a value
    },
  });

  on('after:run', async (results: CypressCommandLine.CypressRunResult) => {
    // The reporter handles teardown; this is a safety net to flush any
    // un-flushed context if the reporter was not configured.
    contextStore.clear();
  });
}

export function getContextForTest(testTitle: string): IRuntimeContext | undefined {
  const ctx = contextStore.get(testTitle);
  contextStore.delete(testTitle); // consume once
  return ctx;
}
```

**`support.ts` (Browser side — added to `cypress/support/e2e.ts`):**

```typescript
// packages/cypress-plugin/src/support.ts
// Customer adds: import '@agnox/cypress-plugin/support'; to cypress/support/e2e.ts

const consoleErrors: string[] = [];
const networkErrors: Array<{ url: string; status?: number; method?: string }> = [];

// Intercept console.error (Cypress runs in the browser, so window is available)
Cypress.on('window:before:load', (win) => {
  const originalError = win.console.error.bind(win.console);
  win.console.error = (...args: unknown[]) => {
    consoleErrors.push(args.map(String).join(' ').slice(0, 200));
    originalError(...args);
  };
});

// Capture failed XHR/fetch via cy.intercept at the global level
beforeEach(() => {
  consoleErrors.length = 0;
  networkErrors.length = 0;

  // Spy on all responses to capture 4xx/5xx
  cy.intercept('**', (req) => {
    req.continue((res) => {
      if (res.statusCode >= 400) {
        networkErrors.push({ url: req.url, status: res.statusCode, method: req.method });
      }
    });
  }).as('agnox:networkSpy');
});

afterEach(function () {
  // `this.currentTest` is the Mocha test object — has .state and .fullTitle()
  if (this.currentTest?.state === 'failed') {
    // cy commands are queued — they run asynchronously after afterEach resolves
    cy.url().then((url) =>
      cy.title().then((title) => {
        const ctx: IRuntimeContext = {
          failureUrl: url,
          pageTitle: title,
          consoleErrors: [...consoleErrors].slice(0, 20),
          networkErrors: [...networkErrors].slice(0, 20),
        };
        // Send context to Node.js plugin via task
        cy.task('agnox:captureContext', {
          testTitle: this.currentTest!.fullTitle(),
          context: ctx,
        }, { log: false, timeout: 5000 }).catch(() => {
          // Gracefully fail if task is not registered (plugin not configured)
        });
      })
    );
  }
});
```

**Customer configuration (`cypress.config.ts`):**

```typescript
import { defineConfig } from 'cypress';
import { agnoxPlugin } from '@agnox/cypress-plugin';

export default defineConfig({
  reporter: '@agnox/cypress-reporter',
  reporterOptions: {
    apiKey: process.env.AGNOX_API_KEY,
    projectId: process.env.AGNOX_PROJECT_ID,
  },
  e2e: {
    setupNodeEvents(on, config) {
      agnoxPlugin(on, config, {
        apiKey: process.env.AGNOX_API_KEY!,
        projectId: process.env.AGNOX_PROJECT_ID!,
      });
      return config;
    },
  },
});
```

**Customer support file (`cypress/support/e2e.ts`):**

```typescript
import '@agnox/cypress-plugin/support'; // ← one line; automatic context capture
```

---

### 4.3 Pytest / Selenium — `agnox-pytest-plugin`

**The Architecture Advantage:** Pytest has a first-class plugin hook system. Critically, the `pytest_runtest_makereport` hook fires **synchronously during test execution**, while the browser is still open. This is the cleanest interception point across all frameworks.

```
pytest_runtest_makereport(item, call)
  └── when: 'call' phase + report.failed
        └── driver = item.funcargs.get('driver')  ← still open!
              └── capture driver.current_url, driver.title
                    └── report.user_properties.append(('agnox_context', ctx))
                          └── agnox_pytest_plugin reads this in its reporter hook
```

**`agnox-pytest-plugin` (Python package):**

```python
# agnox_pytest_plugin/plugin.py

import json
import pytest
from typing import Any, Optional

# Supported WebDriver attribute names across common fixtures
_DRIVER_FIXTURE_NAMES = ('driver', 'browser', 'page', 'selenium', 'webdriver')


def _extract_context(item) -> Optional[dict]:
    """
    Try to extract runtime context from any known WebDriver/browser fixture.
    Returns None if no supported driver is found or capture fails.
    """
    for name in _DRIVER_FIXTURE_NAMES:
        driver = item.funcargs.get(name)
        if driver is None:
            continue
        try:
            # Selenium / WebDriver API
            if hasattr(driver, 'current_url'):
                ctx = {
                    'failureUrl': driver.current_url,
                    'pageTitle': driver.title,
                }
                # Capture browser console logs (Chrome/Edge only via CDP)
                try:
                    logs = driver.get_log('browser')
                    ctx['consoleErrors'] = [
                        l['message'][:200]
                        for l in logs
                        if l.get('level') == 'SEVERE'
                    ][:20]
                except Exception:
                    pass
                return ctx

            # Playwright-Python API (sync)
            if hasattr(driver, 'url') and hasattr(driver, 'title'):
                ctx = {
                    'failureUrl': driver.url,
                    'pageTitle': driver.title(),
                }
                return ctx

        except Exception:
            continue  # driver may be closed or unresponsive; degrade silently

    return None


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item: pytest.Item, call: pytest.CallInfo):
    """
    Intercepts test result creation. When a test fails during the 'call' phase,
    captures runtime context while the browser is still open.
    """
    outcome = yield
    report: pytest.TestReport = outcome.get_result()

    if report.when == 'call' and report.failed:
        ctx = _extract_context(item)
        if ctx is not None:
            # Store on the report via user_properties (survives to reporting phase)
            report.user_properties.append(('agnox_runtime_context', json.dumps(ctx)))
```

The Agnox pytest reporter reads `report.user_properties` to extract the serialized context and sends it on the `test-end` ingest event.

**Zero customer code change** — they install the plugin and add to `pyproject.toml` or `pytest.ini`:

```ini
[pytest]
# pyproject.toml
[tool.pytest.ini_options]
agnox_api_key = "..."
agnox_project_id = "..."

# OR via conftest.py (one file, no test modifications):
# pytest_plugins = ['agnox_pytest_plugin']
```

---

### 4.4 WebdriverIO — `@agnox/wdio-service`

WebdriverIO has a Service API with `afterTest(test, context, { error })` that fires in the Node.js process with direct access to the browser object.

```typescript
// packages/wdio-service/src/service.ts
import type { Services, TestStats } from '@wdio/types';

export default class AgnoxService implements Services.ServiceInstance {
  private contextStore = new Map<string, IRuntimeContext>();

  async afterTest(
    test: TestStats,
    context: unknown,
    { error }: { error?: Error }
  ) {
    if (!error) return; // only on failure

    try {
      const ctx: IRuntimeContext = {
        failureUrl: await browser.getUrl(),
        pageTitle: await browser.getTitle(),
        viewportSize: await browser.getWindowSize(),
      };
      // Capture browser console logs via CDP (Chrome-only)
      try {
        const logs = await browser.getLogs('browser');
        ctx.consoleErrors = logs
          .filter((l: any) => l.level === 'SEVERE')
          .map((l: any) => l.message.slice(0, 200))
          .slice(0, 20);
      } catch { /* non-chrome or CDP not available */ }

      this.contextStore.set(test.fullName, ctx);
    } catch { /* browser may be unresponsive */ }
  }

  getContextForTest(fullName: string): IRuntimeContext | undefined {
    const ctx = this.contextStore.get(fullName);
    this.contextStore.delete(fullName);
    return ctx;
  }
}
```

Customer configuration in `wdio.conf.ts`:

```typescript
import AgnoxReporter from '@agnox/wdio-reporter';
import AgnoxService from '@agnox/wdio-service';

export const config = {
  services: [[AgnoxService, {}]],
  reporters: [[AgnoxReporter, {
    apiKey: process.env.AGNOX_API_KEY,
    projectId: process.env.AGNOX_PROJECT_ID,
  }]],
};
```

---

## 5. End-to-End Data Flow (Post-Implementation)

```
Framework (any)
  │
  ├── Test fails
  │     └── Reporter/Plugin captures IRuntimeContext from live browser
  │           (URL, title, console errors, network errors, ARIA snapshot)
  │
  ├── POST /api/ingest/event
  │     └── { type: 'test-end', status: 'failed', runtimeContext: {...} }
  │
  ├── Ingest API (producer-service/src/routes/ingest.ts)
  │     ├── Buffers runtimeContext in Redis: ingest:results:{sessionId}
  │     └── (no change to streaming pipeline)
  │
  ├── POST /api/ingest/teardown
  │     └── Drains Redis buffer → builds ITestResult[] with runtimeContext embedded
  │           → persists to executions.tests[] in MongoDB
  │
  └── AI Worker (worker-service/src/analysisService.ts)
        ├── analyzeTestFailure() receives failedTests[].runtimeContext (structured)
        ├── buildRuntimeContextSection() renders a concise STRUCTURED CONTEXT block
        │     (~200 tokens vs ~2000 tokens from log string parsing)
        └── Analyzer + Critic consume structured context directly
              → higher accuracy, lower token cost, zero hallucination from magic strings
```

---

## 6. Ingest API Schema Changes

### `POST /api/ingest/event` — Zod schema update

In `apps/producer-service/src/routes/ingest.ts`, update the Zod validation for the `test-end` event variant:

```typescript
const NetworkErrorSchema = z.object({
  url: z.string().url(),
  status: z.number().int().optional(),
  method: z.string().optional(),
  resourceType: z.string().optional(),
});

const RuntimeContextSchema = z.object({
  failureUrl: z.string().url().optional(),
  pageTitle: z.string().max(256).optional(),
  consoleErrors: z.array(z.string().max(500)).max(20).optional(),
  networkErrors: z.array(NetworkErrorSchema).max(20).optional(),
  domSnapshot: z.string().max(8192).optional(), // 8KB hard cap enforced here too
  viewportSize: z.object({ width: z.number(), height: z.number() }).optional(),
  retryIndex: z.number().int().min(0).optional(),
}).strict();

// In the IngestEventSchema union:
z.object({
  type: z.literal('test-end'),
  testId: z.string(),
  status: z.enum(['passed', 'failed', 'skipped', 'timedOut']),
  duration: z.number(),
  error: z.string().optional(),
  timestamp: z.number(),
  runtimeContext: RuntimeContextSchema.optional(), // ← NEW
})
```

---

## 7. Deprecation Plan for `[Agnox Context]` Hack

| Milestone | Action |
|---|---|
| **Phase 8.0 — Schema** | Add `IRuntimeContext` to shared-types. Add `runtimeContext?` to `IIngestEvent` and `ITestResult`. Update Ingest API Zod schema. Both old and new reporters work. |
| **Phase 8.1 — Playwright Adapter** | Ship `@agnox/playwright-reporter` v2.0 with auto fixture. Update `tests/fixtures/baseTest.ts` (one-line re-export change — this is a config/fixtures file, not a test file). Update `analysisService.ts` to prefer structured context; keep `[Agnox Context]` log-grep as a fallback for v1.x reporters in the field. |
| **Phase 8.2 — Cypress Adapter** | Ship `@agnox/cypress-plugin`. Remove `[Agnox Context]` from `DIAGNOSTIC_KEYWORD_RE` in `ai-payload-minifier.ts` and from system prompts — by this point all first-party reporters send structured context. |
| **Phase 8.3 — Pytest Adapter** | Ship `agnox-pytest` to PyPI. Platform now delivers full runtime context across all four major testing ecosystems. |

---

## 8. Implementation Order

**Phase 8.0 — Shared Schema (prerequisite for all phases)**

```
1. packages/shared-types/index.ts
   └── Add IRuntimeContext, INetworkError interfaces
   └── Add runtimeContext?: IRuntimeContext to test-end variant of IIngestEvent
   └── Add runtimeContext?: IRuntimeContext to ITestResult

2. apps/producer-service/src/routes/ingest.ts
   └── Add RuntimeContextSchema Zod object
   └── Add runtimeContext field to test-end event Zod schema
   └── Buffer runtimeContext in ingest:results:{sessionId} Redis RPUSH payload

3. apps/worker-service/src/analysisService.ts
   └── Add runtimeContext to failedTests parameter type
   └── Add buildRuntimeContextSection() helper
   └── Update Analyzer prompt to consume RUNTIME CONTEXT block
   └── Keep [Agnox Context] log-grep as fallback (v1.x reporter compatibility)
```

**Phase 8.1 — Playwright Adapter (JS/TS)**

```
4. packages/playwright-reporter/src/types.ts
   └── Mirror the IIngestEvent change (self-contained by design)

5. packages/playwright-reporter/src/fixtures.ts   [NEW FILE]
   └── Export auto fixture { auto: true } with page listener + annotation attachment
   └── Export test (extended) and passthrough expect

6. packages/playwright-reporter/src/index.ts
   └── onTestEnd: read agnox:runtimeContext annotation → include in batcher.push()

7. tests/fixtures/baseTest.ts  [config/fixtures file — NOT a test file]
   └── Remove manual afterEach hack
   └── One-line change: re-export test/expect from @agnox/playwright-reporter
```

**Phase 8.2 — Cypress Adapter (JS/TS)**

```
8. packages/cypress-plugin/   [NEW PACKAGE]
   └── src/plugin.ts   — Node.js: cy.task handler + context store
   └── src/support.ts  — Browser: afterEach capture + cy.task bridge
   └── src/reporter.ts — Mocha-compatible reporter that reads context store

9. apps/worker-service/src/utils/ai-payload-minifier.ts
   └── Remove 'Agnox Context' from DIAGNOSTIC_KEYWORD_RE

10. apps/worker-service/src/analysisService.ts
    └── Remove [Agnox Context] magic-string fallback from system prompts
```

**Phase 8.3 — Pytest Adapter (Python)**

```
11. packages/agnox-pytest/   [NEW PYTHON PACKAGE]
    └── agnox_pytest/plugin.py  — pytest_runtest_makereport hookwrapper
    └── agnox_pytest/reporter.py — Ingest API client (POST setup/event/teardown)
    └── setup.cfg / pyproject.toml — entry_points for auto-discovery
```

---

## 9. Open Questions

| # | Question | Recommendation |
|---|---|---|
| 1 | Should `domSnapshot` use Playwright's `page.accessibility.snapshot()` (ARIA tree as JSON) or `page.content()` (raw HTML)? | ARIA tree — 10× smaller, semantically richer for the LLM. Raw HTML only as fallback when accessibility API fails. |
| 2 | Should network response interception (for 4xx/5xx) in the Playwright fixture use `page.on('response', ...)` or a `page.route()`? | `page.on('response', ...)` is passive and doesn't alter routing. Prefer this. |
| 3 | Is it safe to call `page.accessibility.snapshot()` in `{ auto: true }` fixture teardown after a `timedOut` test? | The page process may have been killed. Wrap in try/catch and set a 2s timeout via `Promise.race`. |
| 4 | For Cypress, should `cy.intercept('**', ...)` in `beforeEach` impact performance for suites with hundreds of tests? | Yes — it adds a request listener for every test. Offer an opt-out: `captureNetworkErrors: false` in plugin options. |
| 5 | `agnox-pytest-plugin` needs to support Playwright-Python. Is `page.url` (sync property) reliable post-failure? | Yes for sync Playwright; no for async. The async Playwright-Python variant needs `await page.url()`. The plugin should check for `asyncio` context. |
| 6 | Should `runtimeContext` be indexed in MongoDB for future querying (e.g., "show all tests that failed on /checkout")? | Yes — add a sparse index on `executions.tests.runtimeContext.failureUrl` in Migration 015. |

---

*This document describes the target architecture. No implementation has been written. Approval from the Principal Architect is required before proceeding to Phase 8.0.*
