---
id: mcp-server
title: MCP Server
sidebar_position: 1
---

# Agnox MCP Server

`@agnox/mcp-server` connects Agnox to AI coding assistants over the [Model Context Protocol](https://modelcontextprotocol.io). With it, Claude Code, GitHub Copilot (VS Code and Copilot CLI), Cursor, Claude Desktop or Windsurf can:

- read why a run failed, including the page URL, console and network errors, test ids and a DOM snapshot captured at the moment of failure
- fix a broken locator using that context
- find flaky tests and quarantine or release them
- register the tests in your repository as Agnox test cases

The server talks only to the [Public API v1](../api-reference/public-api-v1.md). It has no runtime dependencies and needs **Node.js 20 or later**. The same package also ships the [`agnox` CLI](./cli.md).

---

## Before you start

1. **Create an API key** in **Settings → My Profile → API keys**. The key acts with your role in your organization: a Viewer key can only read, while a Developer or Admin key can also quarantine tests and sync test cases.
2. **Have Node.js 20 or later** on the machine that runs your coding assistant.

---

## Quickstart

Run one command at the root of your repository:

```bash
npx -y @agnox/mcp-server@latest setup
```

The dashboard's **Get started in 60 seconds** card shows the same command with `--project <your project id>` already filled in.

`setup` does everything in one pass:

1. **Logs you in.** It reuses a key that already works (environment, `.env` or a previous login). Otherwise it asks for the key with masked input, checks it against the API, and saves it in `~/.agnox/config.json` (readable by your user only). The key is never written to a repository file.
2. **Picks the project.** It uses `--project` if you pass one; otherwise it lists the projects your key can see.
3. **Configures your assistants.** It always writes the shared `.mcp.json` (read by Claude Code, VS Code Copilot and Copilot CLI), and asks before writing anything else:

   | Target | Default | Used by |
   |---|---|---|
   | `.mcp.json` | always | Claude Code, VS Code Copilot, Copilot CLI (in this repository) |
   | `.cursor/mcp.json` | on when `.cursor/` exists | Cursor |
   | `.vscode/mcp.json` | off | VS Code Copilot. Newer VS Code builds already read `.mcp.json`, so writing both can list `agnox` twice. |
   | `~/.copilot/mcp-config.json` | off | Copilot CLI in **every** repository. It pins this project for all of them. |

   Existing files are merged: only the `agnox` entry is added or replaced, and every other server and setting is kept. A file with comments or trailing commas, or one that isn't valid JSON, is left untouched and `setup` prints the entry to paste in by hand. If an old `agnox` entry in a repository file still holds an API key, `setup` removes it and reminds you to rotate the key.
4. **Tells your agents when to use Agnox (optional).** It offers to add a short Agnox section to `.github/copilot-instructions.md` and `CLAUDE.md`, between `<!-- agnox-mcp:start -->` and `<!-- agnox-mcp:end -->` markers, so running `setup` again updates it instead of adding a second copy.
5. **Verifies the connection.** It runs [`doctor`](#check-the-connection): the key, project access, the config files, and a live MCP `initialize` + `tools/list` handshake.

It finishes with a summary like this:

```text
Agnox is connected — 7 MCP tools verified.
  Files:     .mcp.json, CLAUDE.md (no API key inside; commit them)
  Try it:    ask your agent "Why did the latest Agnox run fail, and how do I fix it?"
  Teammates: after git pull, run  npx -y @agnox/mcp-server@latest login
```

### Share it with your team

Commit `.mcp.json` (and the other repository files `setup` wrote). They contain the project id and API URL, never a key. After `git pull`, each teammate saves their own key once:

```bash
npx -y @agnox/mcp-server@latest login
```

### Check the connection

```bash
npx -y @agnox/mcp-server@latest doctor
```

`doctor` prints `PASS`, `WARN`, `FAIL` or `NOTE` for each check, with a one-line fix under every problem, and exits with code `1` when anything fails.

### Options

| Option | Description |
|---|---|
| `--project <id>` | The project to connect. Without it, `setup` lists your projects (or picks the only one). |
| `--api-key <key>` | Use and save this key instead of prompting. Prefer the prompt on a shared machine: a key on the command line lands in your shell history. |
| `--api-url <url>` | A self-hosted Agnox API |
| `--clients <list>` | Exactly which files to write, comma-separated: `mcp-json` (alias `claude`), `cursor`, `vscode`, `copilot-cli` |
| `--instructions <list>` | Agent instructions to add: `copilot`, `claude`, or `none` |
| `--non-interactive` | Never prompt. Without `--clients`, only `.mcp.json` is written; without `--instructions`, no instructions file is touched. |

For example, to configure Cursor and Copilot CLI too, from a script:

```bash
npx -y @agnox/mcp-server@latest setup --project <project id> --clients mcp-json,cursor,copilot-cli --instructions copilot --non-interactive
```

> **Why `@latest`?** `npx` reuses a cached copy of a package. A copy older than 1.2.0 doesn't know `setup` and would start the MCP server instead, waiting silently for input. `@latest` makes npx check for the current version.

---

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `AGNOX_API_KEY` | **Yes** | | Your API key. Sent only in the `x-api-key` header; never printed, logged or included in an error message. |
| `AGNOX_API_URL` | No | `https://api.agnox.dev` | The Agnox API, for a self-hosted install. Must be `https://`; plain `http://` is accepted only for `localhost`, `127.0.0.1` and `[::1]`. No credentials, query or fragment. Redirects are never followed, so the key cannot leak to another host. |
| `AGNOX_PROJECT_ID` | No | | Default project for tools that take a `projectId` |

The server also reads these from a `.env` file in its working directory, and from credentials saved with [`agnox login`](./cli.md#log-in-once), using the same rules as the CLI. Variables in the `env` block always win.

> **Keep keys out of git.** The configs below carry no key: run `npx -y @agnox/mcp-server@latest login` once and the server reads it from `~/.agnox/config.json`. If you'd rather pass it through the client, reference an environment variable (Claude Code expands `${AGNOX_API_KEY}` in `.mcp.json`) instead of pasting the key into a committed file.

---

## Manual configuration

`setup` writes these files for you. Use this section to write or review them by hand. Every example assumes you've saved your key with `npx -y @agnox/mcp-server@latest login`.

### Claude Code and the shared `.mcp.json`

Commit a `.mcp.json` at the repository root. Claude Code reads it, and so do VS Code Copilot (newer builds) and GitHub Copilot CLI when they work in this repository. It uses the top-level key `mcpServers`:

```json
{
  "mcpServers": {
    "agnox": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@agnox/mcp-server@latest"],
      "env": {
        "AGNOX_API_URL": "https://api.agnox.dev",
        "AGNOX_PROJECT_ID": "<project id>"
      }
    }
  }
}
```

Don't add a `tools` property here; it isn't part of this file's schema. Run `/mcp` inside Claude Code to confirm that `agnox` is connected and its 7 tools are listed.

To add the server only for yourself instead of the repository:

```bash
claude mcp add agnox -e AGNOX_PROJECT_ID=<project id> -- npx -y @agnox/mcp-server@latest
```

### VS Code / GitHub Copilot

VS Code (1.102 or later) runs MCP servers for GitHub Copilot in agent mode. Newer builds pick up the shared `.mcp.json` above, so you may not need anything else. For VS Code's own workspace file, `.vscode/mcp.json`, note the different top-level key, `servers`:

```json
{
  "servers": {
    "agnox": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@agnox/mcp-server@latest"],
      "env": {
        "AGNOX_API_URL": "https://api.agnox.dev",
        "AGNOX_PROJECT_ID": "<project id>"
      }
    }
  }
}
```

Use one of the two files, not both, or Copilot may list `agnox` twice. `.vscode/mcp.json` may contain comments; `setup` won't rewrite such a file, so edit it by hand. VS Code can also prompt for the key and store it securely with an `inputs` entry (`"AGNOX_API_KEY": "${input:agnox-api-key}"`), if you'd rather not use `agnox login`.

You can also add the server to your user profile with **MCP: Add Server** from the Command Palette, or with `code --add-mcp`:

```bash
code --add-mcp '{"name":"agnox","type":"stdio","command":"npx","args":["-y","@agnox/mcp-server@latest"],"env":{"AGNOX_PROJECT_ID":"<project id>"}}'
```

Open Copilot Chat in **Agent** mode and select the tools icon (or run **MCP: List Servers**) to confirm that `agnox` is running and its tools are listed.

### GitHub Copilot CLI

Copilot CLI reads MCP servers from two places:

| File | Scope | Commit it? |
|---|---|---|
| `.mcp.json` in the repository | This repository only | Yes, it's the shared file above |
| `~/.copilot/mcp-config.json` | Every repository you open | No, it's in your home directory |

Inside a repository with the shared `.mcp.json`, you don't need anything else. To have Agnox in every repository, add it to `~/.copilot/mcp-config.json`. This file uses `"type": "local"` and needs a `tools` list (`["*"]` allows all Agnox tools):

```json
{
  "mcpServers": {
    "agnox": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@agnox/mcp-server@latest"],
      "env": {
        "AGNOX_API_URL": "https://api.agnox.dev",
        "AGNOX_PROJECT_ID": "<project id>"
      },
      "tools": ["*"]
    }
  }
}
```

On **Windows**, Copilot CLI cannot start `npx` directly. Use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "@agnox/mcp-server@latest"]` (`setup` does this for you). The `AGNOX_PROJECT_ID` here applies to every repository; leave it out and name the project in your prompt if you work across several.

Run `/mcp` in Copilot CLI to confirm that `agnox` is listed.

### Cursor

Create `.cursor/mcp.json` in the project, or `~/.cursor/mcp.json` to enable it for every project:

```json
{
  "mcpServers": {
    "agnox": {
      "command": "npx",
      "args": ["-y", "@agnox/mcp-server@latest"],
      "env": {
        "AGNOX_API_URL": "https://api.agnox.dev",
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
      "args": ["-y", "@agnox/mcp-server@latest"],
      "env": {
        "AGNOX_PROJECT_ID": "<project id>"
      }
    }
  }
}
```

### Windsurf

Use the same `mcpServers` block in `~/.codeium/windsurf/mcp_config.json`.

> **Windows:** if your client cannot start `npx` directly, use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "@agnox/mcp-server@latest"]`. Repository files keep plain `npx` so they work for everyone on the team.

> **Already installed the CLI?** `agnox mcp` starts the same server, so `"command": "agnox", "args": ["mcp"]` works too.

---

## Tools

| Tool | Access | What it does | Arguments |
|---|---|---|---|
| `list_recent_executions` | Read | Recent runs, newest first, with status, source and passed/failed counts. Use it to find the `taskId` of a failed run. Local runs (from a developer machine) are left out once the project has CI or hosted runs; a project with only local runs lists them, and the result says so. | `projectId?`, `status?` (comma-separated: `PENDING`, `RUNNING`, `PASSED`, `FAILED`, `ERROR`, `UNSTABLE`), `source?` (`agnox-hosted`, `external-ci`, `local`), `limit?` (1–25, default 10) |
| `get_execution_failures` | Read | The failed tests of one run: name, spec file, error, failure signature, test key, linked test case, and the page context at failure (URL, title, console and network errors, test ids, DOM snapshot). | `taskId` (required) |
| `get_failing_test_context` | Read | One failing test without the whole run: error, a short stack snippet, the last `test.step()` reached, spec file, report URL, and stability context (grade, main-branch vs current-branch pass rate, and whether it looks like a branch regression or a known flake). Defaults to the latest failed run of the project. | `testId?` or `testTitle?`, `executionId?`, `projectId?` |
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
| Anything not working | Run `npx -y @agnox/mcp-server@latest doctor`. It checks the key, project, config files and a live handshake, and prints a fix for each problem. |
| `AGNOX_API_KEY is not set` | Run `npx -y @agnox/mcp-server@latest login`, or export the key in the shell that starts the client. |
| `setup` prints nothing and waits | npx ran an old cached copy, which starts the MCP server instead. Use `@agnox/mcp-server@latest`. |
| `401` errors | The key is wrong or revoked. Create a new one in **Settings → My Profile → API keys**. |
| `403 FORBIDDEN` on quarantine or sync | The key belongs to a Viewer. Use a Developer or Admin key. |
| `403 FEATURE_DISABLED` on `list_failure_clusters` | Enable Root Cause Analysis for the organization. |
| `projectId is required` | Pass a `projectId`, or set `AGNOX_PROJECT_ID` in the server's `env`. |
| `… answered with a web page (HTML) …` | `AGNOX_API_URL` points at the dashboard (for example `https://agnox.dev`), not the API. Use `https://api.agnox.dev`, or remove the variable to use the default. |
| `429` errors | You hit the [API rate limit](../api-reference/public-api-v1.md#rate-limits). Wait a minute and retry. |
| Server doesn't start | Check `node --version` is 20 or later. Run `npx -y @agnox/mcp-server@latest doctor` to see what fails. |
