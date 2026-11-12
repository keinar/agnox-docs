---
id: api-overview
title: API Overview
sidebar_position: 1
---

# API Reference

Complete REST API reference for Agnox. All endpoints return a consistent response envelope.

## Base URL

| Environment | URL |
|-------------|-----|
| **Production** | `https://api.agnox.dev` |

---

## Authentication

All endpoints except public routes require authentication.

### Option 1: JWT Bearer Token (Dashboard Users)
```
Authorization: Bearer <jwt-token>
```

### Option 2: API Key (CI/CD & Automation)
```
x-api-key: pk_live_<your-api-key>
```

> **Generate API keys:** Settings → Profile → API Access, or `POST /api/auth/api-keys` ([CI & Webhooks API →](./ci-and-webhooks#api-keys)). Keys are shown only once at creation.

---

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message"
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (e.g. a schedule's Run Now was queued) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions, monthly run quota exceeded, or `code: "AI_NOT_CONFIGURED"` — the organization has no AI API key for its active provider) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource, or deleting the organization's last project) |
| 429 | Too Many Requests (rate limit exceeded, or storage limit reached) |
| 500 | Internal Server Error |
| 503 | Service temporarily unavailable — retry shortly |

---

## Rate Limits

| Tier | Limit | Applied To |
|------|-------|------------|
| **Auth** | 5 req/min | Unauthenticated (IP-based) |
| **API** | 100 req/min | Authenticated (per-organization) |
| **Strict** | 10 req/min | Admin actions (per-organization) |
| **Ingest Event** | 500 req/min | Per API key |
| **Ingest Lifecycle** | 100 req/min | Per API key |

Rate limit headers in responses:
- `X-RateLimit-Limit` — maximum requests allowed
- `X-RateLimit-Remaining` — requests remaining in window
- `X-RateLimit-Reset` — timestamp when limit resets

---

## Multi-Tenant Isolation

All API endpoints automatically filter data by the authenticated user's `organizationId`. Users can only see data belonging to their organization. Attempts to access other organizations' data return `404 Not Found`.

---

## Security Headers

All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000` *(production only)*

---

## WebSocket (Socket.io)

Real-time updates via Socket.io at `/socket.io/`.

```javascript
const socket = io('https://api.agnox.dev', {
  auth: { token: 'your-jwt-token' }
});

// Events
socket.on('execution-updated', (data) => { /* status change */ });
socket.on('execution-log', (data) => { /* live log line */ });
```

Clients are automatically joined to `org:<organizationId>` — events are broadcast only to organization members.

---

## Endpoint Categories

| Category | Base Path | Reference |
|----------|-----------|-----------|
| **API Keys, CI Trigger & PR Webhook** | `/api/auth/api-keys`, `/api/ci/trigger`, `/api/webhooks/ci/pr` | [CI & Webhooks API →](./ci-and-webhooks) |
| **Authentication** | `/api/auth` | [Auth API →](./authentication) |
| **Organizations** | `/api/organization` | [Organizations API →](./organizations) |
| **Users** | `/api/users` | [Users API →](./users) |
| **Invitations** | `/api/invitations` | [Invitations API →](./invitations) |
| **Executions** | `GET /api/executions` (`limit` 1–100, `offset`, `status`) | [CI & Webhooks API →](./ci-and-webhooks#list-executions) |
| **Playwright Reporter ingest** | `/api/ingest/*` — used by `@agnox/playwright-reporter`; you don't call it directly | [Playwright Reporter →](../integrations/playwright-reporter) |
| **Test Cases** | `/api/test-cases` (`limit` / `offset`, `fields=summary`; returns `total` / `hasMore`), `/api/test-cases/quarantine` | — |
| **Test Cycles** | `/api/test-cycles` (`limit` / `offset`, `source=ci\|manual`, literal `search`; returns `total`) | — |
| **AI** | `/api/ai/*` — requires your organization's own provider key (BYOK) | [AI Configuration →](../ai-capabilities/configuration) |
| **Schedules** | `/api/schedules`, `PATCH /api/schedules/:id` (edit, pause/resume via `isActive`), `POST /api/schedules/:id/run-now` | [Scheduling →](../core-features/scheduling) |
| **Projects** | `/api/projects`, `/api/projects/:id` (`DELETE` — admin, not the last project), `/api/projects/:id/env`, `/api/projects/:id/settings` | — |
| **Integrations** | `/api/integrations/:provider`, `/api/linear/issues`, `/api/monday/items` | — |
