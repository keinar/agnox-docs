---
id: webhooks
title: Generic Webhooks
sidebar_position: 12
---

# Generic Outbound Webhooks

Send Agnox execution payloads to any HTTP endpoint — your own microservice, a Zapier zap, n8n workflow, or a custom alerting system. Every request is signed with an **HMAC SHA-256** signature so your server can verify the payload is authentic.

---

## Capabilities

| Feature | Description |
|---------|-------------|
| **Universal delivery** | POST to any HTTPS endpoint after every execution completes |
| **HMAC SHA-256 signing** | Each request includes an `x-agnox-signature` header for verification |
| **Fire-and-forget** | Non-blocking — Agnox dispatches the payload with a 10-second hard timeout and does not retry |

---

## Prerequisites

- An HTTPS endpoint that accepts `POST` requests with a JSON body.
- The endpoint must respond with `2xx` within **10 seconds**.

---

## Step 1 — Configure in Agnox

1. In the Agnox dashboard, go to **Settings → Connectors**.
2. Find the **Webhooks** card and click **Configure**.
3. Fill in the fields:

| Field | Value |
|-------|-------|
| **Endpoint URL** | Your HTTPS endpoint (e.g. `https://hooks.example.com/agnox`) |
| **Secret** | *(Optional)* A random string used to compute the HMAC-SHA256 signature |

4. Click **Save**.

:::tip Generating a strong secret
Use a cryptographically random string of at least 32 characters:
```bash
openssl rand -hex 32
```
:::

---

## Payload Schema

Every webhook POST has the following shape:

```json
{
  "event": "execution.finished",
  "executionId": "exec_xyz789",
  "taskId": "task_abc123",
  "status": "FAILED",
  "summary": "3 tests failed in My Test Suite",
  "groupName": "my-test-group",
  "startedAt": "2026-03-14T11:56:00.000Z",
  "finishedAt": "2026-03-14T12:00:00.000Z"
}
```

---

## Verifying the Signature

Agnox computes the signature as:

```
HMAC-SHA256(secret, rawRequestBody)
```

and sends it in the `x-agnox-signature` header in the format `sha256=<hex>`. Verify it on your server before processing the payload.

### Node.js Example

```typescript
import crypto from 'crypto';

function verifyAgnoxWebhook(
  rawBody: Buffer,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

// Express middleware example
app.post('/agnox', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['x-agnox-signature'] as string;

  if (!verifyAgnoxWebhook(req.body, sig, process.env.AGNOX_WEBHOOK_SECRET!)) {
    return res.status(401).send('Invalid signature');
  }

  const payload = JSON.parse(req.body.toString());
  // handle payload...
  res.sendStatus(200);
});
```

### Python Example

```python
import hmac
import hashlib

def verify_agnox_webhook(raw_body: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

:::info Always use the raw body
Parse the JSON **after** verification. Computing the HMAC over a re-serialised object can produce a different digest.
:::

---

## Troubleshooting

| Issue | Likely Cause |
|-------|-------------|
| `Signature mismatch` | Secret doesn't match, or you're verifying against a parsed body instead of the raw bytes |
| No delivery received | Your endpoint took longer than 10 s (hard timeout) — offload heavy processing to a background job |
| Payload received but no signature header | No secret was configured — set one in **Settings → Connectors → Webhooks** to enable signing |

---

## Related

- [Slack →](./slack)
- [MS Teams →](./ms-teams)
- [API Reference →](../api-reference/api-overview)
