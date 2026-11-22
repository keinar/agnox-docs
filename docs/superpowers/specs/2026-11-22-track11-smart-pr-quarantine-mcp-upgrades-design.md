# Track 11: Quarantine Governance, Main-Anchored Stability, Smart PR Confidence & Surgical MCP Context

Status: Approved. Branch: `feat/track11-smart-pr-quarantine-mcp-upgrades`.

## 1. Quarantine governance (TTL / owner / auto-heal)

**`packages/shared-types/index.ts` — `ITestCase`** gains:
- `quarantineExpiresAt?: Date`
- `quarantineOwner?: string`
- `quarantineReason?: string`
- `quarantineTicketUrl?: string`
- `consecutivePassesSinceQuarantine?: number` — persisted, derived (not `$inc`'d) each metrics pass from `collapseRunOutcomes` filtered to `startTime > quarantinedAt`, counting the newest consecutive **passed** outcomes. Reset to `0` at every write that flips `isQuarantined` (manual on/off, auto on/off, auto-heal release) — in `setQuarantine` (both branches), `smart-analytics.service.ts`'s auto-quarantine/release branches, and the new auto-heal branch.

**`IProjectRunSettings`** gains:
- `defaultQuarantineTtlDays?: 7 | 14 | 30` (default `7`)
- `autoUnquarantineOnStabilize?: boolean` (default `false`)
- `alwaysRunPatterns?: string[]` (Smart PR safety net, §3)

Both added to `projectSettings.ts`'s `DEFAULT` object, GET/PATCH validation and response. `alwaysRunPatterns` validated as an array of non-empty strings, capped at 20 entries / 200 chars each (system boundary).

**`quarantine-service.ts`**:
- `ISetQuarantineInput` gains optional `expiresInDays?: 7|14|30`, `owner?: string`, `reason?: string`, `ticketUrl?: string`.
- A real quarantine transition (`quarantined: true` on a currently-unquarantined case) sets `quarantinedAt: now`, `quarantineExpiresAt: now + (expiresInDays ?? project.defaultQuarantineTtlDays ?? 7)d`, `quarantineOwner: owner ?? userName`, `quarantineReason`, `quarantineTicketUrl`, `consecutivePassesSinceQuarantine: 0`.
- A release (`quarantined: false`) clears the governance fields and resets the streak, as today plus `consecutivePassesSinceQuarantine: 0`.
- **New**: `updateQuarantineGovernance(db, input)` — governance-only update (extend TTL, change owner/reason/ticket, or one-click restore) that does **not** touch `isQuarantined`/`quarantinedAt`/the pass streak unless the caller is explicitly releasing. Calling "set TTL" on an already-quarantined case must not reset its `quarantinedAt` anchor or its streak — that's the bug the original design would have hit.
- New route(s) under `apps/producer-service/src/routes/test-cases.ts` (or a small addition to the existing quarantine route file): `PATCH /api/test-cases/:id/quarantine-governance` for TTL/owner/reason/ticket, reusing `setQuarantine`'s release path for one-click restore.

**Auto-quarantine (`smart-analytics.service.ts`)**: on quarantine, sets the TTL/owner the same way (`quarantineOwner: 'auto-quarantine'`, `quarantineExpiresAt` from project default).

**Auto-heal**: in `updateTestCaseMetrics`, after computing the streak for an already-(non-manually)-quarantined case, if `consecutivePassesSinceQuarantine >= 5` and `autoUnquarantineOnStabilize` is on, release it (same as a manual release, `quarantineSource` stays recorded as released-by-auto-heal in the history diff) and write a `test_case_history` entry tagged via the diff. **This replaces today's "release on first pass" behavior** for auto-quarantined cases — a test now needs 5 *consecutive* clean runs, and only self-releases when the project opted in. With the flag off, `readyToUnquarantine` still surfaces (for the one-click UI action) but nothing releases automatically. This is a deliberate behavior change from today's single-pass auto-release; existing tests in `suite-z-smart-quarantine.test.ts` asserting single-pass release are updated to reflect the new threshold+flag gating.

**Derived response fields** (computed at read time in `GET /api/test-cases/stability` and wherever a quarantined case is serialized — not stored):
- `isExpired = quarantineExpiresAt < now`
- `daysRemaining = ceil((quarantineExpiresAt - now) / 1 day)` (negative when expired)
- `readyToUnquarantine = isQuarantined && consecutivePassesSinceQuarantine >= 5`

**Migration 038** (`migrations/038-quarantine-governance-fields.ts`, modeled on 037): backfills already-quarantined test cases with `quarantineExpiresAt = now + 7d` (grace period — avoids flooding every existing quarantine with an "overdue" badge the moment this ships) and `quarantineOwner = quarantineSource === 'auto' ? 'auto-quarantine' : 'unassigned'`. `consecutivePassesSinceQuarantine` defaults to `0` for all quarantined cases (recomputed correctly on the next metrics pass). `IProjectRunSettings` documents get `defaultQuarantineTtlDays: 7`, `autoUnquarantineOnStabilize: false` only where the key is absent.

**Dashboard** (`test-health-panel.tsx` + `QuarantineToggle.tsx`): owner badge, TTL badge (amber `{n}d left` / red `Expired · {n}d overdue`), green `Ready to Restore (5/5 passed)` badge, and an action menu (extend 7/14/30, set owner/ticket, one-click restore) calling the new governance endpoint. All new elements get `data-testid`.

## 2. Main-anchored auto-quarantine

`IRunOutcome` gains `isBaseline: boolean`, computed in `collapseRunOutcomes` from each execution's `trigger` and `ciContext?.branch` (both added to the function's input type and to the Mongo projection in `updateTestCaseMetrics`): baseline = `trigger === 'cron' || ciContext?.branch === 'main' || ciContext?.branch === 'master'`. Non-PR hosted/manual runs with no `ciContext.branch` are **not** assumed baseline (only `cron` makes them one) — most manual/ad-hoc runs are therefore non-baseline, which is correct: only scheduled/nightly or an explicit main/master run anchors the baseline.

`decideQuarantine` (pure function, same file) gains a new check before counting the failure streak: if **zero** baseline outcomes exist in the window, skip auto-quarantine unless failures span **≥2 distinct branches** (tracked via a `branch` field per outcome) — a single feature branch failing with no baseline signal and no other branch corroborating it is treated as a probable PR regression, not a candidate for quarantine. If baseline outcomes exist and are clean (no baseline failures in the window) while the *only* failures are on one feature branch, set `branchRegressionSuspected: true` on the test case (`$set`, no auto-quarantine). The flag is cleared (`branchRegressionSuspected: false` or unset) once the test passes cleanly on the branch that was failing, or once a baseline failure corroborates it (promoting it to a real auto-quarantine candidate). Auto-quarantine fires normally when baseline history itself shows the failures, or when ≥2 distinct branches are failing.

`ITestCase` gains `branchRegressionSuspected?: boolean`.

## 3. Smart PR: blast-radius + safety net + catch-rate KPI

**Blast radius** (`pr-routing.service.ts` / `pr-routing.ts`): a new `HIGH_IMPACT_PATTERNS` constant (`playwright.config.*`, `**/fixtures/**`, `**/global-setup*`, `package.json`, auth helper glob) checked against `changedFiles` before AI routing. If any match, the routing decision carries `blastRadiusMode: 'high'` (else `'normal'`), stored in `documentFields`. When high: the final `targetPaths` is the union of the AI-selected paths, the project's `alwaysRunPatterns` (if configured), **and** — concretely, not just "recommended" — if no `alwaysRunPatterns` are configured for the project, fall back to `runAll` (full suite) rather than leaving the gap unhandled. `alwaysRunPatterns` (when configured) is unioned into `targetPaths` on **every** Smart PR run, high blast radius or not — it's the standing safety net.

**Catch-rate KPI**: computed on read (no new collection), in a small new helper (e.g. `smart-pr-confidence.ts` beside `routing-history.ts`) called from the stability/test-health endpoint:
1. Find the latest baseline execution for the project (`trigger === 'cron'` or `ciContext.branch` in `{main, master}`), projection `{startTime, tests.file, tests.status}`, sort `startTime: -1`, `limit(1)`.
2. Find the latest *selective* Smart PR execution preceding it (`isSmartPR: true`, `routingReason !== 'ai_selected_all'`, `startTime < nightly.startTime`), projection `{routingTargets, startTime}`, sort `startTime: -1`, `limit(1)`. (`ai_selected_all` ran everything — it's full coverage, not a selective sample, so it's skipped when looking for the preceding selective run.)
3. If either query returns nothing → `{ prCatchRatePercent: null, escapedFailuresCount: null }` (no misleading 100% badge).
4. Else, `nightlyFailures` = nightly's failed test files; `escapedFailuresCount` = count of those files that don't `fileMatchesTestPath` against any of the selective run's `routingTargets`. If `nightlyFailures.length === 0`: `{ prCatchRatePercent: 100, escapedFailuresCount: 0 }`. Else `prCatchRatePercent = round(100 - escapedFailuresCount / nightlyFailures.length * 100)`.

Both queries scoped by `organizationId` + `projectId`, narrow projection, `limit(1)` — kept off the hot path cost-wise.

Surfaced as a small KPI badge in the Stability page next to the Quarantined Tests card.

## 4. MCP `get_failing_test_context`

New producer endpoint `GET /api/v1/quality/failing-test-context` (same router/auth as the existing v1 `/executions/:taskId/failures`), query: `projectId` (required, like other v1 endpoints), `executionId?` (defaults to the project's latest `FAILED`/`UNSTABLE` execution), and `testId?`/`testTitle?` (at least one required). Returns one compact object:
- `error`, `stackSnippet` (truncated, same limits convention as existing failure context)
- `recordedSteps: string[]`, `lastStepTitle: string | null`, `lastStepIndex: number | null` — **best-effort only**: Playwright step data persisted today (`ITestResult.steps: string[]`) is titles-in-order with no per-step pass/fail status, so this is "last step that ran before the test ended," not a verified failing step. The tool description says so explicitly; no reporter changes are in scope.
- `file`, `line` (when available from runtime context)
- `traceUrl`/artifact URLs for that one test
- `stabilityContext: { stabilityScore, mainPassRate, currentBranchPassRate, branchRegressionSuspected, isKnownFlake }` (`isKnownFlake` = `quarantineSource === 'auto'` or grade D/F with retries)

New `AgnoxClient.getFailingTestContext(...)` method in `packages/mcp-server/src/client.ts`, and a new tool appended to `TOOLS` in `mcp/tools.ts`, matching the existing style exactly (`ITool` shape, `UNTRUSTED_NOTE`, `text(summary, data)`, `projectOf` helper). Covered in `mcp-untrusted-output.test.ts` alongside the existing tools.

## 5. Tests / verification

- Producer: extend `suite-z-smart-quarantine.test.ts` (streak computation, auto-heal gating, branch-anchoring, `branchRegressionSuspected`), `suite-z2-quarantine-routes.test.ts` (governance fields, TTL extend without resetting streak/anchor), new coverage for the catch-rate helper and blast-radius routing in the PR-routing suites, migration 038 DB-pass test (pattern from 037).
- Dashboard: component tests for the new badges/action menu (TTL states, ready-to-restore, catch-rate KPI).
- MCP server: new tool's schema/dispatch in `mcp.test.ts`, untrusted-output wrapping in `mcp-untrusted-output.test.ts`, client method in `client.test.ts`.
- Full producer suite (not just new tests — item 1 changes existing auto-release behavior), typecheck and lint across all workspaces via root `package.json` scripts, before merge.

## 6. Out of scope

- Reporter changes to persist per-step pass/fail status (MCP tool is explicitly best-effort on this).
- A dedicated catch-rate history collection — this is a point-in-time KPI, not a trend.
- Non-hardcoded/configurable `HIGH_IMPACT_PATTERNS` (v1 ships hardcoded, per explicit approval).
