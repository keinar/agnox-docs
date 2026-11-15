---
id: migrate-test-cases
title: Migrate & Export Test Cases
sidebar_position: 6
---

# Migrate & Export Test Cases

Bring your manual test cases into Agnox from **Qase**, **TestRail**, **Xray**, **Zephyr Scale** or any CSV, and turn them into ready-to-implement **Playwright `.spec.ts` skeletons**.

This page is the step-by-step guide. For every field, limit and error code, see the [Import and export reference](../api-reference/import-export.md).

---

## How a migration works

1. **Export** the test cases from your current tool as CSV (or JSON for Qase).
2. **Preview** the file in Agnox. The preview is a dry run: it shows the detected format, how many cases and folders it will create, duplicates, and any row errors. Nothing is written yet.
3. **Import.** Agnox recreates your folder tree, gives each case an `AG-TC-N` id, and records where it came from (`importSource`: format, original id, import time).

Who can do it: **Admins and Developers** can import. Every role can export.

## Import from the dashboard

1. Open **Test Cases** and select the project.
2. Click **Import**. The **Import test cases** dialog opens.
3. Choose your file. Leave **Format** on **Detect automatically**, or pick one: *TestRail CSV*, *Qase JSON or CSV*, *Xray CSV*, *Zephyr Scale CSV*, *Other CSV (Title, Steps, …)*, *Agnox JSON* or *Agnox CSV*.
4. Choose what happens to cases that already exist with the same title in the same folder: **Skip them** (recommended for re-runs) or **Import them again**.
5. Click **Preview** and review the counts, the folders to be created, the first cases, and any row errors.
6. Click **Import**.

A row without a title is reported with its row number and skipped, and the rest of the file is still imported. Fix the reported rows and import the file again with **Skip them**, so only the missing cases are added.

---

## Exporting from your current tool

Agnox detects the format from the file's header row, so export with the tool's default columns. XML exports are not supported: use CSV, or JSON for Qase.

### TestRail

Export a CSV from the test suite or project. Both layouts are supported:

- one row per case, with steps in a single cell
- **separated steps**: one row per step

| Agnox field | TestRail column |
|---|---|
| Title | `Title` |
| Folder | `Section Hierarchy` (preferred) or `Section` |
| Description | `Description` or `Goals` |
| Preconditions | `Preconditions` |
| Steps / expected results | `Steps (Step)` + `Steps (Expected Result)`, or `Steps` + `Expected Result` |
| Severity | `Priority` |
| Tags | `Refs` or `References` |
| Original id | `ID` |

Detected by: a `Section` or `Section Hierarchy` column.

### Qase

Export the project as **JSON** (recommended, because it keeps the nested `suites` tree) or **CSV**.

| Agnox field | Qase field |
|---|---|
| Title | `title` |
| Folder | the suite tree: nested `suites` in JSON, or `suite_id` / `suite_parent_id` in CSV |
| Description | `description` |
| Preconditions | `preconditions` |
| Steps / expected results | `steps_actions` + `steps_result` |
| Severity | `severity`, then `priority` |
| Tags | `tags` |
| Original id | `id` |

Detected by: a top-level `suites` array (JSON), or `suite`/`suite_id` + `title` columns (CSV). Qase's `severity` is read before `priority`, because only severity carries *blocker* and *critical*.

### Xray (Jira)

Export the tests to CSV with one row per step.

| Agnox field | Xray column |
|---|---|
| Title | `Summary` |
| Folder | `Test Repository Path` (preferred) or `Test Set` |
| Description | `Description` |
| Preconditions | `Precondition` or `Pre-Condition` |
| Steps / expected results | `Action` (or `Step`) + `Expected Result` |
| Severity | `Priority` |
| Tags | `Labels` |
| Original id | `Issue Key` or `TCID` |

Detected by: an `Issue Key` or `Test Type` column, together with `Summary`.

### Zephyr Scale

Export the test cases to CSV with step-by-step test scripts.

| Agnox field | Zephyr Scale column |
|---|---|
| Title | `Name` |
| Folder | `Folder` |
| Description | `Objective` |
| Preconditions | `Precondition` |
| Steps / expected results | `Test Script (Step-by-Step) - Step` + `Test Script (Step-by-Step) - Expected Result` |
| Severity | `Priority` |
| Tags | `Labels` |
| Original id | `Key` |

Detected by: a `Name` column, together with `Folder` or `Test Script (Step-by-Step) - Step`.

### Any other tool, or a spreadsheet

Save the sheet as CSV with a header row. Only a title column is required. Column names are matched case-insensitively:

| Agnox field | Accepted column names |
|---|---|
| Title (required) | `title`, `name`, `summary` |
| Folder | `folder`, `suite`, `section`. Nest with ` / `, `>` or `/`, for example `Checkout / Payments` |
| Steps | `steps`, `action` |
| Expected result | `expected`, `expected_result`, `expected result` |
| Severity | `priority`, `severity` |
| Tags | `tags`, `labels` (separated by `;` or `,`) |

```csv
Title,Folder,Steps,Expected,Priority,Tags
Valid login,Login / Happy Path,"1. Open /login
2. Enter valid credentials
3. Submit",Dashboard is shown,High,smoke;auth
Wrong password,Login,"1. Open /login
2. Enter a wrong password",An error is shown,Medium,auth
```

### Priority mapping

| Your value | Agnox severity |
|---|---|
| `critical`, `blocker`, `highest`, `p0` | CRITICAL |
| `high`, `major`, `p1` | HIGH |
| `medium`, `normal`, `p2` | MEDIUM |
| `low`, `minor`, `trivial`, `lowest`, `p3` | LOW |
| anything else | MEDIUM, with a warning in the preview |

---

## Import with the API

Automate a migration with an API key and [`POST /api/v1/test-cases/import`](../api-reference/public-api-v1.md). Send a dry run first, then the real import:

```bash
# Build the request body from the export file
jq -n --rawfile content testrail-export.csv \
  '{projectId: "665f…", format: "auto", filename: "testrail-export.csv",
    content: $content, dryRun: true, duplicateStrategy: "skip"}' > import.json

# 1. Preview: parses and validates, writes nothing
curl -s -X POST https://api.agnox.dev/api/v1/test-cases/import \
  -H "x-api-key: $AGNOX_API_KEY" -H "content-type: application/json" \
  --data @import.json | jq '.data | {format, total, toCreate, duplicates, invalid, errors}'

# 2. Import for real
jq '.dryRun = false' import.json | curl -s -X POST https://api.agnox.dev/api/v1/test-cases/import \
  -H "x-api-key: $AGNOX_API_KEY" -H "content-type: application/json" \
  --data @- | jq '.data | {created, createdFolders}'
```

Limits per import: 5 MB file, 2,000 cases, 200 steps per case, folder depth 10. Split larger exports by folder or suite.

---

## Export manual cases as Playwright skeletons

Once your manual cases are in Agnox, generate Playwright specs for them so automation starts from the agreed steps instead of a blank file.

### From the dashboard

**Test Cases → Export → Playwright spec** downloads `agnox-export.spec.ts`. It exports the selected rows, else the open folder, else the whole project.

### From the terminal

The [`agnox` CLI](../developer-tools/cli.md) writes one spec per top-level folder straight into your repository:

```bash
export AGNOX_API_KEY="<your key>"
npx -p @agnox/mcp-server agnox export-specs --out tests/generated --project <project id>
# wrote tests/generated/checkout.spec.ts
# wrote tests/generated/login.spec.ts
# Exported 2 spec files to tests/generated
```

Add `--folder /Checkout` to export one folder. Existing files are never overwritten unless you pass `--force`.

### What you get

```ts
// Generated by Agnox from manual test cases. Each test is marked fixme until implemented.
import { test } from '@playwright/test';

test.describe("Checkout", () => {
    test.describe("Payments", () => {
        test("C1042: Pays with a saved card", { tag: ['@smoke'] }, async () => {
            test.fixme(true, "Generated from C1042: implement the steps below");
            // Step 1: Open the cart with one item
            // Expected: The cart total is shown
            // Step 2: Pay with the saved card
            // Expected: The order confirmation page is shown
        });
    });
});
```

- **Folders** become nested `test.describe` blocks.
- **Each manual case** becomes a `test()` named after its original id and title, with its tags as Playwright tags.
- **Steps and expected results** become comments, in order.
- **`test.fixme(...)`** marks every test as not implemented yet, so a skeleton never passes, and never fails your suite, before someone writes it.
- **Automated cases are skipped**, because they already have a spec. The file header says how many were skipped.

### Close the loop

After you implement a skeleton, register it as an automated test case, so Agnox tracks its stability and you can quarantine it:

- run it once with the [Playwright reporter](../integrations/playwright-reporter.md), or
- ask your assistant to call `sync_test_cases` through the [MCP server](../developer-tools/mcp-server.md), or call `POST /api/v1/test-cases/sync` directly.

---

## Export to other formats

**Test Cases → Export** also offers:

| Format | Use it for |
|---|---|
| **JSON** | A full Agnox bundle. Re-imports losslessly, for backups or moving cases between projects. |
| **CSV** | Spreadsheets and other test management tools. Formula-like cells are escaped. |
| **Markdown** | A readable document, with a heading per folder and a step table per case |

The format details are in the [Import and export reference](../api-reference/import-export.md#export).
