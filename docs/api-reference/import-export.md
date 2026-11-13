---
id: import-export
title: Import and export test cases
sidebar_position: 7
---

# Import and export test cases

Move test cases between Agnox, spreadsheets, other test management tools and your Playwright code.

In the dashboard, open **Test Cases**: **Export** offers every format below for the selected rows, else the open folder, else the whole project. **Import** (admins and developers) previews a file before anything is written.

## Export

`POST /api/test-cases/export` (dashboard, returns the file) or `POST /api/v1/test-cases/export` (API key, returns `{ files: [{ path, content }] }`). Every role may export.

```json
{ "projectId": "665f…", "format": "csv", "folderPath": "/root/Login", "ids": ["…"] }
```

| `format` | File | Content |
|---|---|---|
| `json` | `agnox-test-cases.json` | `{ format: "agnox.test-cases", version: 1, exportedAt, testCases: [...] }`. Re-imports losslessly. |
| `csv` | `agnox-test-cases.csv` | `ID, Title, Folder, Description, Preconditions, Steps, Expected Results, Severity, Type, Tags, Kind`. UTF-8 with BOM, CRLF. Steps are numbered lines in one cell; tags are `;`-separated. A cell starting with `=`, `+`, `-` or `@` is prefixed with `'` so spreadsheets do not run it as a formula. |
| `markdown` | `agnox-test-cases.md` | A heading per folder, a heading per case, and a step table |
| `playwright` | `agnox-export.spec.ts` (dashboard), one file per top-level folder (API and CLI) | `test.describe` per folder, one `test()` per manual case with its steps as comments and `test.fixme(...)` so it never passes before it is implemented. Automated cases are skipped (they already have a spec). |

At most 5 000 cases per export; narrow by folder or selection beyond that.

## Import

`POST /api/test-cases/import` (dashboard) or `POST /api/v1/test-cases/import` (API key):

```json
{
  "projectId": "665f…",
  "format": "auto",
  "content": "<file content as text>",
  "filename": "testrail-export.csv",
  "dryRun": true,
  "duplicateStrategy": "skip",
  "targetFolderId": "optional folder to import under"
}
```

### Formats

| `format` | Accepts |
|---|---|
| `auto` | Detects the format below from the content |
| `agnox-json`, `agnox-csv` | Agnox exports |
| `testrail` | TestRail CSV, including "separated steps" exports (one row per step) |
| `qase` | Qase JSON (nested `suites`) or Qase CSV (`suite_id` / `suite_parent_id` hierarchy) |
| `xray` | Xray CSV (`Issue Key`, `Summary`, `Test Repository Path`, one row per step) |
| `zephyr` | Zephyr Scale CSV (`Name`, `Folder`, `Test Script (Step-by-Step) - Step`, one row per step) |
| `generic-csv` | Any CSV with a title column |

Column names are matched case-insensitively. When a field has no column under the vendor's name, these common names are used: title ← `title`, `name`, `summary`; folder ← `folder`, `suite`, `section` (separated by ` / `, `>` or `/`); steps ← `steps`, `action`; expected result ← `expected`, `expected_result`, `expected result`; priority ← `priority`, `severity`; tags ← `tags`, `labels`.

Priorities map to severities: `critical`, `blocker`, `highest`, `p0` → CRITICAL; `high`, `major`, `p1` → HIGH; `medium`, `normal`, `p2` → MEDIUM; `low`, `minor`, `trivial`, `lowest`, `p3` → LOW; anything else → MEDIUM with a warning.

XML exports are not supported: export CSV from TestRail or Zephyr, or JSON from Qase.

### Preview and report

`dryRun: true` parses and validates the file and writes nothing. Both a preview and a real import return:

```json
{
  "format": "testrail", "total": 4, "toCreate": 3, "duplicates": 0, "invalid": 1,
  "foldersToCreate": ["Login", "Login / Happy Path", "Account"],
  "errors": [{ "row": 4, "message": "Title is missing" }],
  "warnings": [],
  "preview": [{ "title": "Valid login", "folderPath": ["Login", "Happy Path"], "steps": [] }],
  "created": 3, "createdFolders": 3
}
```

`created` and `createdFolders` are present only on a real import.

### Rules

- A case is a **duplicate** when the project already has a case with the same title in the same folder. `duplicateStrategy: "skip"` (default) leaves it out; `"create"` imports it again.
- Folders are created top-down. An existing folder with the same parent and name is reused. A `/` in a folder name becomes `-`.
- Cases get consecutive `AG-TC-N` numbers in file order, type MANUAL, and `importSource { format, externalId, importedAt }`.
- A row without a title is reported with its row number and skipped; the rest of the file is imported.

### Limits

| Limit | Value |
|---|---|
| File size | 5 MB |
| Cases per import | 2 000 |
| Steps per case | 200 |
| Folder depth | 10 |
| Title | 500 characters |
| Any other field | 10 000 characters |
| Tags per case | 20 (extra tags are dropped with a warning) |

| Error `code` | When |
|---|---|
| `UNKNOWN_FORMAT` | The format could not be detected, or is not supported (XML) |
| `INVALID_FILE` | The file is not the chosen format, or a CSV quote is never closed |
| `LIMIT_EXCEEDED` | More than 2 000 cases |
| `NOTHING_TO_IMPORT` | No row is a valid test case |
