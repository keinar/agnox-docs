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
| **HMAC SHA-256 signing** | Each request includes an `X-Agnox-Signature` header for verification |
| **Configurable triggers** | Filter by execution status (`PASSED`, `FAILED`, `ERROR`, `UNSTABLE`) |
| **Retry logic** | Up to 3 retries with exponential back-off on non-2xx responses |
| **Multiple endpoints** | Register more than one webhook per organisation |

---

## Prerequisites

- An HTTPS endpoint that accepts `POST` requests with a JSON body.
- The endpoint must respond with `2xx` within **10 seconds**.

---

## Step 1 — Configure in Agnox

1. In the Agnox dashboard, go to **Settings → Connectors**.
2. Find the **Webhooks** card and click **Add Webhook**.
3. Fill in the fields:

| Field | Value |
|-------|-------|
| **Endpoint URL** | Your HTTPS endpoint (e.g. `https://hooks.example.com/agnox`) |
| **Secret** | A random string you generate — used to compute the signature |
| **Notify on** | Multi-select: `PASSED`, `FAILED`, `ERROR`, `UNSTABLE` |
| **Description** | *(Optional)* Label shown in the Connectors list |

4. Click **Save**. Agnox sends a `POST` with an empty `ping` payload to verify reachability.

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
  "event": "execution.completed",
  "timestamp": "2026-03-14T12:00:00.000Z",
  "organizationId": "org_abc123",
  "data": {
    "executionId": "exec_xyz789",
    "status": "FAILED",
    "testsPassed": 42,
    "testsFailed": 3,
    "testsSkipped": 1,
    "durationMs": 251400,
    "executionUrl": "https://app.agnox.dev/executions/exec_xyz789",
    "cycleId": "cycle_def456",
    "ciContext": {
      "source": "github",
      "repository": "my-org/my-repo",
      "prNumber": 99,
      "commitSha": "a1b2c3d4"
    }
  }
}
```

---

## Verifying the Signature

Agnox computes the signature as:

```
HMAC-SHA256(secret, rawRequestBody)
```

and sends it in the `X-Agnox-Signature` header as a hex digest. Verify it on your server before processing the payload.

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

## Retry Behaviour

| Attempt | Delay |
|---------|-------|
| 1st retry | 10 seconds |
| 2nd retry | 30 seconds |
| 3rd retry | 90 seconds |

After 3 failed attempts, the delivery is marked as **failed** and visible in **Settings → Connectors → Webhook Delivery Log**.

---

## Testing Your Endpoint

Use the **Send Test Event** button in the Webhooks card to fire a `ping` event at any time without triggering a real execution.

---

## Troubleshooting

| Issue | Likely Cause |
|-------|-------------|
| `Signature mismatch` | Secret doesn't match, or you're verifying against a parsed body instead of the raw bytes |
| `Timeout` | Your endpoint took longer than 10 s — offload heavy processing to a background job |
| All retries failed | Endpoint returned non-2xx — check your server logs and the Delivery Log in Agnox |

---

## Related

- [Slack →](./slack)
- [MS Teams →](./ms-teams)
- [API Reference →](../api-reference/api-overview)
