---
id: configuration
title: AI Configuration & BYOK
sidebar_position: 1
---

# AI Configuration & BYOK

The AI Quality Orchestrator is a suite of opt-in AI features powered by **your own LLM provider key**. This page explains the BYOK model, how to configure your provider, and how to enable each feature.

> **BYOK-only:** Agnox runs every AI request on **your organization's own API key**. Until an admin saves a key for the active provider in **Settings → AI Models**, all AI features are disabled and their buttons are hidden across the dashboard. There is no platform-provided fallback key.

### Why BYOK?

- **Zero markup** — AI usage is billed by your provider (Google, OpenAI or Anthropic) directly at their prices. Agnox adds no AI surcharge, and AI features are available on **every plan**.
- **Encrypted at rest** — keys are encrypted with **AES-256-GCM** and are never shown again, logged, or returned by the API.
- **Your choice of model** — pick a provider and a model per capability tier: **Fast**, **Balanced**, **Deep reasoning**.

---

## AI Capabilities at a Glance

| Capability | What it does | Docs |
|------------|-------------|------|
| **Root Cause Analysis** | Explains why a run failed, clusters related failures and suggests locator fixes | [Executions →](../core-features/executions) |
| **Auto-Bug Generation** | Drafts a ready-to-file bug report (Jira or Linear) from a failed run | [Auto-Bug →](./auto-bug) |
| **Flakiness Detective** | Scores test stability and diagnoses flaky tests | [Flakiness Detective →](./flakiness-detective) |
| **Smart PR Routing** | Runs only the tests affected by a PR | [Smart PR Routing →](./pr-routing) |
| **Spec-to-Test** | Turns a requirements document into test cases | [Spec-to-Test →](./spec-to-test) |
| **Automation Planner** | Prioritizes manual tests and generates an automation strategy | [Automation Planner →](./automation-planner) |
| **Smart Test Optimizer** | Deduplicates and improves manual test cases | [Test Optimizer →](./test-optimizer) |
| **Quality Chatbot** | Answers questions about your test data in plain language | [Quality Chatbot →](./chatbot) |

---

## Enabling AI Features

All AI features are **off by default** (opt-in model). Enable them individually in **Settings → Features** under the "AI Features" section. A feature is usable only when its flag is on **and** the organization has an API key for its active provider; Settings → Features shows an "AI features are inactive" notice while no key is configured.

| Feature | Feature Flag | Where to Use |
|---------|-------------|--------------|
| Root Cause Analysis | `rootCauseAnalysis` | Execution drawer (failed runs), Failure Clusters on the Stability page |
| Auto-Bug Generator | `autoBugGeneration` | Investigation Hub drawer |
| Flakiness Detective | `flakinessDetective` | Stability page (sidebar) |
| Smart Test Optimizer | `testOptimizer` | Bulk Actions bar in Test Cases |
| Smart PR Routing | `prRouting` | Run Settings toggle |
| Quality Chatbot | `qualityChatbot` | Ask AI (sidebar) |
| Spec-to-Test Generation | `specToTest` | "Import from Spec" button in Test Cases |
| **Automation Planner** | `automationPlanner` | Automation Planner (sidebar) |

---

## Configuring AI — BYOK (Settings → AI Models)

AI features use **your own provider API key (Bring Your Own Key)**. Settings → AI Models is always visible to admins, even while AI is disabled:

1. Go to **Settings → AI Models**.
2. In the **Bring Your Own Key** table, paste the API key for your provider (Google Gemini, OpenAI or Anthropic) and click **Save Key**. Each row shows **"Configured"** (green) or **"Not configured"**.
   - If the active provider has no key yet, saving a key for another provider **switches the active provider to it**, so one step enables AI.
   - AI entry points (Ask AI, Automation Planner, drawer AI actions, AI test generation, stability analysis) appear immediately — no reload needed.
3. Optionally choose the **AI Provider** and a model per **tier**:
   - **Fast** — PR test routing, log triage, chat queries
   - **Balanced** — failure analysis, flaky-test diagnosis, test generation
   - **Deep reasoning** — automation planning, multi-failure correlation

   Your key unlocks **every tier of its provider, including Deep reasoning, on every plan**. The model list shows the models currently supported for your provider.
4. To rotate a key, paste a new one; to remove it, click **Remove**. Removing the key of the active provider disables AI features again.

When no key is configured, AI endpoints answer **`403`** with `{ success: false, code: "AI_NOT_CONFIGURED" }`, and **Smart PR Routing** simply runs all tests without calling a model. Read-only AI views (report history, failure cluster counts, chat history) stay available.

### BYOK Provider Reference

| Setting | Options | Description |
|---------|---------|-------------|
| **AI Provider** | Gemini, OpenAI, Anthropic | The provider every AI call goes to (needs a key) |
| **Tier models** | Registry models of the provider | Per-tier override of the default model (Fast / Balanced / Deep) |
| **Cross-provider fallback** | On / Off | When on, a failing call may retry on another provider **you have a key for** |
| **BYOK — Gemini** | Required to use Gemini | Your Google AI Studio or Vertex AI key |
| **BYOK — OpenAI** | Required to use OpenAI | Your OpenAI API key |
| **BYOK — Anthropic** | Required to use Anthropic | Your Anthropic Console key |

> **Security:** Keys are encrypted at rest using **AES-256-GCM** before they are stored. Plaintext keys are never stored, logged, or returned by any API response — the API only reports whether a key exists. A key is decrypted only at the moment of an AI call made on your behalf.

---

## Dual-Agent (Actor-Critic) Architecture

Several AI features use a **Dual-Agent pipeline** to deliver high-quality, hallucination-resistant output:

```
┌──────────────────────────────────────────────────────────────────┐
│  STEP 1: Analyzer (Actor)                                        │
│  Temperature: 0.4  — creative, generates suggestions             │
│  Output: Structured JSON                                         │
└───────────────────────────┬──────────────────────────────────────┘
                            │ structured output
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 2: Critic (Evaluator)                                      │
│  Temperature: 0.0  — deterministic, no creativity               │
│  Input: Raw evidence + Analyzer output                           │
│  Task: Validate every claim. Override hallucinated suggestions.  │
│  Output: Final developer-facing Markdown                         │
└──────────────────────────────────────────────────────────────────┘
```

**Why two passes?**
- The Analyzer (0.4 temperature) generates creative, detailed suggestions but can occasionally hallucinate file names or APIs not present in the logs.
- The Critic (0.0 temperature, fully deterministic) cross-checks every claim against raw evidence. Any suggestion not grounded in the provided data is overridden before it reaches you.
- This pattern prevents the most common failure mode of single-pass LLM analysis: confident but wrong answers.

Features using this pattern: **Root Cause Analysis**, **Auto-Bug Generator**, **Smart Test Optimizer**, **Spec-to-Test Generation** (4-stage pipeline).

The **Automation Planner** uses a different two-stage architecture: Stage 1 sends only metadata (titles, suites, tags) for risk stratification; Stage 2 sends full step data only for the tests the user explicitly selected. This bounds token cost regardless of corpus size.

---

## Related

- [Auto-Bug Generator →](./auto-bug)
- [Flakiness Detective →](./flakiness-detective)
- [Smart Test Optimizer →](./test-optimizer)
- [Smart PR Routing →](./pr-routing)
- [Quality Chatbot →](./chatbot)
- [Spec-to-Test Generation →](./spec-to-test)
- [Automation Planner →](./automation-planner)
