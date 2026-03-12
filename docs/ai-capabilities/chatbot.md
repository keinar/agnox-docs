---
id: chatbot
title: Quality Chatbot (Ask AI)
sidebar_position: 6
---

# Quality Chatbot (Ask AI)

Ask natural-language questions about your test data and receive instant answers with optional inline charts — no SQL or query language required.

> **Requires:** `qualityChatbot` feature flag enabled in **Settings → Features**.

---

## Using the Chatbot

1. Navigate to **Ask AI** in the sidebar.
2. Type a question in the input field. Example queries:
   - *"How many tests failed last week?"*
   - *"What's the pass rate for the checkout group?"*
   - *"Which test images have the highest failure count this month?"*
   - *"Show me a breakdown of test results by environment for February 2026."*
3. The AI translates your question into a MongoDB aggregation pipeline and executes it securely against your organization's data.
4. The summarized answer appears as an assistant message.
5. When the response includes numeric comparisons or grouped counts, a **bar chart** is rendered inline.
6. Previous conversations appear in the **left panel** — click any session to continue a prior chat.

> Conversations are stored for **24 hours** and then automatically purged.

---

## Supported Chart Types

| Chart | When rendered |
|-------|--------------|
| **Bar chart** | Ranked or grouped comparisons (e.g., failures by image) |
| **Line chart** | Time-series data (e.g., daily pass rate over 30 days) |
| **Pie chart** | Distribution breakdowns (e.g., status proportions) |

---

## Security Model & Defense-in-Depth

The chatbot pipeline is hardened at every stage. User data never reaches the LLM in raw form, and LLM output never reaches the database without sanitization.

### Layer 0 — Shift-Left Data Redaction

Before the user's question and any attached context is sent to the LLM, a pre-processing pass strips sensitive field values:

- Known credential patterns (`password`, `token`, `secret`, `key`, `apiKey`, `authorization`) are replaced with `[REDACTED]` before inclusion in the prompt.
- This ensures that even if the system prompt or conversation context inadvertently references a sensitive field name, the actual value is never transmitted to the AI provider.

### Layer 0.5 — Prompt Injection Denylist

Every incoming message is scanned against a denylist of known prompt injection patterns before being forwarded to the LLM:

- Phrases designed to override the system prompt (e.g., `ignore previous instructions`, `you are now`, `disregard your instructions`, `act as`, `jailbreak`) are detected and the request is rejected with `400 Bad Request`.
- The denylist is case-insensitive and covers Unicode lookalike variants.

### Layers 1–5 — Pipeline Sanitizer (`sanitizePipeline()`)

Every LLM-generated MongoDB aggregation pipeline passes through a mandatory **5-layer guard** (`utils/chat-sanitizer.ts`) before execution:

| Layer | What it does |
|-------|--------------|
| **1. Stage allowlist** | Rejects any stage not in the approved set (`$match`, `$group`, `$project`, `$sort`, `$limit`, `$count`, `$addFields`, `$unwind`, etc.). `$out`, `$merge`, `$function`, `$where` are always blocked. |
| **2. Force `organizationId`** | Overwrites the `organizationId` in the first `$match` stage with the authenticated user's org ID — the LLM output cannot read another org's data. |
| **3. `$limit` cap** | Appends `{ $limit: 500 }` if absent; clamps any `$limit` above 1,000 to 1,000. |
| **4. Collection whitelist** | Only allows queries against `executions` and `test_cycles` — no access to `users`, `organizations`, or other collections. |
| **5. Operator scan** | Recursively scans all values for `$`-prefixed strings in field-name positions that are not in the operator allowlist. |

A `PipelineSanitizationError` is thrown (→ `400`) on any violation. The sanitized pipeline — never the raw LLM output — is what executes against MongoDB.

---

## Conversation History

- Past sessions appear in the **left panel**, sorted by most recent.
- Click any session to load the full message history without triggering a new LLM call.
- History is per-organization and tenant-isolated — you only see your own conversations.

---

## Two-Turn LLM Architecture

The chatbot uses a two-step pipeline for accuracy and security:

1. **Turn 1 — Translator:** Converts the natural-language question into a `{ collection, pipeline }` MongoDB aggregation plan.
2. **Turn 2 — Summarizer:** Executes the sanitized pipeline against the database, then summarizes the results into a human-readable answer with optional `chartData`.

---

## Related

- [AI Configuration & BYOK →](./configuration)
- [Flakiness Detective →](./flakiness-detective)
