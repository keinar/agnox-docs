---
id: phase-7-rag-roadmap
title: "Phase 7: RAG-Powered Automation Guidelines — Technical Roadmap"
sidebar_position: 21
---

> **Status:** 🗺️ Planned (Target: v4.0.0)
> **Author:** Principal Staff Engineering / Product
> **Date:** 2026-03-17
> **Prerequisite Feature:** `automationGuidelines` text field on `IProject` (shipped in v3.24.0)
> **Feature Flag (planned):** `aiFeatures.ragGuidelines`

---

## 1. Executive Summary

Phase 7 upgrades the **Automation Guidelines** feature from a simple text-injection mechanism (the current `automationGuidelines` string prepended to LLM system prompts) into a full **Retrieval-Augmented Generation (RAG)** knowledge base.

Instead of sending the entire guidelines blob to every prompt, the system will:

1. Accept uploaded documents (PDF, Markdown, DOCX) from the user.
2. Chunk and embed them using the **tenant's own configured AI provider and BYOK key** (zero cost to Agnox).
3. Store the resulting vector embeddings in **MongoDB Atlas Vector Search**.
4. At inference time, perform a **similarity search** against the current test context to retrieve only the relevant guideline chunks.
5. Inject those chunks into the AI prompt as a tight, targeted context window.

This approach scales to large codebases and complex style guides (100+ pages) without hitting token limits or degrading generation quality.

---

## 2. Core Architectural Constraint: Strict BYOK Embeddings

> **This is a non-negotiable cost and trust boundary.**

Agnox will **never absorb LLM embedding costs** for tenant documents. The embedding step (converting document chunks into vector representations) must use the **tenant's own API key** for their configured provider:

| Tenant's Default Model | Embedding Call |
|---|---|
| Any OpenAI model (`gpt-4o`, `gpt-4o-mini`) | `openai.embeddings.create({ model: 'text-embedding-3-small', input: chunk })` using **tenant's OpenAI BYOK key** |
| Any Anthropic model (`claude-3-5-sonnet`, `claude-3-5-haiku-latest`) | Google `text-embedding-004` via **tenant's Gemini BYOK key** (Anthropic has no embedding API — fallback to Gemini or require a secondary key) |
| Any Gemini model (`gemini-2.5-flash`, `gemini-1.5-pro`) | `generativeai.embedContent({ model: 'text-embedding-004', content: chunk })` using **tenant's Gemini BYOK key** |

**Enforcement rule:** The embedding route must call `resolveLlmConfig()` to obtain the tenant's key before invoking any embedding API. If the tenant has no BYOK key configured, the upload endpoint returns a `402 Payment Required` with a clear message directing them to the AI Models settings tab.

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Document Ingestion Pipeline                                                │
│                                                                             │
│  User uploads PDF/MD/DOCX                                                  │
│        │                                                                    │
│        ▼                                                                    │
│  [producer-service] POST /api/projects/:id/guidelines/upload               │
│        │                                                                    │
│        ▼                                                                    │
│  1. Parse & Extract Text                                                    │
│     • PDF  → pdf-parse / pdfjs-dist (existing dep from spec-to-test)       │
│     • DOCX → mammoth                                                        │
│     • MD   → raw text (no parser needed)                                   │
│        │                                                                    │
│        ▼                                                                    │
│  2. Chunking                                                                │
│     • Strategy: Recursive character splitter                               │
│     • Chunk size: 512 tokens (~1,800 chars)                                │
│     • Overlap: 64 tokens to preserve cross-chunk context                   │
│     • Each chunk tagged: { projectId, orgId, documentId, chunkIndex }     │
│        │                                                                    │
│        ▼                                                                    │
│  3. BYOK Embedding (tenant's key — see Section 2)                          │
│     • Batched: up to 100 chunks per API call                               │
│     • On error: mark document as FAILED, surface error to UI               │
│        │                                                                    │
│        ▼                                                                    │
│  4. Store in MongoDB Atlas Vector Search                                    │
│     • Collection: `guideline_chunks`                                       │
│     • Fields: { _id, orgId, projectId, documentId, chunkIndex,            │
│                 text, embedding: number[1536], createdAt }                 │
│     • Index: Atlas Search vector index (cosine similarity, 1536 dims)      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  Inference / Retrieval Pipeline                                             │
│                                                                             │
│  AI Feature triggered (Automation Planner, Test Optimizer, etc.)           │
│        │                                                                    │
│        ▼                                                                    │
│  1. Build Query Context                                                     │
│     • Derive a semantic query from the current task context:               │
│       e.g. "Playwright test for login with data-testid selectors"          │
│        │                                                                    │
│        ▼                                                                    │
│  2. Embed the Query (BYOK — same tenant key)                               │
│        │                                                                    │
│        ▼                                                                    │
│  3. Atlas Vector Search ($vectorSearch aggregation stage)                  │
│     • Filter: { orgId, projectId }  ← tenant isolation enforced here      │
│     • Top-K: 5 most similar chunks                                         │
│     • Score threshold: 0.75 (discard irrelevant docs)                      │
│        │                                                                    │
│        ▼                                                                    │
│  4. Augment System Prompt                                                  │
│     • Inject retrieved chunks under a "## Team Guidelines" section         │
│     • Total injected budget: max 2,000 tokens (trim if exceeded)           │
│        │                                                                    │
│        ▼                                                                    │
│  5. LLM Generation (existing callLlmText() in ai.ts)                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Model

### `guideline_documents` collection
Tracks each uploaded file and its processing status.

```typescript
interface IGuidelineDocument {
    _id: ObjectId;
    organizationId: string;        // tenant isolation
    projectId: string;
    fileName: string;
    mimeType: 'application/pdf' | 'text/markdown' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    status: 'PROCESSING' | 'READY' | 'FAILED';
    chunkCount?: number;
    errorMessage?: string;
    uploadedBy: string;            // userId
    createdAt: Date;
    updatedAt: Date;
}
```

### `guideline_chunks` collection
Stores the embedded text chunks. Requires an Atlas Vector Search index on the `embedding` field.

```typescript
interface IGuidelineChunk {
    _id: ObjectId;
    organizationId: string;        // tenant isolation (also in vector filter)
    projectId: string;
    documentId: ObjectId;          // FK → guideline_documents
    chunkIndex: number;
    text: string;                  // raw text of this chunk (returned in retrieval for prompt injection)
    embedding: number[];           // 1536-dim vector (text-embedding-3-small / text-embedding-004)
    createdAt: Date;
}
```

### Atlas Vector Search Index definition
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "organizationId"
    },
    {
      "type": "filter",
      "path": "projectId"
    }
  ]
}
```

---

## 5. New API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/projects/:id/guidelines/upload` | Upload a document; triggers async chunking + embedding pipeline |
| `GET` | `/api/projects/:id/guidelines` | List all uploaded documents and their processing status |
| `DELETE` | `/api/projects/:id/guidelines/:documentId` | Delete a document and all its chunks |

All endpoints are JWT-authenticated and admin-only (matches pattern of other project-mutation routes).

---

## 6. Migration

**Migration 016** (`016-add-rag-guidelines.ts`) must:
1. Create the `guideline_documents` collection with a TTL-less setup (documents persist until explicitly deleted).
2. Create a compound index `{ organizationId: 1, projectId: 1 }` on `guideline_documents`.
3. Create a compound index `{ organizationId: 1, projectId: 1, documentId: 1 }` on `guideline_chunks`.
4. Document the required Atlas Vector Search index that must be created **manually** via the Atlas UI or `mongocli` (driver-level index creation for vector indexes is not supported in the native driver at time of writing).
5. Add `ragGuidelines: false` to the `aiFeatures` object for all existing org documents (backfill).

---

## 7. Embedding Provider Strategy & Dimension Compatibility

All embedding models below produce **1536-dimensional** vectors, ensuring a single Atlas vector index serves all providers:

| Provider | Recommended Model | Dimensions | Notes |
|---|---|---|---|
| OpenAI | `text-embedding-3-small` | 1536 | Cheapest, state-of-the-art for retrieval |
| Google | `text-embedding-004` | 768 → padded to 1536 | Must zero-pad; or use `text-embedding-004` with `outputDimensionality: 1536` if supported |
| Anthropic | N/A — no embedding API | — | Require tenant to also configure a Gemini BYOK key, or use OpenAI's `text-embedding-3-small` as a secondary option |

> **Decision needed before implementation:** confirm whether Google's `text-embedding-004` supports `outputDimensionality: 1536`. If not, use 768 dims and create a separate Atlas index for Gemini tenants, or mandate OpenAI for embeddings regardless of generation provider.

---

## 8. Graceful Fallback Chain

If no guideline documents exist for a project, or the vector search returns no results above the 0.75 threshold, the system falls back gracefully to the **existing `automationGuidelines` text field** (the current Phase 6 implementation). This ensures zero regression for existing users.

```
RAG chunks found? → Inject top-K chunks into prompt
       ↓ NO
automationGuidelines text set? → Inject full text (existing behaviour)
       ↓ NO
No guidelines → proceed with standard system prompt
```

---

## 9. UI Changes Required

- **Settings → Run Settings tab:** Replace the plain `<textarea>` for "Team Coding Conventions" with a two-panel UI:
  - Left: existing text textarea (quick, inline guidelines — preserved for backward compat).
  - Right: "Knowledge Base" — file drop zone for PDF/MD/DOCX uploads; list of uploaded docs with status badges (`PROCESSING`, `READY`, `FAILED`) and delete buttons.
- **BYOK gate:** If no BYOK key is configured for any provider, the file upload zone is disabled with an inline callout linking to Settings → AI Models.

---

## 10. Phase Delivery Plan

| Phase | Deliverable | Target |
|---|---|---|
| 7.1 | Migration 016, `guideline_documents` + `guideline_chunks` schema, upload/delete API endpoints, parsing + chunking + BYOK embedding pipeline | Sprint 1 |
| 7.2 | Atlas Vector Search index setup guide, retrieval integration into `callLlmText()` system prompt builder, fallback chain | Sprint 2 |
| 7.3 | UI — file upload panel in RunSettingsTab, document status polling, BYOK gate callout | Sprint 3 |
| 7.4 | E2E tests, load testing (large PDF with 500+ chunks), cost estimation dashboard entry | Sprint 4 |
