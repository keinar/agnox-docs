# Track 3 Batch A — Super-Admin Console, View-As and Public Status: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give platform operators an allowlisted, hidden `/super-admin` console (org overview, plan override, delete empty org, platform health), a strict read-only "View As Org" mode, and a public status page that reports real health without a secret in the browser.

**Architecture:** Super-admin is an env allowlist (`PLATFORM_SUPER_ADMIN_EMAILS`) checked against the authenticated login session; all `/api/super-admin/*` routes answer non-super-admins exactly like a route that does not exist. View-As is a request header (`X-View-As-Org`) applied inside the two auth middlewares, which swaps `request.user.organizationId` to the target org with role `viewer` for read methods and rejects every other method. One shared infrastructure-health service feeds `/health`, the secret-protected monitor endpoint, the new public `/api/status` and the super-admin health card.

**Tech Stack:** Fastify 5 + MongoDB driver 7 + ioredis + amqplib + zod 4 (producer-service); React 19 + Vite + Tailwind + @tanstack/react-query + axios (dashboard-client); vitest + supertest + mongodb-memory-server (backend tests); Playwright with `MockApi` (UI tests).

**Spec:** This file is the spec. It was written from a read-only inspection of `main` at `5f734b3` on 2026-11-12. Branch to create: `feat/track3a-super-admin-and-status` (from `main`).

---

## Global Constraints

- **Do not run anything against the root `.env`: it holds production values.** Backend suites use `mongodb-memory-server` and set their own env in `beforeAll`; UI specs use `MockApi` and abort every non-local host. Never run a migration or `npm start -w producer-service` locally without overriding `PLATFORM_MONGO_URI`, and unset the Agnox reporter variables before running any Playwright config.
- Styling is Tailwind only: no CSS files, no inline `style`.
- File names are `kebab-case.ts` (React components keep the repo's existing `PascalCase.tsx`). Interfaces are `IName`. Constants are `UPPER_SNAKE_CASE`.
- Every new endpoint returns `{ success: boolean; data?: T; error?: string }`. Error bodies may add `code` and `message`.
- producer-service logs with `app.log` / `request.log`. No `console.log` anywhere.
- Every async handler has a typed `try/catch` (`catch (error: unknown)`).
- Tenant isolation: every query carries an organization filter. **The only sanctioned exception is cross-org reads/writes inside `services/super-admin-overview.ts`, `services/org-deletion.ts` and `routes/super-admin.ts`**, each behind `requireSuperAdmin`. Put a comment on each such query.
- Never return, log or audit a secret: no `aiConfig.byok` values, webhook URLs, tokens or `hashedPassword` leave the server.
- Schema or index changes ship with a migration file (`migrations/032-…`).
- Commit after each task. Conventional commit subjects, as in `git log` (`feat(scope): …`, `test(scope): …`).
- Playwright work must follow `.claude/skills/selectors.md`, `page-objects.md` and `test-strategy.md` (read them before Task 11).

## Locked Decisions (owner, 2026-11-12) — these override anything below that disagrees

1. **Allowlist (D2):** as written. Signup is blocked for emails in `PLATFORM_SUPER_ADMIN_EMAILS`; the account must already exist.
2. **Plan override on a paying org (D7):** as written. 409 `STRIPE_SUBSCRIPTION_ACTIVE` while a Stripe subscription is live.
3. **Deleting orgs (replaces D8):** non-empty test orgs can be deleted. Body is `{ confirmOrgName: string; force?: boolean }`.
   - Hard blockers, never overridable, 409 `ORG_NOT_DELETABLE`: `OWN_ORG`, `STRIPE_SUBSCRIPTION_ACTIVE`.
   - Soft blockers `HAS_EXECUTIONS`, `HAS_TEST_CASES`, `HAS_MEMBERS`: without `force: true` the answer is 409 `FORCE_REQUIRED` with the list; with `force: true` the org and all its records are removed.
   - `confirmOrgName` must equal the org name exactly (400 `CONFIRMATION_MISMATCH`).
   - Row fields: `deletable` = no hard blocker; `requiresForce` = at least one soft blocker. The dialog shows a "also delete its N runs / test cases / members" checkbox that sets `force`.
4. **View-As role (replaces the `viewer` choice in D4/D10):** the effective role is `admin`, so Settings, Integrations, AI Models and Billing stay inspectable. `request.viewAs` carries `readOnly: true`; the dashboard's auth context exposes `isImpersonating` and `readOnly`. Every non-read method is still rejected with 403 `READ_ONLY_IMPERSONATION`, and the banner states Read-Only. Mutating controls stay visible; using one shows the read-only notice.
5. **Sockets (D10):** as written. No socket connection while viewing.

## Repo Facts This Plan Relies On

| Fact | Where |
|---|---|
| Global auth is a `preHandler` hook: `authMiddleware` → `enforceAccessPolicy` → `apiRateLimit` | `apps/producer-service/src/config/middleware.ts:71-133` |
| Public-path lists exist in **two** places and both must be edited | `config/middleware.ts:91-98` (`publicPrefixes`), `middleware/auth.ts:15-34` (`PUBLIC_PATHS`) |
| About 30 routes also list `authMiddleware` in their own `preHandler`, which **reassigns `request.user`** after the global hook | e.g. `routes/organization.ts:116-118`, `routes/auth.ts:462` |
| `request.user` is `IUserContext { userId, email, organizationId, role, isApiKey? }`; `email` comes from the signed JWT; no endpoint changes a user's email | `middleware/auth.ts:47-54`, `utils/auth-state.ts:172-178` |
| Role policy: routes declare `config: { roles: ROLES.X }`; undeclared mutating routes reject viewers with 403 | `middleware/access-policy.ts` |
| Rate limiter keys on `request.user.organizationId` | `middleware/rateLimiter.ts:98-101` |
| There is **no email verification**; plain signup accepts any unregistered email. `users.email` has a unique index | `routes/auth.ts:123-283`, `migrations/001…:148` |
| `organizationId` is an **ObjectId** in `users`, a **string** in `projects`, `schedules`, `test_cases`; `executions` may hold either | `routes/organization.ts:678-721`, `utils/subscription.ts:110-129`, `routes/projects.ts:68` |
| Execution statuses are `PENDING \| RUNNING \| PASSED \| FAILED \| ERROR \| UNSTABLE`. **There is no `QUEUED`**; a queued run is `PENDING` | `packages/shared-types/index.ts:568` |
| Demo runs carry `isDemo: true` and are excluded from usage counts | `routes/organization.ts:687` |
| Plan catalog and canonical limits | `config/plans.ts` (`PLANS`: `free, starter, team, business, enterprise`) |
| Stripe webhooks rewrite `plan` + `limits` on every subscription event | `utils/subscription.ts:15-80` |
| BYOK view model (`hasConfiguredKey`, `provider`) without key values | `ai/ai-config-view.ts:39` (`buildAiConfigView`) |
| Integrations: `org.integrations.{jira,linear,monday,github}.enabled`; Slack and Teams are top-level `org.slackWebhookUrl` / `org.msTeamsWebhookUrl` | `routes/organization.ts:170-188`, `routes/integrations.ts:1146-1205` |
| Audit trail in use: collection `audit_logs`, documents `{ organizationId: string, userId: string, action: 'dotted.name', targetType, targetId, details, ip, timestamp }` | local `logAuditEvent` in `routes/organization.ts:66-85`, `routes/users.ts:45-63`. (`utils/auditLog.ts` defines a second shape that no file under `apps/` imports. Do not use it.) |
| Health: `GET /health` is public and pings Mongo, Redis, RabbitMQ; 503 when degraded. **`/api/health` does not exist** | `config/routes.ts:147-190` |
| `rabbitMqService.checkConnection()` and `.getQueueStats(): { messageCount, consumerCount }` | `rabbitmq.ts:212-251` |
| Backend tests are collected **only** from `src/routes/__tests__/**/*.test.ts` | `apps/producer-service/vitest.config.ts:7` |
| Backend suite template (memory Mongo, Redis mock, `createServer` + `setupRoutes` + `setupGlobalAuth`) | `routes/__tests__/suite-k-access-revocation.test.ts:1-138` |
| Dashboard has **no shared HTTP client**: per-call `axios` with an `Authorization` header, plus 16 raw `fetch(` calls in 11 files. No `axios.create` | see Task 8 |
| `AuthContext` loads the user from `GET /api/auth/me` on every token change; a failed call wipes the token | `apps/dashboard-client/src/context/AuthContext.tsx:52-84` |
| react-query keys are not org-scoped; the active project id lives in `localStorage['agnox:activeProjectId']` and self-corrects when it is not in the fetched list | `hooks/useOrganizationFeatures.ts:76`, `context/ProjectContext.tsx:66-71` |
| Socket.IO joins room `org:<JWT org>` at handshake | `config/server.ts:226-256`, `context/SocketContext.tsx` |
| UI primitives from Track 2: `PageHeader`, `Skeleton`, `SkeletonRows`, `EmptyState`, `Pill`, `StatusBadge` | `components/ui/primitives.tsx` |
| Toast / confirm: `useToast()`, `useConfirm()` | `context/feedback-context.ts` |
| Window custom events are an existing pattern (`agnox:open-onboarding`) | `components/Sidebar.tsx:245` |
| `MockApi` serves `/api/auth/me` from `currentUser()`; it records `method, path, query, body` but **not headers** | `tests/mocks/MockApi.ts:20-25, 148-156` |

## Design Decisions (fixed; do not re-decide)

**D1 — Who is a super-admin.** `isSuperAdmin(user)` is true only when `user.isApiKey !== true` and `user.email.toLowerCase()` is in `PLATFORM_SUPER_ADMIN_EMAILS` (comma-separated; entries trimmed and lowercased; empty entries dropped; unset or empty means nobody). The variable is read on every call, not at module load, so tests can change it.

**D2 — "Verified" email.** The repo cannot verify mailbox ownership, so an allowlisted address that has no account yet could be claimed by anyone through signup. Mitigation: `POST /api/auth/signup` (both flows) answers an allowlisted email with the existing `SIGNUP_EMAIL_UNAVAILABLE` 409. Operating rule: the operator's account must already exist before its email is added to the variable. Real email verification is out of scope.

**D3 — Hidden routes.** `requireSuperAdmin` calls `reply.callNotFound()` for everyone else, so the body is Fastify's own 404. Every super-admin route declares `config: { roles: ROLES.ANY }`; without it `enforceAccessPolicy` would answer a viewer's `PATCH`/`DELETE` with 403 and reveal the route. Routes do **not** list `authMiddleware` themselves (the global hook already ran). The contract (SA-103): any authenticated non-super-admin gets 404 on every method, with the same body as an unregistered path; an unauthenticated caller gets the 401 that every protected `/api` path returns. Whether the global `preHandler` hook also runs for unregistered paths was not verified in this inspection, which is why body parity is asserted only for an admin `GET`.

**D4 — View-As semantics.** Implemented in `applyViewAs`, called as the last step of `authMiddleware` and of the JWT branch of `createApiKeyAuthMiddleware`, so route-level re-authentication cannot undo it.

| Condition | Result |
|---|---|
| No `x-view-as-org` header | no-op |
| Header present, caller is not a super-admin (or is an API key) | no-op: the header is ignored and the caller sees their own org |
| Path (without query) starts with `/api/auth/` or `/api/super-admin/` | no-op: real identity (keeps `/api/auth/me`, logout, the console and "exit" working) |
| Header is not a 24-hex id, or no such organization | `404 { success: false, error: 'Organization not found' }` |
| Method is not `GET`, `HEAD` or `OPTIONS` | `403 { success: false, error: 'Read-only impersonation', message: 'Changes are disabled while viewing another organization.', code: 'READ_ONLY_IMPERSONATION' }` |
| Otherwise | `request.viewAs = { organizationId: target, realOrganizationId }`; `request.user = { ...user, organizationId: target, role: 'viewer' }` |

Effective role is `viewer` on purpose: the API and the dashboard already have a complete read-only mode for viewers. Admin-only GETs answer 403 while viewing. The rate limiter keys on `request.viewAs?.realOrganizationId ?? request.user.organizationId`, so viewing never spends the customer's quota.

**D5 — View-As audit.** Four actions, all filed under the **target** org: `super_admin.view_as_started` and `super_admin.view_as_ended` (explicit endpoints the dashboard calls), `super_admin.view_as_read` written by `applyViewAs` at most once per 15 minutes per (super-admin, target org) using Redis `SET viewas:audit:<userId>:<orgId> 1 EX 900 NX` (if Redis fails, write the entry), and `super_admin.view_as_blocked` for every rejected mutation (`details: { method, path }`, path through `redactUrl`).

**D6 — Audit document.** New helper writes the in-use shape plus actor fields, and is awaited:

```ts
{ organizationId: string /* target org */, userId: string, action: SuperAdminAuditAction,
  targetType: 'organization', targetId: string, details: Record<string, unknown>, ip: string,
  actorEmail: string, actorOrganizationId: string, timestamp: Date }
```

**D7 — Plan override.** Writes `plan`, each canonical limit with dot notation (`limits.maxTestRuns` … `limits.aiMonthlyUsdCap`, so `limits.currentStorageUsedBytes` survives), `planOverride` and `updatedAt`. It never touches `billing.*`. An org with a live Stripe subscription (`billing.stripeSubscriptionId` truthy and `billing.status` in `active | trialing | past_due`) is refused with 409 `STRIPE_SUBSCRIPTION_ACTIVE`, because the next Stripe event would overwrite the override. Same plan as current: 200 with `changed: false`, nothing written, no audit.

**D8 — "Empty" org and delete guard.** An org is deletable only when all hold: zero non-demo executions; at most one member; zero test cases; no live Stripe subscription; it is not the caller's own org. The request must carry `confirmName` equal to the org's exact name. `audit_logs` and `webhook_logs` are kept.

**D9 — Activity and counts.** `active` means `lastExecutionAt` is within `ACTIVE_WINDOW_DAYS = 30`; otherwise `dormant`. All execution metrics exclude `isDemo: true` and use `startTime`. Owner = earliest-created user with role `admin`, falling back to the earliest-created user. "Queued" = executions with status `PENDING`; the card also shows RabbitMQ queue depth and consumer count.

**D10 — Dashboard View-As mechanics.** State is `sessionStorage['agnox:viewAs'] = { organizationId, organizationName }` (per tab). Entering and exiting use a hard navigation (`window.location.assign`) so react-query, `ProjectContext` and every component remount clean. While viewing, no Socket.IO connection is opened (the room is tied to the JWT org, and own-org events must not appear in the viewed org's lists). `AuthContext` exposes the viewed org and role `viewer` through `user`, which turns on the existing viewer UI.

**D11 — Header injection.** One axios request interceptor on the default instance plus a new `apiFetch` wrapper that replaces all 16 raw `fetch` calls; an ESLint rule bans bare `fetch` afterwards. The header is sent on every API call; the server decides where it applies. `@fastify/cors` is registered without `allowedHeaders`, so it reflects the requested headers and needs no change.

## Status Page Audit (item 4): findings

1. **`/api/health` does not exist.** The live health route is `GET /health` (`config/routes.ts:147`), public, no tenant data. It also returns `version` and `uptime`.
2. **The monitoring secret is published.** `deploy.yml:166` runs `sed` to write `secrets.MONITORING_SECRET_KEY` into `status-dashboard.html`, and `docker-compose.prod.yml:134-141` serves that file with nginx. Anyone who opens the page source can read the secret and call `GET /api/system/monitor-status`. The key must be rotated after the fix ships (operator action).
3. **How `status.agnox.dev` reaches the `status-page` container is not in the repo** (nginx-proxy-manager is configured on the host). Nothing in this plan changes that routing.
4. **`monitor-status` never reports trouble.** A RabbitMQ failure is swallowed and reported as `queueDepth: 0, activeWorkers: 0` with `status: 'ok'` and HTTP 200 (`routes/monitor-status.ts:50-59, 72-80`). Redis is not checked at all.
5. **The page's banner depends on MongoDB only** (`status-dashboard.html:215`). Zero workers, Redis down or RabbitMQ down still show "All Systems Operational". The version badge is hard-coded `v3.5.0` (line 46) and the footer calls a public page "Internal Ops Dashboard".
6. **Docs describe a different response.** `docs/architecture/deployment.md:715-721` documents `{ success, data: { status: 'healthy', version } }` and a `"healthy"` keyword check; the endpoint returns `{ status: 'ok', timestamp, data: { queueDepth, activeWorkers, dbConnected } }`, which also breaks the response-envelope rule.
7. **No worker health signal exists** beyond RabbitMQ `consumerCount`. Workers only touch `executions.updatedAt` while running a job (`worker-service/src/worker.ts:790-797`).
8. **`/health` is unauthenticated and uncached**; every call opens a RabbitMQ channel (`rabbitmq.ts:228-251`).

Fixes are Task 7.

## File Structure

**producer-service — create**
- `src/middleware/super-admin.ts`: allowlist parsing, `isSuperAdmin`, `requireSuperAdmin`.
- `src/middleware/view-as.ts`: `applyViewAs`.
- `src/utils/super-admin-audit.ts`: `logSuperAdminAudit`.
- `src/services/platform-health.ts`: infrastructure checks with a short cache.
- `src/services/super-admin-overview.ts`: cross-org overview query and row types.
- `src/services/org-deletion.ts`: delete guard and cascade.
- `src/routes/super-admin.ts`: all `/api/super-admin/*` routes.
- `src/routes/public-status.ts`: `GET /api/status`.
- `src/routes/__tests__/suite-sa-super-admin.test.ts`, `src/routes/__tests__/suite-sb-platform-status.test.ts`.

**producer-service — modify**
- `src/middleware/auth.ts` (call `applyViewAs`; add `/api/status` to `PUBLIC_PATHS`), `src/config/middleware.ts` (`publicPrefixes`), `src/middleware/rateLimiter.ts:98-101`, `src/types/fastify.d.ts`, `src/routes/auth.ts` (signup guard, `/me`), `src/config/routes.ts` (register routes; `/health` uses the service), `src/routes/monitor-status.ts`.

**dashboard-client — create**
- `src/utils/view-as.ts`, `src/utils/api-fetch.ts`, `src/types/super-admin.ts`, `src/hooks/use-super-admin.ts`, `src/pages/SuperAdminPage.tsx`, `src/components/super-admin/OrganizationsTable.tsx`, `PlatformHealthCard.tsx`, `ChangePlanDialog.tsx`, `DeleteOrgDialog.tsx`, `src/components/ViewAsBanner.tsx`.

**dashboard-client — modify**
- `src/main.tsx`, `src/context/AuthContext.tsx`, `src/context/SocketContext.tsx`, `src/App.tsx`, `src/components/Sidebar.tsx`, `src/components/AppLayout.tsx`, `eslint.config.js`, and the 11 files with raw `fetch` (Task 8).

**Other**
- `migrations/032-super-admin-audit-index.ts`; `status-dashboard.html`; `.github/workflows/deploy.yml`; `docker-compose.yml`; `docker-compose.prod.yml`; `.env.example`; `k8s/secrets/README.md`; `tests/mocks/MockApi.ts`; `tests/locators/SanityLocators.ts`; `tests/actions/SanityActions.ts`; `tests/fixtures/sanityTest.ts`; `tests/specs/ui-mock/sanity/s-super-admin.spec.ts`; docs listed in Task 12.

## Review Focus

Each line is pinned by the named test.

1. A non-super-admin, or an API key of a super-admin, sends `X-View-As-Org`: the header is ignored and they get their own org's data, never another org's (SA-603, SA-604).
2. A route that re-runs `authMiddleware` itself (`GET /api/organization`) still returns the **viewed** org (SA-602).
3. An org whose documents store `organizationId` as ObjectId in one collection and string in another is counted once, with correct totals (SA-302).
4. RabbitMQ or Redis is down: the health card and `/api/status` say so instead of showing zeros and "ok" (SA-202, SB-102, SB-103).
5. Allowlist formatting: spaces, upper case, trailing comma, unset variable. Unset means nobody is a super-admin (SA-101).

---

## Backend test harness (used by Tasks 1–7)

`suite-sa-super-admin.test.ts` copies the setup of `suite-k-access-revocation.test.ts:16-138` with these differences:

- RabbitMQ mock must expose `connect`, `sendToQueue`, `checkConnection: vi.fn().mockResolvedValue(undefined)` and `getQueueStats: vi.fn().mockResolvedValue({ messageCount: 3, consumerCount: 2 })`.
- Redis mock adds `set: async (key, value, ...args)` honouring `NX` (return `null` when the key exists) so the audit dedupe is exercised.
- `signSession(userId, orgId, role, email)` takes the email explicitly.
- Seed organizations (ids are `ObjectId` constants named `<x>OrgId`; tokens `<x>Token`):
  - `opsOrg` "Agnox Ops": admin `ops@agnox.test` (`opsUserId`, `opsToken`), the super-admin.
  - `acmeOrg` "Acme", `plan: 'free'`: admin `admin@acme.test` (`acmeAdminToken`), viewer `viewer@acme.test` (`acmeViewerToken`), projects "Acme Web" (`acmeProjectId`) and "Acme Mobile" stored with a string `organizationId`.
  - `emptyOrg` "Empty Org": one admin (`emptyAdminToken`) and nothing else.
  - `mixedOrg` "Mixed": one admin; used only by SA-302.
  - `paidOrg` "Paid": one admin; used only by SA-403.
- `beforeEach`: `process.env.PLATFORM_SUPER_ADMIN_EMAILS = 'ops@agnox.test'`; reset the RabbitMQ and Redis mocks to their healthy values; clear `redisMock.store`; **`deleteMany({})` on `executions` and `audit_logs`**. The tests below assert absolute counts, so each test seeds the executions it needs and starts with an empty audit trail. Other seed data (orgs, users, projects) is created once in `beforeAll`; a test that changes it (SA-401 sets Acme to `business`; SA-503 deletes `emptyOrg`) is noted where a later test depends on it.
- An API key is a JWT (`signApiKeyToken` in `utils/jwt.ts`, stored through `createApiKey` in `utils/apiKeys.ts:140`) and authenticates on ordinary routes as `Authorization: Bearer <key>`; the `x-api-key` header only works on routes that use `createApiKeyAuthMiddleware`.
- Helper `auditFor(orgId, action)` reads `audit_logs`.

Run one suite: `npm run test -w producer-service -- suite-sa`. Run all: `npm run test -w producer-service`. Type-check: `npm run typecheck -w producer-service`.

---

### Task 1: Allowlist, `requireSuperAdmin`, `isSuperAdmin` on `/api/auth/me`

**Files:**
- Create: `apps/producer-service/src/middleware/super-admin.ts`
- Create: `apps/producer-service/src/routes/super-admin.ts`
- Modify: `apps/producer-service/src/routes/auth.ts` (signup after line 149; `/me` response at 489-509)
- Modify: `apps/producer-service/src/config/routes.ts` (register after `monitorStatusRoutes`)
- Modify: `.env.example`, `docker-compose.yml`, `docker-compose.prod.yml` (producer `environment`), `.github/workflows/deploy.yml` (`.env` heredoc), `k8s/secrets/README.md`
- Test: `apps/producer-service/src/routes/__tests__/suite-sa-super-admin.test.ts`

**Interfaces:**
- Produces:
  - `getSuperAdminEmails(): ReadonlySet<string>`
  - `isSuperAdmin(user: Pick<IUserContext, 'email' | 'isApiKey'> | undefined): boolean`
  - `requireSuperAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void>`
  - `superAdminRoutes(app: FastifyInstance, dbClient: MongoClient, redis: Redis): Promise<void>`
  - `GET /api/super-admin/session` → `{ success: true, data: { email: string } }` (the smallest real route; the console uses it as its access probe)
  - `GET /api/auth/me` gains `data.isSuperAdmin: boolean`

- [ ] **Step 1: Write the failing tests**

```ts
it('SA-101: allowlist parsing ignores case, spaces and empty entries; unset means nobody', async () => {
    const { isSuperAdmin } = await import('../../middleware/super-admin');
    process.env.PLATFORM_SUPER_ADMIN_EMAILS = ' Ops@Agnox.test , ,second@agnox.test,';
    expect(isSuperAdmin({ email: 'ops@agnox.test' })).toBe(true);
    expect(isSuperAdmin({ email: 'SECOND@agnox.test' })).toBe(true);
    expect(isSuperAdmin({ email: 'admin@acme.test' })).toBe(false);
    expect(isSuperAdmin({ email: 'ops@agnox.test', isApiKey: true })).toBe(false);
    delete process.env.PLATFORM_SUPER_ADMIN_EMAILS;
    expect(isSuperAdmin({ email: 'ops@agnox.test' })).toBe(false);
    expect(isSuperAdmin(undefined)).toBe(false);
});

it('SA-102: a super-admin reaches the console API', async () => {
    const res = await request().get('/api/super-admin/session').set(bearer(opsToken));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { email: 'ops@agnox.test' } });
});

it('SA-103: everyone else gets the same answer as for a route that does not exist', async () => {
    // 404 for every role and method, including methods a viewer would normally get 403 for
    for (const token of [acmeAdminToken, acmeViewerToken]) {
        for (const method of ['get', 'patch', 'delete'] as const) {
            const hidden = await request()[method]('/api/super-admin/session').set(bearer(token));
            expect(hidden.status, method).toBe(404);
        }
    }
    // Same body as an unregistered path (GET as an admin, where no role rule interferes)
    const hidden = await request().get('/api/super-admin/session').set(bearer(acmeAdminToken));
    const missing = await request().get('/api/does-not-exist').set(bearer(acmeAdminToken));
    expect(missing.status).toBe(404);
    expect({ ...hidden.body, message: '' }).toEqual({ ...missing.body, message: '' });
    // Without a token the console answers like any other protected /api path
    expect((await request().get('/api/super-admin/session')).status).toBe(401);
});

it('SA-104: /api/auth/me reports isSuperAdmin', async () => {
    expect((await request().get('/api/auth/me').set(bearer(opsToken))).body.data.isSuperAdmin).toBe(true);
    expect((await request().get('/api/auth/me').set(bearer(acmeAdminToken))).body.data.isSuperAdmin).toBe(false);
});

it('SA-105: an allowlisted email cannot be registered through signup', async () => {
    process.env.PLATFORM_SUPER_ADMIN_EMAILS = 'ops@agnox.test,not-yet-registered@agnox.test';
    const res = await request().post('/api/auth/signup').send({
        email: 'Not-Yet-Registered@agnox.test', password: 'Str0ng!Passw0rd', name: 'X', organizationName: 'X Org',
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Unable to create account');
    expect(await db.collection('users').countDocuments({ email: 'not-yet-registered@agnox.test' })).toBe(0);
});
```

(`message` is blanked in SA-103 because Fastify's 404 message contains the URL.)

- [ ] **Step 2: Run and confirm they fail** — `npm run test -w producer-service -- suite-sa`. Expected: module `middleware/super-admin` not found.

- [ ] **Step 3: Implement `middleware/super-admin.ts`** with the three signatures above. `requireSuperAdmin` calls `reply.callNotFound()` when `isSuperAdmin(request.user)` is false, and logs `request.log.warn({ userId, url: redactUrl(request.url) }, '[super-admin] denied')` only when a user is present. If `callNotFound()` does not produce the same body as an unregistered path, send that body explicitly; do not change how unregistered paths behave.

- [ ] **Step 4: Implement `routes/super-admin.ts`** with `GET /api/super-admin/session`, declared as `{ config: { roles: ROLES.ANY }, preHandler: [requireSuperAdmin] }`. Define `const SUPER_ADMIN_ROUTE = { config: { roles: ROLES.ANY }, preHandler: [requireSuperAdmin] }` and spread it into every later route. Register in `config/routes.ts`: `await superAdminRoutes(app, dbClient, redis);`.

- [ ] **Step 5: Patch `routes/auth.ts`** — in signup, right after the existing duplicate check (line 147-149): `if (getSuperAdminEmails().has(email)) return reply.code(409).send(SIGNUP_EMAIL_UNAVAILABLE);`. In `/me`, add `isSuperAdmin: isSuperAdmin(request.user)` to `data`, next to `lastLoginAt`.

- [ ] **Step 6: Document the variable** — add `PLATFORM_SUPER_ADMIN_EMAILS=` to `.env.example` (platform section, with a comment: comma-separated login emails of platform operators; each account must exist before it is listed; leave empty to disable the console), `- PLATFORM_SUPER_ADMIN_EMAILS=${PLATFORM_SUPER_ADMIN_EMAILS:-}` to both compose files' producer `environment`, `PLATFORM_SUPER_ADMIN_EMAILS=${{ secrets.PLATFORM_SUPER_ADMIN_EMAILS }}` to the heredoc in `deploy.yml`, and a line in `k8s/secrets/README.md`. It is **not** added to `REQUIRED_ENV_VARS`.

- [ ] **Step 7: Run** — suite passes; `npm run typecheck -w producer-service` is clean.

- [ ] **Step 8: Commit** — `feat(super-admin): email allowlist, hidden route guard and isSuperAdmin on /api/auth/me`

---

### Task 2: Platform health service and health card endpoint

**Files:**
- Create: `apps/producer-service/src/services/platform-health.ts`
- Modify: `apps/producer-service/src/routes/super-admin.ts`, `apps/producer-service/src/config/routes.ts:147-190`
- Test: `suite-sa-super-admin.test.ts`

**Interfaces:**
- Produces:

```ts
export type ServiceHealth = 'healthy' | 'unhealthy';
export interface IInfrastructureHealth {
    mongodb: ServiceHealth; redis: ServiceHealth; rabbitmq: ServiceHealth;
    /** null when RabbitMQ could not be queried. */
    queue: { depth: number; consumers: number } | null;
    checkedAt: string; // ISO
}
export function checkInfrastructure(dbClient: MongoClient, redis: Redis, options?: { maxAgeMs?: number }): Promise<IInfrastructureHealth>;
export function resetInfrastructureHealthCache(): void; // tests
```

- `GET /api/super-admin/health` → `{ success: true, data: { executions: { running: number; queued: number }, queue: { depth, consumers } | null, services: { mongodb, redis, rabbitmq }, checkedAt } }`

- [ ] **Step 1: Write the failing tests**

```ts
it('SA-201: health card counts RUNNING and PENDING across all orgs and reports services', async () => {
    await db.collection('executions').insertMany([
        { organizationId: acmeOrgId.toString(), taskId: 'h-1', status: 'RUNNING', startTime: new Date() },
        { organizationId: opsOrgId, taskId: 'h-2', status: 'RUNNING', startTime: new Date() },
        { organizationId: acmeOrgId.toString(), taskId: 'h-3', status: 'PENDING', startTime: new Date() },
        { organizationId: acmeOrgId.toString(), taskId: 'h-4', status: 'PASSED', startTime: new Date() },
    ]);
    const res = await request().get('/api/super-admin/health').set(bearer(opsToken));
    expect(res.status).toBe(200);
    expect(res.body.data.executions).toEqual({ running: 2, queued: 1 });
    expect(res.body.data.queue).toEqual({ depth: 3, consumers: 2 });
    expect(res.body.data.services).toEqual({ mongodb: 'healthy', redis: 'healthy', rabbitmq: 'healthy' });
});

it('SA-202: a RabbitMQ outage is reported, not shown as an empty queue', async () => {
    rabbitMqService.checkConnection.mockRejectedValue(new Error('closed'));
    rabbitMqService.getQueueStats.mockRejectedValue(new Error('closed'));
    const res = await request().get('/api/super-admin/health').set(bearer(opsToken));
    expect(res.body.data.services.rabbitmq).toBe('unhealthy');
    expect(res.body.data.queue).toBeNull();
});
```

Call `resetInfrastructureHealthCache()` in `beforeEach`.

- [ ] **Step 2: Run, confirm failure.**

- [ ] **Step 3: Implement `checkInfrastructure`** — three independent checks (`dbClient.db(getDbName()).command({ ping: 1 })`, `redis.ping()`, `rabbitMqService.checkConnection()` then `getQueueStats()`), none throwing. Module-level cache; default `maxAgeMs` is `5_000`; concurrent callers share one in-flight promise.

- [ ] **Step 4: Rewrite the body of `GET /health`** (`config/routes.ts:147-190`) to use `checkInfrastructure`, keeping its exact response shape and status codes (`checks.database|redis|rabbitmq`, 200/503) so `suite-j` J-301/J-302 still pass. `suite-j` must call `resetInfrastructureHealthCache()` between those two tests if the cache makes J-302 fail.

- [ ] **Step 5: Add `GET /api/super-admin/health`** — two `countDocuments` on `executions` (`{ status: 'RUNNING' }`, `{ status: 'PENDING' }`; cross-org, comment it) plus `checkInfrastructure`.

- [ ] **Step 6: Run** `suite-sa` and `suite-j`. Both pass.

- [ ] **Step 7: Commit** — `feat(super-admin): platform health service and health card endpoint`

---

### Task 3: Organizations overview

**Files:**
- Create: `apps/producer-service/src/services/super-admin-overview.ts`
- Modify: `apps/producer-service/src/routes/super-admin.ts`
- Test: `suite-sa-super-admin.test.ts`

**Interfaces:**
- Produces:

```ts
export type DeleteBlocker = 'OWN_ORG' | 'HAS_EXECUTIONS' | 'HAS_MEMBERS' | 'HAS_TEST_CASES' | 'STRIPE_SUBSCRIPTION_ACTIVE';
export interface ISuperAdminOrgRow {
    id: string; name: string; slug: string; createdAt: string | null; plan: string;
    ownerEmail: string | null;
    memberCount: number; projectCount: number; testCaseCount: number; activeScheduleCount: number;
    activity: { status: 'active' | 'dormant'; lastExecutionAt: string | null;
                executions7d: number; executions30d: number; executionsTotal: number };
    ai: { hasConfiguredKey: boolean; provider: 'gemini' | 'openai' | 'anthropic' };
    integrations: { jira: boolean; linear: boolean; monday: boolean; slack: boolean; teams: boolean; github: boolean };
    billing: { hasLiveStripeSubscription: boolean; status: string | null };
    planOverride: { plan: string; previousPlan: string; reason: string; byEmail: string; at: string } | null;
    deletable: boolean; deleteBlockers: DeleteBlocker[];
}
export const ACTIVE_WINDOW_DAYS = 30;
export function hasLiveStripeSubscription(org: { billing?: { stripeSubscriptionId?: string | null; status?: string | null } }): boolean;
export function loadOrganizationRows(db: Db, callerOrganizationId: string, now?: Date): Promise<ISuperAdminOrgRow[]>;
```

- `GET /api/super-admin/orgs` → `{ success: true, data: { organizations: ISuperAdminOrgRow[]; generatedAt: string } }`, sorted by `createdAt` descending.

- [ ] **Step 1: Write the failing tests**

```ts
it('SA-301: one row per organization with counts, owner, activity and config badges', async () => {
    // seed acme: 2 projects (string orgId), 3 test cases, 2 schedules (1 isActive),
    // executions: 1 two days ago, 1 twenty days ago, 1 ninety days ago, 1 isDemo today;
    // aiConfig via helpers/byok.ts for provider 'openai';
    // integrations.jira.enabled true, integrations.github.enabled true, slackWebhookUrl { iv: 'x' }
    const res = await request().get('/api/super-admin/orgs').set(bearer(opsToken));
    const acme = res.body.data.organizations.find((o: any) => o.id === acmeOrgId.toString());
    expect(acme).toMatchObject({
        name: 'Acme', plan: 'free', ownerEmail: 'admin@acme.test',
        memberCount: 2, projectCount: 2, testCaseCount: 3, activeScheduleCount: 1,
        activity: { status: 'active', executions7d: 1, executions30d: 2, executionsTotal: 3 },
        ai: { hasConfiguredKey: true, provider: 'openai' },
        integrations: { jira: true, linear: false, monday: false, slack: true, teams: false, github: true },
        deletable: false,
    });
    expect(acme.deleteBlockers).toEqual(expect.arrayContaining(['HAS_EXECUTIONS', 'HAS_MEMBERS', 'HAS_TEST_CASES']));
    expect(JSON.stringify(res.body)).not.toMatch(/hashedPassword|byok|"iv"|hooks\.slack/);
});

it('SA-302: ObjectId and string organizationId values are counted as the same org', async () => {
    await db.collection('executions').insertMany([
        { organizationId: mixedOrgId, taskId: 'm-1', status: 'PASSED', startTime: new Date() },
        { organizationId: mixedOrgId.toString(), taskId: 'm-2', status: 'PASSED', startTime: new Date() },
    ]);
    const rows = (await request().get('/api/super-admin/orgs').set(bearer(opsToken))).body.data.organizations;
    expect(rows.filter((o: any) => o.id === mixedOrgId.toString())).toHaveLength(1);
    expect(rows.find((o: any) => o.id === mixedOrgId.toString()).activity.executionsTotal).toBe(2);
});

it('SA-303: an org with no runs is dormant and an untouched one is deletable; the caller org never is', async () => {
    const rows = (await request().get('/api/super-admin/orgs').set(bearer(opsToken))).body.data.organizations;
    const empty = rows.find((o: any) => o.id === emptyOrgId.toString());
    expect(empty.activity).toMatchObject({ status: 'dormant', lastExecutionAt: null, executionsTotal: 0 });
    expect(empty).toMatchObject({ deletable: true, deleteBlockers: [] });
    expect(rows.find((o: any) => o.id === opsOrgId.toString()).deleteBlockers).toContain('OWN_ORG');
});
```

- [ ] **Step 2: Run, confirm failure.**

- [ ] **Step 3: Implement `loadOrganizationRows`.** One `organizations.find` with projection `{ name, slug, plan, createdAt, aiConfig, 'integrations.jira.enabled', 'integrations.linear.enabled', 'integrations.monday.enabled', 'integrations.github.enabled', slackWebhookUrl, msTeamsWebhookUrl, 'billing.stripeSubscriptionId', 'billing.status', planOverride }`, then five aggregations run with `Promise.all`, each grouped by `{ $toString: '$organizationId' }` and merged in JS by org id string (do not use `$lookup`: the id types differ per collection):

| Collection | Pipeline result per org |
|---|---|
| `users` | `memberCount`; owner email per D9 (`$sort: { createdAt: 1 }` before `$group`) |
| `projects` | `projectCount` |
| `test_cases` | `testCaseCount` |
| `schedules` | `activeScheduleCount` (`$match: { isActive: true }`) |
| `executions` | `$match: { isDemo: { $ne: true } }`; `executionsTotal`, `executions7d`, `executions30d` (`$sum` of `$cond` on `startTime`), `lastExecutionAt` (`$max: '$startTime'`) |

`ai` comes from `buildAiConfigView(org.aiConfig)`; `slack`/`teams` are `Boolean(org.slackWebhookUrl)` / `Boolean(org.msTeamsWebhookUrl)`. `deleteBlockers` per D8. Rows are built field by field; never spread an org document into a row.

- [ ] **Step 4: Add the route.** Assumes hundreds of organizations, not tens of thousands: no pagination; sorting and filtering happen in the dashboard.

- [ ] **Step 5: Run, pass. Commit** — `feat(super-admin): organizations overview query`

---

### Task 4: Manual plan override, audit helper, migration 032

**Files:**
- Create: `apps/producer-service/src/utils/super-admin-audit.ts`, `migrations/032-super-admin-audit-index.ts`
- Modify: `apps/producer-service/src/routes/super-admin.ts`
- Test: `suite-sa-super-admin.test.ts`

**Interfaces:**
- Consumes: `hasLiveStripeSubscription` (Task 3), `PLANS` (`config/plans.ts`).
- Produces:

```ts
export type SuperAdminAuditAction =
    | 'super_admin.plan_changed' | 'super_admin.org_deleted'
    | 'super_admin.view_as_started' | 'super_admin.view_as_ended'
    | 'super_admin.view_as_read' | 'super_admin.view_as_blocked';
export function logSuperAdminAudit(db: Db, request: FastifyRequest, entry: {
    action: SuperAdminAuditAction; targetOrganizationId: string; details?: Record<string, unknown>;
}): Promise<void>; // awaited; logs and swallows write errors; actor fields come from request.user / request.viewAs
```

- `PATCH /api/super-admin/orgs/:orgId/plan`, body `{ plan: 'free'|'starter'|'team'|'business'|'enterprise'; reason: string /* trimmed, 3–500 chars */ }` (zod, `.strict()`) → `{ success: true, data: { organizationId, plan, previousPlan, changed: boolean } }`

- [ ] **Step 1: Write the failing tests**

```ts
it('SA-401: sets plan and canonical limits, keeps the storage counter, records who and why', async () => {
    await db.collection('organizations').updateOne({ _id: acmeOrgId }, { $set: { 'limits.currentStorageUsedBytes': 4242 } });
    const res = await request().patch(`/api/super-admin/orgs/${acmeOrgId}/plan`).set(bearer(opsToken))
        .send({ plan: 'business', reason: 'Design partner pilot' });
    expect(res.body).toEqual({ success: true, data: { organizationId: acmeOrgId.toString(), plan: 'business', previousPlan: 'free', changed: true } });
    const org = await db.collection('organizations').findOne({ _id: acmeOrgId });
    expect(org!.plan).toBe('business');
    expect(org!.limits).toMatchObject({ maxTestRuns: 2500, maxUsers: 100, maxConcurrentRuns: 15, aiMonthlyUsdCap: 150, currentStorageUsedBytes: 4242 });
    expect(org!.planOverride).toMatchObject({ plan: 'business', previousPlan: 'free', reason: 'Design partner pilot', byEmail: 'ops@agnox.test' });
    const [audit] = await auditFor(acmeOrgId, 'super_admin.plan_changed');
    expect(audit).toMatchObject({
        organizationId: acmeOrgId.toString(), userId: opsUserId.toString(), actorEmail: 'ops@agnox.test',
        actorOrganizationId: opsOrgId.toString(), targetType: 'organization', targetId: acmeOrgId.toString(),
        details: { previousPlan: 'free', plan: 'business', reason: 'Design partner pilot' },
    });
});

it('SA-402: rejects unknown plans, missing reason and malformed ids', async () => {
    const patch = (id: string, body: object) => request().patch(`/api/super-admin/orgs/${id}/plan`).set(bearer(opsToken)).send(body);
    expect((await patch(acmeOrgId.toString(), { plan: 'platinum', reason: 'x y z' })).status).toBe(400);
    expect((await patch(acmeOrgId.toString(), { plan: 'team' })).status).toBe(400);
    expect((await patch('not-an-id', { plan: 'team', reason: 'x y z' })).status).toBe(400);
    expect((await patch(new ObjectId().toString(), { plan: 'team', reason: 'x y z' })).status).toBe(404);
});

it('SA-403: refuses an org with a live Stripe subscription', async () => {
    await db.collection('organizations').updateOne({ _id: paidOrgId }, { $set: { billing: { stripeSubscriptionId: 'sub_1', status: 'active' } } });
    const res = await request().patch(`/api/super-admin/orgs/${paidOrgId}/plan`).set(bearer(opsToken)).send({ plan: 'enterprise', reason: 'Upgrade' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('STRIPE_SUBSCRIPTION_ACTIVE');
});

it('SA-404: the same plan is a no-op with no audit entry', async () => {
    const current = (await db.collection('organizations').findOne({ _id: acmeOrgId }))!.plan;
    const res = await request().patch(`/api/super-admin/orgs/${acmeOrgId}/plan`).set(bearer(opsToken)).send({ plan: current, reason: 'Again' });
    expect(res.body.data.changed).toBe(false);
    expect(await auditFor(acmeOrgId, 'super_admin.plan_changed')).toHaveLength(0);
});

it('SA-405: a non-super-admin org admin gets 404 and nothing changes', async () => {
    const before = (await db.collection('organizations').findOne({ _id: acmeOrgId }))!.plan;
    const res = await request().patch(`/api/super-admin/orgs/${acmeOrgId}/plan`).set(bearer(acmeAdminToken)).send({ plan: 'enterprise', reason: 'Self upgrade' });
    expect(res.status).toBe(404);
    expect((await db.collection('organizations').findOne({ _id: acmeOrgId }))!.plan).toBe(before);
});
```

- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement `logSuperAdminAudit`** (document shape D6).
- [ ] **Step 4: Implement the route** per D7. `planOverride = { plan, previousPlan, reason, byUserId, byEmail, at: new Date() }`. Use one `updateOne` filtered by `{ _id }`.
- [ ] **Step 5: Write `migrations/032-super-admin-audit-index.ts`**, modelled on `migrations/031-…ts` (`--dry-run`, `PLATFORM_MONGO_URI`, idempotent): ensure index `{ action: 1, timestamp: -1 }` named `idx_audit_logs_action_timestamp` on `audit_logs`. The header comment documents the additive, optional fields this batch introduces: `organizations.planOverride { plan, previousPlan, reason, byUserId, byEmail, at }` and `audit_logs.actorEmail`, `audit_logs.actorOrganizationId`. No backfill. **Do not run it locally against the root `.env`.**
- [ ] **Step 6: Run, pass. Commit** — `feat(super-admin): manual plan override with audit trail`

---

### Task 5: Delete an empty organization

**Files:**
- Create: `apps/producer-service/src/services/org-deletion.ts`
- Modify: `apps/producer-service/src/routes/super-admin.ts`
- Test: `suite-sa-super-admin.test.ts`

**Interfaces:**
- Consumes: `loadOrganizationRows` blockers logic (extract `computeDeleteBlockers(db, org, callerOrganizationId): Promise<DeleteBlocker[]>` into `org-deletion.ts` and have Task 3's service call it), `removeScheduledJob` (`utils/scheduler.ts:220`), `invalidateUserAuthState`, `invalidateApiKeyAuthState` (`utils/auth-state.ts:182-189`).
- Produces:

```ts
export const ORG_SCOPED_COLLECTIONS: readonly string[];      // deleted
export const ORG_RETAINED_COLLECTIONS = ['audit_logs', 'webhook_logs'] as const;
export function deleteOrganization(db: Db, organizationId: string): Promise<{ removed: Record<string, number> }>;
```

- `DELETE /api/super-admin/orgs/:orgId`, body `{ confirmName: string }` → `200 { success: true, data: { deletedId, removed } }`; `400 code 'CONFIRMATION_MISMATCH'`; `404`; `409 { code: 'ORG_NOT_DELETABLE', blockers: DeleteBlocker[] }`.

- [ ] **Step 1: Write the failing tests**

```ts
it('SA-501: refuses a wrong confirmation name', async () => {
    const res = await request().delete(`/api/super-admin/orgs/${emptyOrgId}`).set(bearer(opsToken)).send({ confirmName: 'empty org' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CONFIRMATION_MISMATCH');
    expect(await db.collection('organizations').countDocuments({ _id: emptyOrgId })).toBe(1);
});

it('SA-502: refuses an org that has data, and the caller’s own org', async () => {
    const acme = await request().delete(`/api/super-admin/orgs/${acmeOrgId}`).set(bearer(opsToken)).send({ confirmName: 'Acme' });
    expect(acme.status).toBe(409);
    expect(acme.body).toMatchObject({ code: 'ORG_NOT_DELETABLE', blockers: expect.arrayContaining(['HAS_EXECUTIONS']) });
    const own = await request().delete(`/api/super-admin/orgs/${opsOrgId}`).set(bearer(opsToken)).send({ confirmName: 'Agnox Ops' });
    expect(own.body.blockers).toContain('OWN_ORG');
});

it('SA-503: deletes the org and everything scoped to it, ends its sessions, keeps the audit trail', async () => {
    // seed emptyOrg with: its 1 admin, a project (string id), an API key, an invitation,
    // a schedule (isActive false), a demo execution (isDemo: true), a projectRunSettings doc
    const res = await request().delete(`/api/super-admin/orgs/${emptyOrgId}`).set(bearer(opsToken)).send({ confirmName: 'Empty Org' });
    expect(res.status).toBe(200);
    const either = { $in: [emptyOrgId, emptyOrgId.toString()] };
    for (const { name } of await db.listCollections().toArray()) {
        if (name === 'audit_logs' || name === 'webhook_logs') continue;
        expect(await db.collection(name).countDocuments({ organizationId: either }), name).toBe(0);
    }
    expect(await db.collection('organizations').countDocuments({ _id: emptyOrgId })).toBe(0);
    expect((await request().get('/api/executions').set(bearer(emptyAdminToken))).status).toBe(401);
    expect(await auditFor(emptyOrgId, 'super_admin.org_deleted')).toHaveLength(1);
});
```

- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement.** Order: validate id → load org (404) → compare `confirmName` (400) → `computeDeleteBlockers` (409) → write the audit entry (`details: { name, plan, slug }`) → `deleteOrganization` → respond. `deleteOrganization`: read the org's schedule ids and call `removeScheduledJob` for each; read user ids and API key hashes; `deleteMany({ organizationId: { $in: [id, new ObjectId(id)] } })` on every entry of `ORG_SCOPED_COLLECTIONS`; delete the `organizations` document last; then invalidate auth state. There is no transaction (standalone MongoDB in dev and CI), so the function must be safe to re-run.
- [ ] **Step 4: Build `ORG_SCOPED_COLLECTIONS` from the code, not from memory.** Starting list from this inspection: `users, invitations, apiKeys, projects, projectEnvVars, projectRunSettings, projectTestStructures, schedules, executions, test_cases, test_case_folders, test_cycles, ingest_sessions, stability_reports, chat_sessions, automationPlans, ai_usage_logs, usage_alerts`. Confirm and extend it with `rg "collection(<[^>]*>)?\('" apps/producer-service/src apps/worker-service/src` and the collections created by migrations 028–030. SA-503's `listCollections` loop is the safety net.
- [ ] **Step 5: Run, pass. Commit** — `feat(super-admin): delete empty organizations behind a confirmation guard`

---

### Task 6: View-As middleware

**Files:**
- Create: `apps/producer-service/src/middleware/view-as.ts`
- Modify: `apps/producer-service/src/middleware/auth.ts` (end of `authMiddleware`, after line 112; JWT branch of `createApiKeyAuthMiddleware`, after line 193), `apps/producer-service/src/middleware/rateLimiter.ts:98-101`, `apps/producer-service/src/types/fastify.d.ts`, `apps/producer-service/src/routes/super-admin.ts`
- Test: `suite-sa-super-admin.test.ts`

**Interfaces:**
- Consumes: `isSuperAdmin`, `logSuperAdminAudit`, `redis` from `config/redis.js`, the db via a `setViewAsDb(db: Db)` setter called from `connectToMongo` next to `setAuthDb` (`config/server.ts:37`).
- Produces:

```ts
export const VIEW_AS_HEADER = 'x-view-as-org';
export function applyViewAs(request: FastifyRequest, reply: FastifyReply): Promise<void>;
// fastify.d.ts
interface FastifyRequest { viewAs?: { organizationId: string; realOrganizationId: string } }
```

- `POST /api/super-admin/view-as/:orgId` → `{ success: true, data: { organizationId, name } }` and audit `view_as_started`; `DELETE /api/super-admin/view-as/:orgId` → `{ success: true, data: {} }` and audit `view_as_ended`. Both 404 for an unknown org.

- [ ] **Step 1: Write the failing tests**

```ts
const viewAs = (orgId: ObjectId | string) => ({ 'X-View-As-Org': orgId.toString() });

it('SA-601: a super-admin reads the target org’s data', async () => {
    const res = await request().get('/api/projects').set(bearer(opsToken)).set(viewAs(acmeOrgId));
    expect(res.status).toBe(200);
    expect(res.body.projects.map((p: any) => p.name).sort()).toEqual(['Acme Mobile', 'Acme Web']);
});

it('SA-602: routes that authenticate again in their own preHandler stay scoped to the target', async () => {
    const res = await request().get('/api/organization').set(bearer(opsToken)).set(viewAs(acmeOrgId));
    expect(res.body.organization.id).toBe(acmeOrgId.toString());
});

it('SA-603: the header is ignored for a caller who is not a super-admin', async () => {
    const res = await request().get('/api/organization').set(bearer(acmeAdminToken)).set(viewAs(opsOrgId));
    expect(res.status).toBe(200);
    expect(res.body.organization.id).toBe(acmeOrgId.toString());
});

it('SA-604: the header is ignored for a super-admin’s API key', async () => {
    // opsApiKey: signApiKeyToken(...) for ops, stored with utils/apiKeys.createApiKey
    const res = await request().get('/api/organization').set(bearer(opsApiKey)).set(viewAs(acmeOrgId));
    expect(res.status).toBe(200);
    expect(res.body.organization.id).toBe(opsOrgId.toString());
});

it('SA-605: every mutating method is rejected and nothing is written', async () => {
    const before = await db.collection('projects').countDocuments();
    for (const [method, path] of [['post', '/api/projects'], ['patch', '/api/organization'], ['put', '/api/integrations/jira'], ['delete', `/api/projects/${acmeProjectId}`]] as const) {
        const res = await request()[method](path).set(bearer(opsToken)).set(viewAs(acmeOrgId)).send({ name: 'Injected' });
        expect(res.status, `${method} ${path}`).toBe(403);
        expect(res.body.code).toBe('READ_ONLY_IMPERSONATION');
    }
    expect(await db.collection('projects').countDocuments()).toBe(before);
    expect((await auditFor(acmeOrgId, 'super_admin.view_as_blocked')).length).toBe(4);
});

it('SA-606: an unknown or malformed target is 404', async () => {
    expect((await request().get('/api/projects').set(bearer(opsToken)).set(viewAs(new ObjectId()))).status).toBe(404);
    expect((await request().get('/api/projects').set(bearer(opsToken)).set(viewAs('{"$ne":null}'))).status).toBe(404);
});

it('SA-607: identity and console routes keep the real identity', async () => {
    const me = await request().get('/api/auth/me').set(bearer(opsToken)).set(viewAs(acmeOrgId));
    expect(me.body.data).toMatchObject({ email: 'ops@agnox.test', isSuperAdmin: true, organization: { id: opsOrgId.toString() } });
    expect((await request().delete(`/api/super-admin/view-as/${acmeOrgId}`).set(bearer(opsToken)).set(viewAs(acmeOrgId))).status).toBe(200);
});

it('SA-608: reads are audited once per window; start and exit are always audited', async () => {
    redisMock.store.clear();
    await request().post(`/api/super-admin/view-as/${acmeOrgId}`).set(bearer(opsToken));
    await request().get('/api/projects').set(bearer(opsToken)).set(viewAs(acmeOrgId));
    await request().get('/api/schedules').set(bearer(opsToken)).set(viewAs(acmeOrgId));
    await request().delete(`/api/super-admin/view-as/${acmeOrgId}`).set(bearer(opsToken));
    expect(await auditFor(acmeOrgId, 'super_admin.view_as_started')).toHaveLength(1);
    expect(await auditFor(acmeOrgId, 'super_admin.view_as_read')).toHaveLength(1);
    expect(await auditFor(acmeOrgId, 'super_admin.view_as_ended')).toHaveLength(1);
});

it('SA-609: viewing is rate-limited against the operator’s org, not the customer’s', async () => {
    // the suite passes no-op limiters to setupRoutes, so the key function is tested directly
    const { rateLimitIdentity } = await import('../../middleware/rateLimiter');
    expect(rateLimitIdentity({ user: { organizationId: 'target' }, viewAs: { organizationId: 'target', realOrganizationId: 'real' } } as any)).toBe('real');
    expect(rateLimitIdentity({ user: { organizationId: 'own' } } as any)).toBe('own');
});
```

- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement `applyViewAs`** exactly per the D4 table and D5. Match paths on `request.url.split('?')[0]`. If `request.viewAs` is already set on this request (second run from a route-level `authMiddleware`), re-apply the swap from it without another org lookup or audit write. Do not call it from `optionalAuth`.
- [ ] **Step 4: Wire it in.** `authMiddleware`: after `request.user = payload`, `await applyViewAs(request, reply); if (reply.sent) return;`. Same in the JWT branch of `createApiKeyAuthMiddleware`. Not in the `x-api-key` branch.
- [ ] **Step 5: Rate limiter.** Export `rateLimitIdentity(request): string | undefined` returning `request.viewAs?.realOrganizationId ?? request.user?.organizationId`, and use it at `rateLimiter.ts:98-101`.
- [ ] **Step 6: Add the start/exit routes.**
- [ ] **Step 7: Check `routes/reports.ts`.** It authenticates on its own. Confirm a report opened with a report token obtained through `GET /api/executions/:taskId/report-token` while viewing serves the target org's report, and that its JWT path cannot be steered by the header. Add a test only if behaviour needs a change.
- [ ] **Step 8: Run the whole producer suite** (`npm run test -w producer-service`): the auth middleware changed, so every suite is in scope.
- [ ] **Step 9: Commit** — `feat(view-as): read-only organization impersonation for super-admins`

---

### Task 7: Public status endpoint and status page fixes

**Files:**
- Create: `apps/producer-service/src/routes/public-status.ts`, `apps/producer-service/src/routes/__tests__/suite-sb-platform-status.test.ts`
- Modify: `apps/producer-service/src/routes/monitor-status.ts`, `apps/producer-service/src/config/routes.ts`, `apps/producer-service/src/config/middleware.ts:91-98`, `apps/producer-service/src/middleware/auth.ts:15-34`, `status-dashboard.html`, `.github/workflows/deploy.yml:166`, `docs/architecture/deployment.md:700-724`, `docs/architecture/system-overview.md` (~638), `PROJECT_CONTEXT.md:399-409`, `README.md` (~760, ~1028)

**Interfaces:**
- Consumes: `checkInfrastructure` (Task 2).
- Produces: `GET /api/status` (public, always HTTP 200):

```ts
type ComponentStatus = 'operational' | 'down' | 'unknown';
{ success: true, data: {
    status: 'operational' | 'degraded' | 'outage',
    checkedAt: string,
    components: { producer: 'operational', workers: ComponentStatus, mongodb: ComponentStatus, redis: ComponentStatus, rabbitmq: ComponentStatus },
} }
```

Rules: `workers` is `operational` when `queue.consumers >= 1`, `down` when `0`, `unknown` when RabbitMQ is unhealthy. `status` is `outage` when `mongodb` is down, `degraded` when any other component is not `operational`, else `operational`. No counts, versions, uptime, hostnames or tenant data. Served from `checkInfrastructure(…, { maxAgeMs: 10_000 })`.

- `GET /api/system/monitor-status` (secret header unchanged) → `{ success: true, status: 'ok' | 'degraded', timestamp, data: { queueDepth: number | null, activeWorkers: number | null, dbConnected, redisConnected, rabbitConnected } }`.

- [ ] **Step 1: Write the failing tests** (`suite-sb`, harness as above, no auth header on `/api/status`)

```ts
it('SB-101: public status needs no credentials and exposes only component states', async () => {
    const res = await request().get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: {
        status: 'operational', checkedAt: expect.any(String),
        components: { producer: 'operational', workers: 'operational', mongodb: 'operational', redis: 'operational', rabbitmq: 'operational' },
    } });
});
it('SB-102: RabbitMQ down → degraded, workers unknown, still HTTP 200', async () => {
    rabbitMqService.checkConnection.mockRejectedValue(new Error('closed'));
    rabbitMqService.getQueueStats.mockRejectedValue(new Error('closed'));
    const { data } = (await request().get('/api/status')).body;
    expect(data).toMatchObject({ status: 'degraded', components: { rabbitmq: 'down', workers: 'unknown' } });
});
it('SB-103: no consumers → workers down; Redis failing → redis down', async () => {
    rabbitMqService.getQueueStats.mockResolvedValue({ messageCount: 9, consumerCount: 0 });
    redisMock.client.ping = async () => { throw new Error('down'); };
    const { data } = (await request().get('/api/status')).body;
    expect(data.components).toMatchObject({ workers: 'down', redis: 'down' });
    expect(JSON.stringify(data)).not.toContain('9');
});
it('SB-104: monitor-status reports broker and cache state and degrades', async () => {
    process.env.MONITORING_SECRET_KEY = 'm'.repeat(32); // set before the dynamic imports in beforeAll
    rabbitMqService.getQueueStats.mockRejectedValue(new Error('closed'));
    rabbitMqService.checkConnection.mockRejectedValue(new Error('closed'));
    const res = await request().get('/api/system/monitor-status').set('X-Agnox-Monitor-Secret', 'm'.repeat(32));
    expect(res.body).toMatchObject({ success: true, status: 'degraded', data: { queueDepth: null, activeWorkers: null, dbConnected: true, rabbitConnected: false } });
    expect((await request().get('/api/system/monitor-status')).status).toBe(401);
});
```

- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement `publicStatusRoutes(app, dbClient, redis)`**, register it, and add `'/api/status'` to **both** public lists. Both lists match with `startsWith`, so do not create any other route whose path begins with `/api/status`.
- [ ] **Step 4: Rework `monitor-status.ts`** onto `checkInfrastructure` with the response above.
- [ ] **Step 5: Rewrite the script and cards in `status-dashboard.html`**: fetch `${CONFIG.apiBase}/api/status` with no secret; delete `monitorSecret` from `CONFIG`; show five component rows (Producer API, Workers, MongoDB, Redis, RabbitMQ) and drive the banner from `data.status` (`operational` green "All Systems Operational", `degraded` amber "Degraded Performance", `outage` or a failed fetch red "Major Outage"); remove the queue-depth and worker-count cards, the hard-coded `v3.5.0` badge and the "Internal Ops Dashboard — not for public distribution" footer; title becomes "Agnox Status". This file keeps its CDN Tailwind (it is a standalone static page, not part of the dashboard).
- [ ] **Step 6: Delete `deploy.yml:166`** (the `sed` that writes the secret into the page).
- [ ] **Step 7: Fix the docs** to match the real responses; uptime monitors should probe `GET /health` (200/503), and the status page uses `GET /api/status`.
- [ ] **Step 8: Run `suite-sb`, `suite-j`, `suite-sa`. Commit** — `fix(status): public status endpoint; stop shipping the monitoring secret to the browser`

**Operator follow-up (not code, list it in the PR description):** rotate `MONITORING_SECRET_KEY` in GitHub secrets after this deploys, because the current value has been readable in the page source.

---

### Task 8: Dashboard plumbing — auth state, header injection, route guard, sidebar link

**Files:**
- Create: `apps/dashboard-client/src/utils/view-as.ts`, `apps/dashboard-client/src/utils/api-fetch.ts`
- Modify: `src/main.tsx`, `src/context/AuthContext.tsx`, `src/context/SocketContext.tsx`, `src/App.tsx`, `src/components/Sidebar.tsx`, `eslint.config.js`
- Modify (replace `fetch(` with `apiFetch(`, 16 call sites): `src/hooks/useDashboardData.ts` (2), `src/components/Dashboard.tsx` (4), `src/components/ArtifactsView.tsx`, `src/components/CycleBuilderDrawer.tsx`, `src/components/ExecutionModal.tsx`, `src/components/ExecutionDrawer.tsx`, `src/components/ExecutionRow.tsx`, `src/components/SpecToTestModal.tsx`, `src/pages/CycleReportPage.tsx`, `src/pages/AiAnalytics.tsx`, `src/components/settings/SchedulesList.tsx` (2)

**Interfaces:**
- Produces:

```ts
// utils/view-as.ts
export const VIEW_AS_STORAGE_KEY = 'agnox:viewAs';
export const VIEW_AS_HEADER = 'X-View-As-Org';
export const READ_ONLY_BLOCKED_EVENT = 'agnox:read-only-blocked';
export interface IViewAsState { organizationId: string; organizationName: string }
export function getViewAs(): IViewAsState | null;          // tolerant of missing/corrupt JSON
export function setViewAs(state: IViewAsState): void;
export function clearViewAs(): void;
export function installViewAsInterceptors(): void;          // call once, before render
// utils/api-fetch.ts
export function apiFetch(input: string, init?: RequestInit): Promise<Response>;
// AuthContext value additions
isSuperAdmin: boolean; viewAs: IViewAsState | null;
```

- [ ] **Step 1: `utils/view-as.ts`.** `installViewAsInterceptors` adds (a) an axios request interceptor on the default instance that sets `VIEW_AS_HEADER` when `getViewAs()` is non-null and the URL starts with `API_BASE_URL`, and (b) an axios response interceptor that dispatches `new CustomEvent(READ_ONLY_BLOCKED_EVENT)` on `window` when `error.response?.status === 403 && error.response.data?.code === 'READ_ONLY_IMPERSONATION'`, then rethrows.
- [ ] **Step 2: `utils/api-fetch.ts`.** Same header rule; after the response arrives, a 403 with that `code` (read from `response.clone().json()`) dispatches the same event. Returns the original response untouched.
- [ ] **Step 3: Replace the 16 `fetch(` calls** with `apiFetch(` (mechanical; arguments unchanged). Add to `eslint.config.js` a `no-restricted-globals` rule for `fetch` with the message "Use apiFetch from utils/api-fetch", and an override that turns it off for `src/utils/api-fetch.ts`.
- [ ] **Step 4: `main.tsx`** calls `installViewAsInterceptors()` before `createRoot`.
- [ ] **Step 5: `AuthContext.tsx`.** Read `isSuperAdmin` from `/api/auth/me` (`userData.isSuperAdmin === true`). Hold `viewAs` from `getViewAs()` at mount. If `/me` says the user is not a super-admin while `viewAs` is stored, call `clearViewAs()` and set it to `null`. When `viewAs` is active, the `user` exposed by the context is `{ ...realUser, role: 'viewer', organizationId: viewAs.organizationId, organizationName: viewAs.organizationName }`. `logout` also calls `clearViewAs()`. Skip the `gtag` user-property effect while viewing.
- [ ] **Step 6: `SocketContext.tsx`.** `if (!token || viewAs) return;` and add `viewAs` to the effect's dependencies.
- [ ] **Step 7: `App.tsx`.** Add `SuperAdminRoute` (renders children only when `isSuperAdmin && !viewAs`; otherwise `<Navigate to="/dashboard" replace />`; returns `null` while `isLoading`) and `<Route path="/super-admin" element={<SuperAdminRoute><SuperAdminPage /></SuperAdminRoute>} />` inside the `AppLayout` group. `SuperAdminPage` is a stub with `PageHeader` until Task 9.
- [ ] **Step 8: `Sidebar.tsx`.** Add `{ icon: ShieldCheck, label: 'Super Admin', to: '/super-admin', href: null, disabled: false, aiFlag: null, superAdminOnly: true }` to `NAV_ITEMS` before `Settings`, and in `visibleNavItems` drop it unless `isSuperAdmin && !viewAs`. The existing renderer gives it `data-testid="sidebar-nav-super-admin"` (desktop) and `sidebar-mobile-nav-super-admin`.
- [ ] **Step 9: Verify** — `npm run lint` and `npm run typecheck -w dashboard-client` clean; `npm run test:ui` still green (no behaviour change for ordinary users).
- [ ] **Step 10: Commit** — `feat(dashboard): super-admin flag, guarded route and View-As request plumbing`

---

### Task 9: Super-Admin console page

**Files:**
- Create: `src/types/super-admin.ts` (mirrors `ISuperAdminOrgRow`, `DeleteBlocker` and the health payload from Tasks 2–3), `src/hooks/use-super-admin.ts`, `src/pages/SuperAdminPage.tsx`, `src/components/super-admin/OrganizationsTable.tsx`, `PlatformHealthCard.tsx`, `ChangePlanDialog.tsx`, `DeleteOrgDialog.tsx`

**Interfaces:**
- Consumes: the `/api/super-admin/*` endpoints; `useToast`; primitives from `components/ui/primitives.tsx`; dialog markup pattern from `components/settings/InviteModal.tsx`.
- Produces (react-query): `useSuperAdminOrgs()` key `['super-admin', 'orgs']`; `useSuperAdminHealth()` key `['super-admin', 'health']`, `refetchInterval: 15_000`; `useChangePlan()` and `useDeleteOrg()` mutations that invalidate `['super-admin', 'orgs']`; `enterViewAs(org)`.

**Test ids (the Playwright spec depends on these):**

| Element | `data-testid` |
|---|---|
| Health card | `super-admin-health-card` |
| Running / queued counts | `super-admin-health-running`, `super-admin-health-queued` |
| Service status (mongodb, redis, rabbitmq) | `super-admin-health-service-<name>` |
| Search input | `super-admin-org-search` |
| Table | `super-admin-orgs-table` |
| Row | `super-admin-org-row-<orgId>` |
| Row actions | `super-admin-view-as-<orgId>`, `super-admin-change-plan-<orgId>`, `super-admin-delete-<orgId>` |
| Plan dialog | `super-admin-plan-dialog`, `super-admin-plan-select`, `super-admin-plan-reason`, `super-admin-plan-submit` |
| Delete dialog | `super-admin-delete-dialog`, `super-admin-delete-confirm-input`, `super-admin-delete-submit` |

- [ ] **Step 1: Hooks and types.**
- [ ] **Step 2: `PlatformHealthCard`.** Running and Queued counts, queue depth and consumer count (an em dash when `queue` is null), and three service rows with a green/red `Pill` reading "Healthy" / "Unhealthy". `SkeletonRows` while loading.
- [ ] **Step 3: `OrganizationsTable`.** Columns: Organization (name, id in mono, created date) · Plan (`Pill`; a small "Manual" pill when `planOverride` is set, with reason and author in `title`) · Owner · Members · Projects · Test cases · Active schedules · Activity (`Active`/`Dormant` pill, last run date, `7d / 30d / total`) · AI (`BYOK · <provider>` or "No key") · Integrations (one small pill per connected integration: Jira, Linear, Monday, Slack, Teams, GitHub) · Actions. Client-side search over name, id and owner email; default sort newest first. `EmptyState` when the filter matches nothing. Wrap the table in `overflow-x-auto`.
- [ ] **Step 4: `ChangePlanDialog`.** Select of the five plans (current one preselected), required reason textarea (min 3 chars), submit disabled until both are valid and the plan differs. On 409 `STRIPE_SUBSCRIPTION_ACTIVE` show the server message inline. On success: toast `Plan changed to <Plan> for <Org>`.
- [ ] **Step 5: `DeleteOrgDialog`.** The Delete action is disabled when `!row.deletable`, with `title` listing the blockers in plain words. The dialog asks the operator to type the organization name; submit (red) is disabled until the input equals `row.name` exactly; sends `{ confirmName }` as the DELETE body (`axios.delete(url, { data, headers })`). On success: toast `Deleted <Org>`.
- [ ] **Step 6: View As.** `enterViewAs(row)`: `POST /api/super-admin/view-as/<id>`; on success `setViewAs({ organizationId: row.id, organizationName: row.name })` then `window.location.assign('/dashboard')`. On failure: error toast and stay. The button is hidden on the caller's own org (`deleteBlockers` contains `OWN_ORG`).
- [ ] **Step 7: `SuperAdminPage`.** `PageHeader` (title "Super Admin", description "Organizations, plans and platform health"), health card, table.
- [ ] **Step 8: Run the `react-doctor` skill** on the new components and fix what it reports. `npm run lint`, `npm run typecheck -w dashboard-client`.
- [ ] **Step 9: Commit** — `feat(dashboard): super-admin console with org overview, plan override and health`

---

### Task 10: View-As banner and read-only mode

**Files:**
- Create: `src/components/ViewAsBanner.tsx`
- Modify: `src/components/AppLayout.tsx`, `src/App.tsx` (standalone layout at lines 119-131)

**Interfaces:**
- Consumes: `useAuth().viewAs`, `clearViewAs`, `READ_ONLY_BLOCKED_EVENT`, `useToast`.

- [ ] **Step 1: `ViewAsBanner`.** Renders nothing when `viewAs` is null. Otherwise a full-width amber bar, `role="status"`, `data-testid="view-as-banner"`, with the exact text `Viewing as {organizationName} (Read-Only) — ` followed by a button `data-testid="view-as-exit-button"` labelled `Exit to Super-Admin`. Exit: `DELETE /api/super-admin/view-as/<id>` (ignore failure), `clearViewAs()`, `window.location.assign('/super-admin')`. It also listens for `READ_ONLY_BLOCKED_EVENT` and shows `toast.info('Read-only: changes are disabled while viewing another organization.')`.
- [ ] **Step 2: Mount it** as the first child of the right-hand column in `AppLayout` (above `DashboardHeader`, outside the scrolling `<main>`, so it never scrolls away) and at the top of the standalone cycle-report layout in `App.tsx`. Hide `OnboardingWidget` while viewing.
- [ ] **Step 3: Check the viewer UI.** With `user.role === 'viewer'` the existing pages already hide or disable their mutating controls (S-AUTH covers this). Walk Dashboard, Test Cases, Test Cycles and each Settings tab while viewing; anything still clickable must end in the read-only toast, not a silent failure or an unhandled rejection.
- [ ] **Step 4: Lint, type-check. Commit** — `feat(dashboard): persistent read-only banner for View-As`

---

### Task 11: Playwright UI sanity spec

**Files:**
- Create: `tests/specs/ui-mock/sanity/s-super-admin.spec.ts`
- Modify: `tests/mocks/MockApi.ts`, `tests/locators/SanityLocators.ts`, `tests/actions/SanityActions.ts`, `tests/fixtures/sanityTest.ts`

**Interfaces:**
- `IMockOrgOptions.isSuperAdmin?: boolean` (default `false`); `currentUser()` returns `isSuperAdmin`.
- `IRecordedCall.headers: Record<string, string>` (lower-cased names, from `request.headers()`).
- `MockApi.superAdminOrgs: Record<string, unknown>[]` served by a default `GET /api/super-admin/orgs`; defaults for `GET /api/super-admin/health`, `POST|DELETE /api/super-admin/view-as/[^/]+`. When `isSuperAdmin` is false these four answer `404 { message: 'Route not found', error: 'Not Found', statusCode: 404 }`.
- `SuperAdminLocators` (in `SanityLocators.ts`): `navLink`, `healthCard`, `running`, `queued`, `service(name)`, `search`, `row(orgId)`, `viewAsButton(orgId)`, `changePlanButton(orgId)`, `deleteButton(orgId)`, `planDialog`, `planSelect`, `planReason`, `planSubmit`, `deleteDialog`, `deleteConfirmInput`, `deleteSubmit`, `banner`, `exitButton`. `getByTestId` / `getByRole` only; JSDoc on every method.
- `SuperAdminActions` (in `SanityActions.ts`): `changePlan(orgId, plan, reason)`, `deleteOrg(orgId, typedName)`, `viewAs(orgId)`, `exitViewAs()`. No internal state.
- Fixtures `superAdmin` and `superAdminActions` in `sanityTest.ts`, each depending on `api`.

Row fixtures: `ACME = { id: '64b0000000000000000000a1', name: 'Acme', plan: 'free', ownerEmail: 'admin@acme.test', … deletable: false, deleteBlockers: ['HAS_EXECUTIONS'] }` and `EMPTY = { id: '64b0000000000000000000a2', name: 'Empty Org', … deletable: true, deleteBlockers: [] }`, full `ISuperAdminOrgRow` shape.

- [ ] **Step 1: Extend `MockApi`, locators, actions and fixtures.**
- [ ] **Step 2: Write the spec.** Tests and tags:

| # | Test | Tags | Key assertions |
|---|---|---|---|
| 1 | an ordinary admin has no Super Admin link and `/super-admin` redirects to the dashboard | `@smoke`, `@p1` | `navLink` has count 0; after `goto('/super-admin')` URL matches `/dashboard`; no call to `/api/super-admin/orgs` |
| 2 | a super-admin sees organizations with activity and config badges, and platform health | `@smoke`, `@p1` | `navLink` visible; ACME row contains `admin@acme.test`, `Active`, `BYOK`, `Jira`; `running` and `queued` show the mocked numbers; RabbitMQ service row reads `Unhealthy` when the mock says so |
| 3 | changing a plan sends plan and reason and updates the row | `@regression`, `@p1` | `api.callsTo('PATCH', /\/api\/super-admin\/orgs\/[^/]+\/plan$/)[0].body` equals `{ plan: 'team', reason: 'Pilot customer' }`; toast `Plan changed to Team for Acme`; row shows `Team` |
| 4 | delete is disabled for an org with data and needs the typed name for an empty one | `@regression`, `@p1` | ACME delete button disabled; EMPTY: submit disabled until `Empty Org` is typed; DELETE body `{ confirmName: 'Empty Org' }`; row count 0 afterwards |
| 5 | View As enters the org read-only, sends the header, and Exit returns to the console | `@smoke`, `@p1` | after `viewAs(ACME.id)`: URL `/dashboard`; banner has text `Viewing as Acme (Read-Only) — Exit to Super-Admin`; `header.userRole` reads `viewer`; some `GET /api/executions` call has `headers['x-view-as-org'] === ACME.id`; `navLink` count 0; after `exitViewAs()`: URL `/super-admin`, banner count 0, `sessionStorage['agnox:viewAs']` is null, one `DELETE /api/super-admin/view-as/<id>` call |
| 6 | a blocked change while viewing shows the read-only notice | `@regression`, `@p2` | while viewing, `page.evaluate(() => window.dispatchEvent(new CustomEvent('agnox:read-only-blocked')))`; the toast `Read-only: changes are disabled while viewing another organization.` is visible. (The 403-to-event path is covered by the backend suite plus the interceptor; viewer mode leaves no mutating control to click.) |

Tests 2–6 use `test.use({ mockOrg: { isSuperAdmin: true } })`.

- [ ] **Step 3: Run** — `npx playwright test -c tests/playwright.ui-mock.config.ts s-super-admin` then the whole config (`npm run test:ui`). Expected: all pass; `api.unhandled` contains no `/api/super-admin` path.
- [ ] **Step 4: Commit** — `test(ui): super-admin console and View-As sanity`

---

### Task 12: Documentation

- [ ] `PROJECT_CONTEXT.md`: add the `/api/super-admin/*` table (session, health, orgs, plan, delete, view-as start/exit), `GET /api/status`, the `X-View-As-Org` header and `READ_ONLY_IMPERSONATION`, `PLATFORM_SUPER_ADMIN_EMAILS`, the `isSuperAdmin` field on `/api/auth/me`.
- [ ] `docs/api-reference/authentication.md` (`/api/auth/me` response), `apps/producer-service/src/middleware/README.md` (the two new middlewares and the rule that super-admin routes declare `ROLES.ANY`), `TEST_PLAN.md` (suite SA, suite SB, S-SUPER-ADMIN).
- [ ] Operator notes in `docs/architecture/deployment.md`: how to enable the console (create the account, then add its email to the secret), the audit actions, and the `MONITORING_SECRET_KEY` rotation.
- [ ] Commit — `docs: super-admin console, View-As and public status`

---

## Commit Checklist

- [ ] 1 `feat(super-admin): email allowlist, hidden route guard and isSuperAdmin on /api/auth/me`
- [ ] 2 `feat(super-admin): platform health service and health card endpoint`
- [ ] 3 `feat(super-admin): organizations overview query`
- [ ] 4 `feat(super-admin): manual plan override with audit trail` (includes `migrations/032`)
- [ ] 5 `feat(super-admin): delete empty organizations behind a confirmation guard`
- [ ] 6 `feat(view-as): read-only organization impersonation for super-admins`
- [ ] 7 `fix(status): public status endpoint; stop shipping the monitoring secret to the browser`
- [ ] 8 `feat(dashboard): super-admin flag, guarded route and View-As request plumbing`
- [ ] 9 `feat(dashboard): super-admin console with org overview, plan override and health`
- [ ] 10 `feat(dashboard): persistent read-only banner for View-As`
- [ ] 11 `test(ui): super-admin console and View-As sanity`
- [ ] 12 `docs: super-admin console, View-As and public status`

Before opening the PR: `npm run typecheck`, `npm run lint`, `npm run test -w producer-service`, `npm run test:ui`.

## Test Files (item 5)

| Requested | Actual path | Why |
|---|---|---|
| `apps/producer-service/src/__tests__/...` | `apps/producer-service/src/routes/__tests__/suite-sa-super-admin.test.ts` and `apps/producer-service/src/routes/__tests__/suite-sb-platform-status.test.ts` | `vitest.config.ts` only collects `src/routes/__tests__/**/*.test.ts`; a file under `src/__tests__/` would never run |
| `tests/specs/ui-mock/sanity/s-super-admin.spec.ts` | same | — |

## Open Questions for the Owner (defaults are already in the plan)

1. **Allowlist without email verification (D2).** Default: block signup for allowlisted emails and require the account to exist first. Alternative: build real email verification (separate batch).
2. **Plan override on a paying org (D7).** Default: refuse with 409 while a Stripe subscription is live. Alternative: allow it and accept that the next Stripe event overwrites it.
3. **What counts as "empty" (D8).** Default: no real runs, at most one member, no test cases. Loosen it if operator test orgs with data must be removable from the console.
4. **View-As role (D4).** Default: `viewer`, so admin-only tabs (Billing, Features) are not visible while viewing. Alternative: a dedicated read-only admin view.
5. **Live updates while viewing (D10).** Default: none (no socket); the operator refreshes. Alternative: let a super-admin socket join the target org's room.
