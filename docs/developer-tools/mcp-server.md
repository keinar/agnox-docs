---
id: mcp-server
title: MCP Server
sidebar_position: 1
---

# Agnox MCP Server

`@agnox/mcp-server` connects Agnox to AI coding assistants over the [Model Context Protocol](https://modelcontextprotocol.io). With it, Claude Code, Cursor, Claude Desktop or Windsurf can:

- read why a run failed, including the page URL, console and network errors, test ids and a DOM snapshot captured at the moment of failure
- fix a broken locator using that context
- find flaky tests and quarantine or release them
- register the tests in your repository as Agnox test cases

The server talks only to the [Public API v1](../api-reference/public-api-v1.md). It has no runtime dependencies and needs **Node.js 20 or later**. The same package also ships the [`agnox` CLI](./cli.md).

---

## Before you start

1. **Create an API key** in **Settings → My Profile → API keys**. The key acts with your role in your organization: a Viewer key can only read, while a Developer or Admin key can also quarantine tests and sync test cases.
2. **Find your project id** (optional but recommended). It sets the default project for every tool, so you don't have to name it in each prompt.

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `AGNOX_API_KEY` | **Yes** | | Your API key. Sent only in the `x-api-key` header; never printed, logged or included in an error message. |
| `AGNOX_API_URL` | No | `https://api.agnox.dev` | The Agnox API, for a self-hosted install. Must be `https://`; plain `http://` is accepted only for `localhost`, `127.0.0.1` and `[::1]`. No credentials, query or fragment. Redirects are never followed, so the key cannot leak to another host. |
| `AGNOX_PROJECT_ID` | No | | Default project for tools that take a `projectId` |

The server also reads these from a `.env` file in its working directory, and from credentials saved with [`agnox login`](./cli.md#log-in-once), using the same rules as the CLI. Variables in the `env` block always win.

> **Keep keys out of git.** If you commit an MCP config file, reference the key through an environment variable (Claude Code expands `${AGNOX_API_KEY}` in `.mcp.json`). Otherwise keep the file in your user-level config.

---

## Quickstart

### Claude Code

Add the server with one command:

```bash
claude mcp add agnox \
  -e AGNOX_API_KEY=<your key> \
  -e AGNOX_PROJECT_ID=<project id> \
  -- npx -y @agnox/mcp-server
```

To share the setup with your team, commit a project-scoped `.mcp.json` at the repository root. Each developer then supplies their own key through their environment:

```json
{
  "mcpServers": {
    "agnox": {
      "command": "npx",
      "args": ["-y", "@agnox/mcp-server"],
      "env": {
        "AGNOX_API_URL": "https://api.agnox.dev",
        "AGNOX_API_KEY": "${AGNOX_API_KEY}",
        "AGNOX_PROJECT_ID": "<project id>"
      }
    }
  }
}
```

Run `/mcp` inside Claude Code to confirm that `agnox` is connected and its six tools are listed.

### Cursor

Create `.cursor/mcp.json` in the project, or `~/.cursor/mcp.json` to enable it for every project:

```json
{
  "mcpServers": {
    "agnox": {
      "command": "npx",
      "args": ["-y", "@agnox/mcp-server"],
      "env": {
        "AGNOX_API_URL": "https://api.agnox.dev",
        "AGNOX_API_KEY": "<your key>",
        "AGNOX_PROJECT_ID": "<project id>"
      }
    }
  }
}
```

Then open **Cursor Settings → MCP** and check that `agnox` shows a green status.

### Claude Desktop

Open **Settings → Developer → Edit Config**, or edit the file directly:

| OS | Config file |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

Add the server under `mcpServers`, then restart Claude Desktop:

```json
{
  "mcpServers": {
    "agnox": {
      "command": "npx",
      "args": ["-y", "@agnox/mcp-server"],
      "env": {
        "AGNOX_API_KEY": "<your key>",
        "AGNOX_PROJECT_ID": "<project id>"
      }
    }
  }
}
```

### Windsurf

Use the same `mcpServers` block in `~/.codeium/windsurf/mcp_config.json`.

> **Windows:** if your client cannot start `npx` directly, use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "@agnox/mcp-server"]`.

> **Already installed the CLI?** `agnox mcp` starts the same server, so `"command": "agnox", "args": ["mcp"]` works too.

---

## Tools

| Tool | Access | What it does | Arguments |
|---|---|---|---|
| `list_recent_executions` | Read | Recent runs, newest first, with status and passed/failed counts. Use it to find the `taskId` of a failed run. | `projectId?`, `status?` (comma-separated: `PENDING`, `RUNNING`, `PASSED`, `FAILED`, `ERROR`, `UNSTABLE`), `limit?` (1–25, default 10) |
| `get_execution_failures` | Read | The failed tests of one run: name, spec file, error, failure signature, test key, linked test case, and the page context at failure (URL, title, console and network errors, test ids, DOM snapshot). | `taskId` (required) |
| `list_failure_clusters` | Read | The most frequent failure signatures across recent runs: how many runs and tests each one hit, plus a sample error. Tells one systemic problem apart from many separate bugs. Needs the Root Cause Analysis feature. | `projectId?`, `days?` (1–30, default 14) |
| `get_flaky_and_quarantined_tests` | Read | Tests that are quarantined, or unstable with a stability score of D or F, with their test key and spec file. | `projectId?` (required if `AGNOX_PROJECT_ID` is not set) |
| `toggle_test_quarantine` | Write | Quarantine a test (its failures stop failing the run) or release it. Address it by `testCaseId`, or by `testKey` from `get_execution_failures`. By key, the test case is created if it doesn't exist yet. | `quarantined` (required), `testCaseId?` (id or `AG-TC-12`), `testKey?`, `projectId?`, `title?` (needed when creating), `file?` |
| `sync_test_cases` | Write | Register automated tests found in the code as Agnox test cases, so they can be tracked and quarantined before their first run. Idempotent. | `tests` (required, at most 500): `[{ file, titlePath }]`, `projectId?` |

Write tools need a Developer or Admin key. With a Viewer key they return a readable permission error.

### Results

Every tool returns a one-line summary followed by compact JSON:

```text
3 failed tests in run run-k3j2
{"untrusted_data":{"taskId":"run-k3j2","projectId":"665f…","items":[{"name":"checkout › pays with card","file":"tests/checkout.spec.ts","testKey":"4c1f…","error":"TimeoutError: locator.click: Timeout 5000ms exceeded…","context":{"failureUrl":"https://shop.test/pay","testIds":["pay-button"],"domSnapshot":"<button data-testid=\"pay-button\">Pay</button>"}}]}}
```

- Lists are capped at 20 items (an `omitted` count tells the assistant how many were left out). DOM snapshots are cut at 4,000 characters, error text at 2,000, and URLs and console lines at 500.
- Everything under `untrusted_data` comes from test runs and the pages under test. The tool descriptions tell the assistant to treat it as data, never as instructions, which guards against prompt injection from a page under test.
- A failing call (bad argument, missing permission, API error) returns a readable error to the assistant instead of breaking the session.

---

## Examples

### Fix a broken locator

> *"Why did the last failed Agnox run fail? Fix the broken locator."*

1. `list_recent_executions` with `{ "status": "FAILED", "limit": 1 }` finds the run.
2. `get_execution_failures` with `{ "taskId": "run-k3j2" }` returns the error, the spec file, and the `testIds` and `domSnapshot` captured at failure.
3. The assistant opens `tests/checkout.spec.ts` and replaces the stale selector with one that exists in the snapshot, for example `getByTestId('pay-button')`.

### Triage a red nightly

> *"Is last night's failure one problem or many?"*

`list_failure_clusters` with `{ "days": 1 }` groups failures by signature. When one cluster hits most of the failing tests, it's usually a shared cause, such as an expired login or a down service, rather than many separate bugs.

### Quarantine a flaky test

> *"Which tests are flaky in Agnox? Quarantine the checkout one."*

1. `get_flaky_and_quarantined_tests` lists the unstable tests with their keys.
2. `toggle_test_quarantine` with:

```json
{
  "quarantined": true,
  "testKey": "4c1f…",
  "title": "checkout › pays with card",
  "file": "tests/checkout.spec.ts"
}
```

Release it later with the same arguments and `"quarantined": false`.

### Register the tests in your repository

> *"Register every test in `tests/` with Agnox."*

The assistant reads your spec files and calls `sync_test_cases`:

```json
{
  "tests": [
    { "file": "tests/checkout.spec.ts", "titlePath": ["checkout", "pays with card"] },
    { "file": "tests/login.spec.ts", "titlePath": ["login", "rejects a wrong password"] }
  ]
}
```

The result counts `created`, `alreadyLinked` and `skipped`. Calling it again is safe.

---

## Protocol details

- Transport: JSON-RPC 2.0 over stdio, one message per line. Diagnostics go to stderr.
- MCP protocol versions: `2025-11-25`, `2025-06-18`, `2025-03-26` and `2024-11-05`.
- Tools carry `readOnlyHint` / `destructiveHint` / `idempotentHint` annotations, so clients can ask before running a write tool.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `AGNOX_API_KEY is not set` | Add the key to the server's `env` block, or export it in the shell that starts the client. |
| `401` errors | The key is wrong or revoked. Create a new one in **Settings → My Profile → API keys**. |
| `403 FORBIDDEN` on quarantine or sync | The key belongs to a Viewer. Use a Developer or Admin key. |
| `403 FEATURE_DISABLED` on `list_failure_clusters` | Enable Root Cause Analysis for the organization. |
| `projectId is required` | Pass a `projectId`, or set `AGNOX_PROJECT_ID` in the server's `env`. |
| `… answered with a web page (HTML) …` | `AGNOX_API_URL` points at the dashboard (for example `https://agnox.dev`), not the API. Use `https://api.agnox.dev`, or remove the variable to use the default. |
| `429` errors | You hit the [API rate limit](../api-reference/public-api-v1.md#rate-limits). Wait a minute and retry. |
| Server doesn't start | Check `node --version` is 20 or later. Run `npx -y @agnox/mcp-server` in a terminal to see the error on stderr. |
