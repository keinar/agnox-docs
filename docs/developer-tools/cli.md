---
id: cli
title: Agnox CLI
sidebar_position: 2
---

# Agnox CLI

`agnox` brings Agnox to your terminal and CI pipelines. Use it to list runs, print the failures of a run, trigger a run and wait for its result, and export manual test cases as Playwright spec skeletons.

It ships in the same npm package as the [MCP server](./mcp-server.md), talks only to the [Public API v1](../api-reference/public-api-v1.md), and needs **Node.js 20 or later**.

> **Two packages, two jobs.** [`@agnox/agnox-cli`](https://www.npmjs.com/package/@agnox/agnox-cli) (`npx @agnox/agnox-cli@latest init` / `push`) only scaffolds and pushes the Docker image for **Hosted** test runs. Everything on this page, the `agnox` command for the API and the MCP server, comes from **`@agnox/mcp-server`**. If you report runs from your own CI with the Playwright reporter, you don't need `@agnox/agnox-cli` at all.

---

## Installation

Run it with `npx`, without installing. Every command runs straight from the package:

```bash
npx -y @agnox/mcp-server@latest --help
```

Or install it globally:

```bash
npm install -g @agnox/mcp-server
agnox --help
```

Or add it to a project, so CI uses a pinned version:

```bash
npm install -D @agnox/mcp-server
npx agnox --help
```

> The package name is `@agnox/mcp-server` and the installed command is `agnox`. With `npx`, a CLI command such as `setup`, `runs` or `login` after the package name runs the CLI; with no command, the package starts the MCP server. The older form `npx -p @agnox/mcp-server agnox <command>` still works.

## Configuration

The CLI uses three settings:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `AGNOX_API_KEY` | **Yes** | | API key from **Settings → My Profile → API keys** |
| `AGNOX_API_URL` | No | `https://api.agnox.dev` | The Agnox **API** host, for a self-hosted install (`https://` only, except for localhost). Not the dashboard URL. A trailing `/api`, `/api/v1` or `/api/executions/ingest` is removed. |
| `AGNOX_PROJECT_ID` | No | | Default project, used when `--project` is omitted |

They are read from these places, in this order:

1. **Environment variables**, which always win.
2. **A `.env` file in the current directory.** Only the three names above are read, and nothing in your environment is overridden.
3. **Credentials saved by `agnox login`.**

### Log in once

```bash
npx -y @agnox/mcp-server@latest login
# Agnox API key: ********************
# Logged in to api.agnox.dev (3 projects). Saved to /home/you/.agnox/config.json
```

In a terminal, `login` prompts for the key without echoing it. In a script, or in a terminal that can't prompt (Git Bash / mintty), pass it with `--api-key "<your key>"`. `agnox login` checks the key against the API first and saves nothing if the key is rejected. For a self-hosted install, add `--api-url https://agnox.example.com`. The file is created readable by your user only (mode `0600` on macOS and Linux). Delete `~/.agnox/config.json` to log out.

### Or use a `.env` file

```bash
# .env in your project (keep it out of git)
AGNOX_API_KEY=<your key>
AGNOX_PROJECT_ID=<project id>
```

> **Key and URL stay together.** An `AGNOX_API_URL` from `.env` is used only together with the `AGNOX_API_KEY` from the same file. A key from your environment or from `agnox login` is never sent to a URL that a `.env` file supplies. This way, a `.env` in a repository you cloned can't redirect your key to another server. The CLI prints a notice when it ignores such a URL.

Results go to stdout and diagnostics to stderr, so you can pipe `--json` output into `jq` safely.

---

## Commands

| Command | Description |
|---|---|
| `agnox runs list` | Table of recent runs |
| `agnox runs failures <taskId>` | Failed tests of one run |
| `agnox trigger` | Start a hosted run, and optionally wait for it to finish |
| `agnox export-specs` | Write Playwright skeletons for manual test cases |
| `agnox setup` | Log in, pick a project, and configure Claude Code, VS Code, Copilot CLI and Cursor for this repository |
| `agnox doctor` | Check the key, project, MCP config files and a live MCP handshake |
| `agnox login` | Check an API key and save it in `~/.agnox/config.json` |
| `agnox mcp` | Run the MCP server on stdio |
| `agnox --help`, `agnox --version` | Usage and version |

### `agnox setup`

Connects the current repository and your AI coding assistants to Agnox in one step: logs in, picks a project, writes the MCP config for Claude Code, VS Code Copilot, Copilot CLI and Cursor, optionally adds an Agnox section to `.github/copilot-instructions.md` and `CLAUDE.md`, then runs `doctor`.

```bash
npx -y @agnox/mcp-server@latest setup [--project <id>] [--api-key <key>] [--api-url <url>]
                                      [--clients mcp-json,cursor,vscode,copilot-cli]
                                      [--instructions copilot,claude|none] [--non-interactive]
```

| Option | Description |
|---|---|
| `--project <id>` | Project to connect. Without it, the projects your key can see are listed (the only one is picked automatically). |
| `--api-key <key>` | Use and save this key. Without it, a working key from the environment, `.env` or `agnox login` is reused, or you're prompted (masked). |
| `--api-url <url>` | A self-hosted Agnox API |
| `--clients <list>` | Files to write: `mcp-json` (`.mcp.json`, alias `claude`), `cursor` (`.cursor/mcp.json`), `vscode` (`.vscode/mcp.json`), `copilot-cli` (`~/.copilot/mcp-config.json`). Interactive default: `.mcp.json`, plus Cursor when `.cursor/` exists. |
| `--instructions <list>` | Add the Agnox section to `copilot` (`.github/copilot-instructions.md`), `claude` (`CLAUDE.md`), or `none` |
| `--non-interactive` | Never prompt. Writes only `.mcp.json` unless `--clients` says otherwise. |

Only the `agnox` entry of each file is added or replaced; other servers and settings are kept. API keys are never written to repository files. A file with comments or trailing commas, or invalid JSON, is left untouched and the entry to paste is printed instead. Exit code `1` if any check fails or a file was left untouched. See the [MCP Quickstart](./mcp-server.md#quickstart) for the full walkthrough.

### `agnox doctor`

```bash
npx -y @agnox/mcp-server@latest doctor [--project <id>]
```

Checks, in order:

| Check | Passes when |
|---|---|
| API key | A key is found (environment, `.env` or `agnox login`) and the API accepts it |
| Project | `--project`, `AGNOX_PROJECT_ID` or the project in `.mcp.json` is visible to the key |
| Config files | Each of `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json` and `~/.copilot/mcp-config.json` that exists parses (JSONC is fine), has a valid `agnox` entry for that client's schema, and no repository file holds an API key |
| MCP handshake | The server answers `initialize` and lists all 7 tools over stdio |

Each problem prints a one-line fix. Exit code `0` when nothing fails, `1` otherwise.

### `agnox runs list`

```bash
agnox runs list [--project <id>] [--status <s>] [--limit <n>] [--json]
```

Prints recent runs, newest first, with task id, status, start time, duration and passed/failed counts.

| Option | Description |
|---|---|
| `--project <id>` | Project to list (default `AGNOX_PROJECT_ID`, else every project) |
| `--status <s>` | Comma-separated filter: `PENDING`, `RUNNING`, `PASSED`, `FAILED`, `ERROR`, `UNSTABLE` |
| `--limit <n>` | How many runs to show (the API caps this at 100) |
| `--json` | Print the API data as JSON |

```bash
agnox runs list --status FAILED --limit 5
```

### `agnox runs failures`

```bash
agnox runs failures <taskId> [--json]
```

Prints one block per failed test: name, spec file, failure signature and the first lines of the error. With `--json`, it prints the full failure data, including the page context captured at the moment of failure.

```bash
agnox runs failures run-k3j2
```

### `agnox trigger`

```bash
agnox trigger --image <img> --command <cmd> --env <development|staging|production>
              [--project <id>] [--base-url <url>] [--folder <path>]
              [--wait] [--timeout <sec>] [--json]
```

Starts a run on Agnox's hosted runners.

| Option | Description |
|---|---|
| `--image <img>` | **Required.** Docker image that contains your tests |
| `--command <cmd>` | **Required.** Command that runs them, for example `npx playwright test` |
| `--env <env>` | **Required.** `development`, `staging` or `production` |
| `--project <id>` | Project to run in (default `AGNOX_PROJECT_ID`) |
| `--base-url <url>` | Base URL of the application under test |
| `--folder <path>` | Test folder to run (default: all tests) |
| `--wait` | Poll every 5 seconds until the run finishes, then exit with its result |
| `--timeout <sec>` | Give up waiting after this many seconds (default 1800) |
| `--json` | Print the started run, or with `--wait` the finished run, as JSON |

```bash
agnox trigger --image ghcr.io/acme/e2e:latest \
  --command "npx playwright test" --env staging --wait
# Started run run-k3j2; waiting for it to finish…
# Run run-k3j2 PASSED — 120 passed, 0 failed in 4m 10s
```

### `agnox export-specs`

```bash
agnox export-specs --out <dir> [--project <id>] [--folder <path>] [--force]
```

Exports the project's **manual** test cases as Playwright spec skeletons, one file per top-level folder (for example, a `Checkout` folder becomes `checkout.spec.ts`). Cases outside any folder go to `root.spec.ts`. Automated test cases are skipped, because they already have a spec.

| Option | Description |
|---|---|
| `--out <dir>` | **Required.** Directory to write into. It is created if missing. |
| `--project <id>` | Project to export (default `AGNOX_PROJECT_ID`) |
| `--folder <path>` | Export only this folder, for example `/Checkout` |
| `--force` | Overwrite existing files. Without it, nothing is written if any target file exists. |

Safety rules: only flat, lower-case `*.spec.ts` names are written (at most 500 files, 5 MB each), nothing is written outside `--out`, and symbolic links are never written through.

See [Migrate & export test cases](../core-features/migrate-test-cases.md#export-manual-cases-as-playwright-skeletons) for what a generated file looks like.

### `agnox mcp`

Runs the [MCP server](./mcp-server.md) on stdio. It takes no arguments and is configured through the same environment variables.

---

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success. With `trigger --wait`, the run finished as `PASSED`. |
| `1` | API error, usage error, missing configuration, or a `trigger --wait` timeout |
| `2` | `trigger --wait` only: the run finished but didn't pass (`FAILED`, `ERROR` or `UNSTABLE`) |

Code `2` lets a pipeline tell "the tests failed" apart from "the pipeline couldn't reach Agnox".

## Use in CI

### GitHub Actions

```yaml
- name: Run E2E suite on Agnox
  run: npx -y @agnox/mcp-server@latest trigger --image ghcr.io/acme/e2e:latest --command "npx playwright test" --env staging --wait
  env:
    AGNOX_API_KEY: ${{ secrets.AGNOX_API_KEY }}
    AGNOX_PROJECT_ID: ${{ vars.AGNOX_PROJECT_ID }}
```

The job fails when the run fails, because `agnox` exits with code `2`.

### GitLab CI

```yaml
e2e:
  image: node:22
  script:
    - npx -y @agnox/mcp-server@latest trigger --image $E2E_IMAGE --command "npx playwright test" --env staging --wait --timeout 3600
  variables:
    AGNOX_PROJECT_ID: "665f…"
  # AGNOX_API_KEY comes from a masked CI/CD variable
```

### Treat a failed run differently from an outage

```bash
set +e
agnox trigger --image "$IMAGE" --command "npx playwright test" --env staging --wait
code=$?
set -e
if [ "$code" -eq 2 ]; then echo "Tests failed"; exit 1; fi
if [ "$code" -ne 0 ]; then echo "Could not reach Agnox, skipping the gate"; exit 0; fi
```
