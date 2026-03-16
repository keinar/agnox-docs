---
id: organizations
title: Organizations API
sidebar_position: 3
---

# Organizations API

Base URL: `/api/organization`

All organization endpoints require authentication via `Authorization: Bearer <token>`.

---

## GET `/api/organization`

Get current organization details.

**Auth:** All roles

### Response (200 OK)

```json
{
  "success": true,
  "organization": {
    "id": "507f191e810c19729de860ea",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "plan": "free",
    "limits": {
      "maxProjects": 1,
      "maxTestRuns": 50,
      "maxUsers": 3,
      "maxConcurrentRuns": 1,
      "maxStorageBytes": 524288000,
      "currentStorageUsedBytes": 0
    },
    "userCount": 2,
    "userLimit": 3,
    "aiAnalysisEnabled": true,
    "createdAt": "2026-01-15T10:00:00.000Z"
  }
}
```

---

## PATCH `/api/organization`

Update organization settings.

**Auth:** Admin only

### Request Body

```json
{
  "name": "New Organization Name",
  "aiAnalysisEnabled": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Organization name (2–100 characters) |
| `aiAnalysisEnabled` | boolean | Enable/disable AI failure analysis |

### Response (200 OK)

```json
{
  "success": true,
  "message": "Organization settings updated successfully",
  "organization": { "id": "...", "name": "New Name", "aiAnalysisEnabled": false }
}
```

All settings changes are logged to the `audit_logs` collection.

---

## GET `/api/organization/usage`

Get usage statistics for the current billing period.

**Auth:** All roles

### Response (200 OK)

```json
{
  "success": true,
  "usage": {
    "currentPeriod": {
      "startDate": "2026-02-01T00:00:00.000Z",
      "endDate": "2026-02-28T23:59:59.999Z"
    },
    "testRuns": { "used": 45, "limit": 100, "percentUsed": 45 },
    "users": { "active": 2, "limit": 3 },
    "storage": { "usedBytes": 524288000, "limitBytes": 10737418240 }
  },
  "alerts": [
    {
      "type": "warning",
      "resource": "testRuns",
      "message": "You've used 80% of your monthly test runs",
      "percentUsed": 80
    }
  ]
}
```

### Alert Types

| Type | Trigger |
|------|---------|
| `info` | 50–79% of limit used |
| `warning` | 80–99% of limit used |
| `critical` | 100% reached |

---

## GET `/api/organization/ai-config`

Get AI configuration (model selection and BYOK status).

**Auth:** All roles

---

## PATCH `/api/organization/ai-config`

Update AI configuration (default model, BYOK keys).

**Auth:** Admin only

---

## GET `/api/integrations/linear`

Get current Linear integration status for the organization.

**Auth:** All roles

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "teamId": "TEAM-abc123"
  }
}
```

The stored API key is never returned in plaintext. `enabled` is `true` once a valid key has been saved.

---

## PUT `/api/integrations/linear`

Store or update the Linear API key and team ID.

**Auth:** Admin only

### Request Body

```json
{
  "apiKey": "lin_api_...",
  "teamId": "TEAM-abc123"
}
```

The `apiKey` is encrypted at rest using AES-256-GCM before being stored. Setting `enabled: false` explicitly disables the integration without removing the stored credentials.

### Response (200 OK)

```json
{
  "success": true,
  "message": "Linear integration saved successfully"
}
```

---

## GET `/api/integrations/monday`

Get current Monday.com integration status.

**Auth:** All roles

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "boardId": "12345678",
    "groupId": "topics"
  }
}
```

---

## PUT `/api/integrations/monday`

Store or update the Monday.com API token, board ID, and optional group ID.

**Auth:** Admin only

### Request Body

```json
{
  "apiKey": "eyJhbGciOiJIUzI1NiJ9...",
  "boardId": "12345678",
  "groupId": "topics"
}
```

---

## POST `/api/monday/items`

Create a Monday.com board item from an execution.

**Auth:** All roles (JWT required)

### Request Body

```json
{
  "taskId": "execution-task-id",
  "title": "Login test fails on staging"
}
```

### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "itemId": "987654321",
    "itemUrl": "https://myteam.monday.com/boards/12345678/pulses/987654321"
  }
}
```

The `itemId` and `itemUrl` are appended to `execution.mondayItems[]` in MongoDB.

---

## DELETE `/api/integrations/:provider`

Unlink an integration by removing its stored credentials from the organization.

**Auth:** Admin only

**Supported providers:** `github`, `gitlab`, `azuredevops`, `bitbucket`, `jira`, `linear`, `monday`, `slack`

### Response (200 OK)

```json
{
  "success": true,
  "message": "Integration unlinked successfully"
}
```

---

## POST `/api/linear/issues`

Create a Linear issue from an execution and record the link bidirectionally.

**Auth:** All roles (JWT required)

### Request Body

```json
{
  "taskId": "execution-task-id",
  "title": "Login test fails on staging",
  "description": "## Root Cause\n..."
}
```

### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "issueId": "ABC-123",
    "issueUrl": "https://linear.app/myteam/issue/ABC-123"
  }
}
```

The `issueId` and `issueUrl` are appended to `execution.linearIssues[]` in MongoDB for bidirectional traceability.

---

## Related

- [Authentication API →](./authentication)
- [Users API →](./users)
- [Invitations API →](./invitations)
