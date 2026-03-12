---
id: invitations
title: Invitations API
sidebar_position: 5
---

# Invitations API

Base URL: `/api/invitations`

Manages team member invitations with secure token handling, multi-tenant support, and plan limit enforcement.

**Security:** Tokens stored as SHA-256 hashes (never plaintext). 7-day validity. Single-use.

---

## POST `/api/invitations`

Send an invitation to join the organization.

**Auth:** Admin only

### Request Body

```json
{
  "email": "newuser@example.com",
  "role": "developer"
}
```

### Response (201 Created)

```json
{
  "success": true,
  "message": "Invitation sent.",
  "invitation": {
    "id": "507f1f77bcf86cd799439011",
    "email": "newuser@example.com",
    "role": "developer",
    "expiresAt": "2026-02-16T10:00:00.000Z",
    "userExists": false,
    "actionType": "signup"
  }
}
```

| Error | Condition |
|-------|-----------|
| `User limit reached` | Plan's max users exceeded |
| `User already in organization` | Email is already a member |
| `Invitation already sent` | Pending invitation exists for email |

---

## GET `/api/invitations`

List pending invitations.

**Auth:** Admin only

### Response (200 OK)

```json
{
  "success": true,
  "invitations": [
    {
      "id": "...",
      "email": "pending@example.com",
      "role": "developer",
      "status": "pending",
      "expiresAt": "2026-02-16T10:00:00.000Z"
    }
  ]
}
```

Status values: `pending`, `accepted`, `expired`

---

## DELETE `/api/invitations/:id`

Revoke a pending invitation.

**Auth:** Admin only

### Response (200 OK)

```json
{ "success": true, "message": "Invitation revoked successfully" }
```

---

## GET `/api/invitations/validate/:token`

Validate an invitation token.

**Auth:** Public (no authentication required)

### Response (200 OK — Valid)

```json
{
  "success": true,
  "valid": true,
  "organizationName": "Acme Corp",
  "role": "developer",
  "inviterName": "John Admin",
  "userExists": false
}
```

---

## Invitation Flow

```
Admin → POST /api/invitations → email sent with token link
         ↓
User clicks link → GET /validate/:token
         ↓
  New user?                  Existing user?
  POST /auth/signup          POST /auth/login
  with inviteToken           then POST /invitations/accept
         ↓                             ↓
         └──────── User joins org ─────┘
                   Token consumed
```

---

## Related

- [Authentication API →](./authentication)
- [Users API →](./users)
- [Organizations API →](./organizations)
