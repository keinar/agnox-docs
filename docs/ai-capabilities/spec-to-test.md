---
id: spec-to-test
title: Spec-to-Test Generation
sidebar_position: 6
---

# Spec-to-Test Generation

Upload a product requirements document (PRD), specification, or design brief and let Agnox automatically generate a structured library of draft test cases — ready to review, edit, and import into your suite.

---

## Overview

**Spec-to-Test** (Feature F) reads a PDF, DOCX, or Markdown file and runs a 4-stage agentic pipeline that converts raw requirements into `ITestCase`-compatible records. The entire pipeline streams progress in real time via **Server-Sent Events (SSE)**, so you see each stage complete before the next begins.

---

## Prerequisites

- The `specToTest` feature flag must be enabled in **Settings → Features → AI Features**.
- You must have a **Developer** or **Admin** role (Viewers cannot create test cases).
- An active project must be selected in the global Project Selector.

---

## Supported File Formats

| Format | Extension | Parser |
|--------|-----------|--------|
| PDF | `.pdf` | `pdf-parse` (text extraction) |
| Word Document | `.docx` | `mammoth` (raw text extraction) |
| Markdown / plain text | `.md`, `.txt` | Native string |

**Maximum file size:** 10 MB

---

## How to Use

1. Navigate to **Test Cases** from the sidebar.
2. Click **Import from Spec** (emerald button in the page header).
3. The **Spec-to-Test Wizard** opens — 3 steps:

### Step 1 — Upload & Style

- Drag and drop your file or click to browse.
- Choose a **Test Style**:

| Style | Description |
|-------|-------------|
| **BDD (Gherkin)** | Steps written as Given / When / Then |
| **Procedural** | Numbered action → expected result steps |
| **TDD** | Focused on unit-level assertions |

- Click **Generate Tests** to start the pipeline.

### Step 2 — Live Pipeline Progress

The 4-stage pipeline runs and streams progress to your browser:

| Stage | Label | What Happens |
|-------|-------|-------------|
| 1 | Reading document… | File text extracted; requirements structured into `IRequirementBlock[]` by the Extractor LLM |
| 2 | Generating test drafts… | Generator LLM drafts `IDraftTestCase[]` per requirement in the selected style |
| 3 | Reviewing for accuracy… | Critic LLM deduplicates against existing tests in the project (via MongoDB `$text` search) and removes hallucinated or vague steps |
| 4 | Formatting test cases… | Approved drafts are transformed into the canonical `ITestCase` shape |

Each stage shows a progress indicator — `Loader2` spinner transitions to `CheckCircle2` on completion.

### Step 3 — Review & Import

- A stats bar shows: **Generated**, **Filtered Out**, and **Ready to Import** counts.
- Tests are grouped by **suite** (accordion). Expand any suite to preview individual steps.
- A collapsed **Filtered Out** section lists dropped tests with the Critic's drop reason.
- Click **Import N Tests** to batch-insert all approved cases into your project's Test Cases.

> Import is performed in chunks of 50 tests via `POST /api/test-cases/bulk`. Large spec documents are handled automatically.

---

## API Reference

| Method | Path | Auth | Feature Flag | Description |
|--------|------|------|-------------|-------------|
| POST | `/api/ai/spec-to-tests` | JWT | `specToTest` | Multipart upload. Fields: `file` (binary), `projectId` (string), `testStyle` (`bdd` \| `procedural` \| `tdd`). Returns an SSE stream. |

### SSE Event Shape

```
event: progress
data: { "stage": 1, "label": "Extracting requirements…", "count": 12 }

event: progress
data: { "stage": 3, "label": "Reviewing for accuracy…", "count": 8 }

event: complete
data: { "generated": [...ITestCase], "dropped": [...{ title, reason }] }

event: error
data: { "message": "Stage 2 (Generator) returned invalid JSON. Please retry." }
```

The connection uses `reply.hijack()` to bypass Fastify's response lifecycle and stream directly, avoiding proxy timeout issues on long-running pipelines.

---

## Deduplication Logic

Stage 3 (Critic) performs a two-layer deduplication before the LLM review:

1. **Suite-scoped pre-filter:** Fetches existing test case titles for the target suites in the project via a MongoDB query.
2. **`$text` search:** For new suites, runs a full-text search on `test_cases.title` (text index created in Migration 011).

The LLM Critic then receives both the draft cases and the pre-filtered existing titles, and is instructed to drop any draft that is a duplicate, hallucinated, or untestable.

---

## Troubleshooting

| Issue | Likely Cause |
|-------|-------------|
| "Import from Spec" button not visible | `specToTest` feature flag is off, or you have Viewer role |
| Stage 1 returns 0 requirements | Document text could not be parsed — ensure the file is not scanned/image-only |
| Stage 3 `$text` search failed warning | Migration 011 has not been run — apply `npx tsx migrations/011-add-spec-to-test-flag.ts` |
| All tests dropped by Critic | Most drafts were duplicates of existing test cases in the project |

---

## Related

- [AI Configuration & BYOK →](./configuration)
- [Test Cases →](../core-features/test-cases)
- [Smart Test Optimizer →](./test-optimizer)
