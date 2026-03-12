---
id: test-optimizer
title: Smart Test Optimizer
sidebar_position: 4
---
 
# Smart Test Optimizer

Convert selected test cases into clean, standardized **BDD (Behavior-Driven Development)** steps — with duplicate detection, edge-case suggestions, and a Dual-Agent validation pass to ensure quality.

> **Requires:** `testOptimizer` feature flag enabled in **Settings → Features**.

---

## BDD Conversion Flow

1. Navigate to **Test Cases**.
2. Select one or more test cases using the checkboxes (up to **20 per batch**).
3. Click **Optimize with AI** in the floating Bulk Actions bar.
4. The optimizer runs a **two-pass pipeline**:

   **Pass 1 — Analyzer (temperature 0.4)**
   - Reads each test case's existing steps
   - Rewrites them in `Given / When / Then` BDD format
   - Identifies exact duplicate step text across cases
   - Proposes additional edge-case scenarios

   **Pass 2 — Critic (temperature 0.0)**
   - Reviews each Analyzer output against the original steps
   - Overrides any suggestion not grounded in the original intent
   - Eliminates hallucinated steps

5. Results are presented in the **Optimized Test Cases** modal:
   - **Left pane:** Original steps
   - **Right pane:** Proposed BDD steps with rationale annotations
   - **Edge Cases panel:** New scenarios recommended by the Analyzer

---

## Accepting Optimizations

| Action | Effect |
|--------|--------|
| **Apply Optimization** | Saves a single case's changes via `PUT /api/test-cases/:id` |
| **Apply All** | Saves all approved optimizations in one action |

You can accept or reject changes on a per-case basis before saving.

---

## Related

- [Test Cases →](../core-features/test-cases)
- [AI Configuration & BYOK →](./configuration)
