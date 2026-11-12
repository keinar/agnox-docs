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
3. The AI translates your question into a read-only database query and executes it securely against your organization's data.
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

### Layers 1–5 — Query Sanitizer

Every AI-generated query passes through a mandatory **5-layer guard** before execution:

| Layer | What it does |
|-------|--------------|
| **1. Read-only operations** | Only read/aggregate operations are allowed — any write, merge or code-execution operation is rejected. |
| **2. Forced tenant scope** | Your organization's ID is always injected by the server — the AI output cannot read another organization's data. |
| **3. Result cap** | Results are capped at 1,000 rows. |
| **4. Data allowlist** | Only executions and test cycles can be queried — never users, organizations, or credentials. |
| **5. Operator scan** | Every query value is scanned recursively for disallowed operators. |

Any violation rejects the request with `400`. Only the sanitized query — never the raw AI output — is executed.

---

## Conversation History

- Past sessions appear in the **left panel**, sorted by most recent.
- Click any session to load the full message history without triggering a new LLM call.
- History is per-organization and tenant-isolated — you only see your own conversations.

---

## Two-Turn LLM Architecture

The chatbot uses a two-step pipeline for accuracy and security:

1. **Turn 1 — Translator:** Converts the natural-language question into a structured read-only query.
2. **Turn 2 — Summarizer:** Executes the sanitized query, then summarizes the results into a human-readable answer with optional `chartData`.

---

## Related

- [AI Configuration & BYOK →](./configuration)
- [Flakiness Detective →](./flakiness-detective)
