---
id: auto-bug
title: Auto-Bug Generator
sidebar_position: 2
---
 
# Auto-Bug Generator

Automatically generate a structured, Jira-ready bug report from a failed execution's logs — with a single click.

> **Requires:** `autoBugGeneration` feature flag enabled in **Settings → Features**.

---

## How It Works

1. Open any **FAILED** or **ERROR** execution in the Investigation Hub drawer.
2. Click **Auto Bug** (Sparkles icon) at the top of the drawer.
3. Agnox fetches the execution's full log output. If the output exceeds 80,000 characters, it is **smart-truncated**:
   - **First 10%** (container start-up context) — preserved
   - **Last 90%** (where errors concentrate) — preserved
   - A `[LOG TRUNCATED]` marker is inserted so you always know where the crop occurred
4. The AI analyses the truncated log and generates a structured report:
   - **Title** — concise bug title
   - **Steps to Reproduce** — ordered list
   - **Expected Behavior** and **Actual Behavior**
   - **Severity** — `critical` / `high` / `medium` / `low`
   - **Code Patches** — file path + suggested fix snippet (where detectable)
5. Review and edit any field in the **Auto Bug** modal before submitting.
6. Click **Submit to Jira** to pre-fill the Jira ticket creation modal with the finalized content.

---

## AI Pipeline

The Auto-Bug Generator uses the [Dual-Agent (Actor-Critic) architecture](./configuration#dual-agent-actor-critic-architecture):

1. **Analyzer** (temperature 0.4) — reads the logs and generates the initial structured report
2. **Critic** (temperature 0.0) — validates every field against the raw log evidence; overrides any hallucinated file paths or unsupported claims

---

## Related

- [AI Configuration & BYOK →](./configuration)
- [Flakiness Detective →](./flakiness-detective)
