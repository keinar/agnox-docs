---
id: users
title: Users API
sidebar_position: 4
---

# Users API

Base URL: `/api/users`

Handles user listing, role management, and user removal with full RBAC enforcement.

---

## Roles and Permissions

| Role | View Users | Change Roles | Remove Users |
|------|------------|--------------|--------------|
| `admin` | ✅ | ✅ | ✅ |
| `developer` | ✅ | ❌ | ❌ |
| `viewer` | ✅ | ❌ | ❌ |

---

## GET `/api/users`

List all users in the organization.

**Auth:** All roles

### Response (200 OK)

```json
{
  "success": true,
  "users": [
    {
      "id": "507f1f77bcf86cd799439011",
      "email": "admin@example.com",
      "name": "John Admin",
      "role": "admin",
      "status": "active",
      "lastLoginAt": "2026-02-09T10:30:00.000Z",
      "createdAt": "2026-01-15T08:00:00.000Z"
    }
  ]
}
```

---

## GET `/api/users/:id`

Get a specific user's details.

**Auth:** All roles

Returns `404` for users from other organizations (tenant isolation).

---

## PATCH `/api/users/:id/role`

Change a user's role.

**Auth:** Admin only

### Request Body

```json
{ "role": "developer" }
```

Valid values: `admin`, `developer`, `viewer`

**Business rules:**
- Admins cannot change their own role
- The last admin in an organization cannot be demoted

### Response (200 OK)

```json
{
  "success": true,
  "message": "User role updated to developer",
  "user": { "id": "...", "email": "...", "role": "developer" }
}
```

Role changes are logged to the `audit_logs` collection.

---

## DELETE `/api/users/:id`

Remove a user from the organization.

**Auth:** Admin only

**Business rules:**
- Admins cannot delete their own account
- The last admin cannot be deleted

Historical data (executions, test runs) is retained for audit purposes.

### Response (200 OK)

```json
{
  "success": true,
  "message": "User user@example.com has been removed from the organization"
}
```

---

## cURL Examples

```bash
# List users
curl https://api.agnox.dev/api/users \
  -H "Authorization: Bearer <jwt-token>"

# Change role
curl -X PATCH https://api.agnox.dev/api/users/<id>/role \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "developer"}'

# Remove user
curl -X DELETE https://api.agnox.dev/api/users/<id> \
  -H "Authorization: Bearer <jwt-token>"
```

---

## Related

- [Authentication API →](./authentication)
- [Organizations API →](./organizations)
- [Invitations API →](./invitations)
