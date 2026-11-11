---
id: test-cases
title: Test Cases (Quality Hub)
sidebar_position: 2
---

# Test Cases (Quality Hub)

The **Quality Hub** is your living manual test repository — a structured library of test cases organized in a **folder hierarchy**, with human-readable IDs, rich metadata, live search and filtering, and built-in AI step generation.

---

## Searching and Filtering

A filter bar appears between the page header and the test case list:

| Control | What it does |
|---------|-------------|
| **Search input** | Case-insensitive live search on test case titles and IDs (350 ms debounce) |
| **Type dropdown** | Filter to `All Types`, `Manual`, or `Automated` |
| **Clear filters** | Resets both controls in one click |

Filter state is reflected in the URL (`?search=login&type=MANUAL`) so filtered views can be bookmarked and shared. Switching project from the global header preserves active filters.

> **Large suites:** the list loads a lightweight view of each test case (no steps or long text) and opens the full record when you select it. Up to 2,000 test cases load at once; beyond that a notice suggests selecting a folder to narrow the list.

---

## Test Case IDs

Every test case is assigned a **human-readable ID** when it is created:

- Format: `AG-TC-{number}` — e.g., `AG-TC-001`, `AG-TC-042`
- Numbers are **auto-incremented per organization** and never reused
- The ID appears on the test case row, the detail view header, and in the URL
- You can search by ID in the filter bar (e.g., type `AG-TC-42`)
- Use IDs when referencing test cases in Jira tickets, Linear issues, or PR reviews — teammates can paste the ID and deep link directly to the case

---

## Folder Management

Test cases are organized in a **nested folder tree** in the left sidebar.

### Creating folders

1. Click the **+** icon next to any folder (or at the root level) to create a subfolder.
2. Enter a folder name, then press Enter.
3. Folders can be nested to any depth — e.g., `Authentication / Login / Happy Path`.

### Moving test cases

- Drag a test case row onto any folder in the sidebar to move it.
- Drag a folder onto another folder to re-nest it.
- Test cases at the root level (no folder) are always visible.

### Renaming and deleting folders

- Right-click a folder in the sidebar to reveal **Rename** and **Delete** options.
- Deleting a folder prompts a confirmation; test cases inside are moved to the root.

---

## Creating a Test Case

1. Navigate to **Test Cases** from the sidebar.
2. Select your **Project** from the dropdown.
3. Click **New Test Case** (or use the **quick-add bar** at the top of the list) to create a case.
4. Fill in:
   - **Title** — e.g., "Login flow with invalid credentials"
   - **Folder** — place the case into a folder from the tree (optional; root if omitted)
   - **Severity** — `CRITICAL` / `HIGH` / `MEDIUM` / `LOW` (default: `MEDIUM`)
   - **Case Type** — `FUNCTIONAL` / `REGRESSION` / `SMOKE` / `PERFORMANCE` / `SECURITY` / `USABILITY` (default: `FUNCTIONAL`)
   - **Tags** — free-form labels, e.g., `login`, `payment`, `mobile`
   - **Steps** — individual test steps with **Action** and **Expected Result**

The **quick-add bar** at the top of the list lets you enter a title and press Enter to create a case instantly, without opening the full detail view.

---

## AI-Powered Step Generation

Skip the manual authoring step — describe your intent and let AI generate structured steps:

1. Open a test case (new or existing) to its **Steps** tab.
2. Click **Generate with AI**.
3. Enter a natural-language description, e.g.: *"Test the checkout flow with a coupon code."*
4. Gemini generates a structured array of test steps automatically.
5. Review and edit the generated steps before saving.

---

## Managing Test Cases

Click any test case row to open its **full-page detail view**. Tabs:

| Tab | Contents |
|-----|----------|
| **Steps** | Editable action/expected-result step list; Generate with AI button |
| **Comments** | Threaded per-test discussion for QA notes and sign-off |
| **History** | Audit trail of every field change with timestamp and author |
| **Details** | Metadata: ID, severity, case type, tags, folder path, creation info |

- **Viewer** role: all create, edit, and delete actions are hidden — read-only access.

### Deleting a Test Case

Open the detail view and click **Delete** in the header actions, or click the trash icon on the list row.

### Folder Deletion

Right-click a folder → **Delete**. An amber confirmation modal appears; cases inside are moved to root rather than deleted.

---

## Reorder Mode

Within a folder, you can manually set the display order of test cases:

1. Click the **Reorder** toggle in the list toolbar.
2. Drag rows by their handle to the desired position.
3. Click **Save Order** — the new order is persisted to the database.

> Reorder Mode is intentionally a separate toggle (not always-on drag) to keep the virtualized list stable during normal browsing.

---

## Deep Linking (URL State)

The Test Cases page URL is fully stateful — every view is shareable:

| URL param | What it encodes |
|-----------|-----------------|
| `?folder=<id>` | Opens the specified folder in the sidebar |
| `&testcase=<id>` | Opens the specified test case detail view |
| `&tab=steps\|comments\|history\|details` | Activates the specified tab |
| `&fullscreen=true` | Opens the detail view in fullscreen mode |

**Example:** `https://app.agnox.dev/test-cases?folder=abc123&testcase=AG-TC-042&tab=history`

Copy a link from the browser address bar at any time and share it — teammates land directly in the same state.

---

## Bulk Actions

Select one or more test cases using the checkboxes (O(1) `Set`-based selection). The floating **Bulk Actions** bar appears with:

- **Optimize with AI** — convert selected cases (up to 20) to BDD format using the [Smart Test Optimizer](../ai-capabilities/test-optimizer)
- **Delete** — remove up to 100 selected test cases in a single operation

> An amber warning modal fires when any **AUTOMATED** test case is included in a bulk delete selection.

---

## AI Spec-to-Test Import

Generate test cases directly from a requirements document:

1. Click **Import from Spec** in the page header *(visible when the `specToTest` AI feature is enabled and you have Developer or Admin role)*.
2. Upload a **PDF**, **DOCX**, or **Markdown** file (max 10 MB).
3. Choose a test style: BDD, Procedural, or TDD.
4. Watch the 4-stage agentic pipeline stream progress in real time.
5. Review the generated test cases, then click **Import N Tests**.

See [Spec-to-Test Generation →](../ai-capabilities/spec-to-test) for full details.

---

## Using Test Cases in Cycles

Test cases are the building blocks for [Test Cycles](./test-cycles). When creating a cycle, you select test cases from the folder-grouped checklist to include as **MANUAL items** in the cycle.

---

## Related

- [Test Cycles →](./test-cycles)
- [Smart Test Optimizer →](../ai-capabilities/test-optimizer)
