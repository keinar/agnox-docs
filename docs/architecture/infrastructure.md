---
id: infrastructure
title: Infrastructure Setup
sidebar_position: 3
---

This guide explains how to deploy the **Agnox** on a Linux server (Oracle Cloud / VPS).

---

## 1. Prerequisites

Ensure the following are available before deployment:

- Linux server with SSH access (Oracle Cloud, AWS, VPS, etc.)
- Docker & Docker Compose installed
- MongoDB Atlas connection string
- Open ports for HTTP/HTTPS and RabbitMQ (if external)
- **AI API Key:** At least one LLM API key is recommended for the AI Quality Orchestrator. Supported providers: Google Gemini (`PLATFORM_GEMINI_API_KEY`), OpenAI (`PLATFORM_OPENAI_API_KEY`), Anthropic (`PLATFORM_ANTHROPIC_API_KEY`). Organization-level BYOK keys can override platform defaults at runtime.

---

## 2. Server Configuration (`.env`)

The system now supports dynamic environment mapping and AI integration.

```env
# Database & Queue (PaaS Infrastructure)
PLATFORM_MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/automation_platform
PLATFORM_RABBITMQ_URL=amqp://automation-rabbitmq
PLATFORM_REDIS_URL=redis://automation-redis:6379

# AI Configuration (at least one provider key recommended)
PLATFORM_GEMINI_API_KEY=<REDACTED_GOOGLE_API_KEY>
# PLATFORM_OPENAI_API_KEY=<REDACTED_OPENAI_KEY>
# PLATFORM_ANTHROPIC_API_KEY=<REDACTED_ANTHROPIC_KEY>

# Encryption (CRITICAL — exactly 32 characters / 64 hex chars)
ENCRYPTION_KEY=<64-char-hex-string>

# Auth Secrets
PLATFORM_JWT_SECRET=<REDACTED_JWT_SECRET>
PLATFORM_WORKER_CALLBACK_SECRET=<REDACTED_WORKER_SECRET>
```

---

## 3. The Worker Service Workflow

The Worker is the heart of the execution engine. Here is the updated lifecycle of a test run:

1. **Pull:** Worker pulls the requested Docker image (if not cached).
2. **Run:** Executes the container with the secure `entrypoint.sh`.
3. **Stream:** Logs are streamed in real-time to Redis/MongoDB and the Dashboard.
4. **Completion Check:**
   - ✅ **PASS:** Status updated to `PASSED`.
   - ❌ **FAIL:** Status updated to `ANALYZING`.

5. **AI Analysis (If Failed):**
   - The Worker gathers the failure logs.
   - It sends them to the configured LLM provider (Gemini, GPT-4o, or Claude — resolved via BYOK or platform fallback).
   - Generates a "Root Cause Analysis" and "Suggested Fix" using a dual-agent Analyzer → Critic pipeline.
   - Updates the execution record with the analysis report and records the `aiModel` used as an immutable artifact.
   - Final status set to `FAILED` (or `UNSTABLE`).

---

## 4. Deployment

Build and start the production stack:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Once deployed:

- The **Dashboard** becomes accessible via browser.
- The **Producer** API handles job requests.
- The **Worker** listens for tasks on RabbitMQ.

---

## 5. Troubleshooting

| Issue | Resolution |
| --- | --- |
| **Tests fail instantly** | Verify execution config in **Settings → Run Settings**. |
| **No AI Analysis** | Check if at least one AI provider key is set (`PLATFORM_GEMINI_API_KEY`, `PLATFORM_OPENAI_API_KEY`, or a BYOK key in **Settings → AI Models**). |
| **Container exits immediately** | Check `entrypoint.sh` permissions. |
| **Status stuck on ANALYZING** | Check Worker logs for LLM provider timeouts or invalid API keys. |
| **Producer service refuses to start** | Verify `ENCRYPTION_KEY` (exactly 32 chars / 64 hex), `PLATFORM_JWT_SECRET`, and `PLATFORM_MONGO_URI` are all set. |
