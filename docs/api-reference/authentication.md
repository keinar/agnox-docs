---
id: authentication
title: Authentication API
sidebar_position: 2
---

# Authentication API

Base URL: `/api/auth`

All authentication endpoints are **public** (no authentication required for signup/login).

---

## POST `/api/auth/signup`

Register a new user and create an organization (or join via invitation).

### Request Body

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "organizationName": "Acme Corp",
  "inviteToken": "abc123..."
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `email` | Yes | Valid email format |
| `password` | Yes | Min 8 chars, uppercase, lowercase, number, special char |
| `name` | Yes | User's full name |
| `organizationName` | Conditional | Required if no `inviteToken` |
| `inviteToken` | No | Valid invitation token (if joining existing org) |

### Response (201 Created)

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin",
    "organizationId": "507f191e810c19729de860ea",
    "organizationName": "Acme Corp"
  }
}
```

### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Missing required fields` | Email, password, or name not provided |
| 400 | `Weak password` | Password doesn't meet strength requirements |
| 400 | `Invalid invitation token` | Token not found or expired |
| 409 | `Email already registered` | Account already exists |
| 429 | `Rate limit exceeded` | 5/min per IP |

---

## POST `/api/auth/login`

Authenticate user and return JWT token.

### Request Body

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin",
    "organizationId": "507f191e810c19729de860ea",
    "organizationName": "Acme Corp"
  }
}
```

### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | `Invalid credentials` | Email or password incorrect |
| 429 | `Account temporarily locked` | 5 failed attempts → 15-minute lockout |

### Account Lockout

- **Threshold:** 5 failed attempts within 15 minutes
- **Lockout Duration:** 15 minutes (Redis TTL)
- **Reset:** Automatic after lockout expires, or on successful login

---

## GET `/api/auth/me`

Get current user information from JWT token.

### Headers

```
Authorization: Bearer <jwt-token>
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin",
    "organization": {
      "id": "507f191e810c19729de860ea",
      "name": "Acme Corp",
      "plan": "free",
      "limits": { "maxProjects": 1, "maxTestRuns": 50, "maxUsers": 3, "maxConcurrentRuns": 1, "maxStorageBytes": 524288000 },
      "aiAnalysisEnabled": true
    }
  }
}
```

---

## POST `/api/auth/logout`

Logout (client-side token removal).

### Response (200 OK)

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## JWT Token

- **Algorithm:** HS256
- **Expiration:** 24h (configurable via `JWT_EXPIRY`)
- **Claims:** `{ userId, organizationId, role, iat, exp }`

---

## cURL Examples

```bash
# Signup
curl -X POST https://api.agnox.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!","name":"John Doe","organizationName":"Acme Corp"}'

# Login
curl -X POST https://api.agnox.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'

# Get current user
curl https://api.agnox.dev/api/auth/me \
  -H "Authorization: Bearer <jwt-token>"
```

---

## Related

- [Organizations API →](./organizations)
- [Invitations API →](./invitations)
- [Users API →](./users)
