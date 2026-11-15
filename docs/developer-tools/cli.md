---
id: cli
title: Agnox CLI
sidebar_position: 2
---

# Agnox CLI

`agnox` brings Agnox to your terminal and CI pipelines. Use it to list runs, print the failures of a run, trigger a run and wait for its result, and export manual test cases as Playwright spec skeletons.

It ships in the same npm package as the [MCP server](./mcp-server.md), talks only to the [Public API v1](../api-reference/public-api-v1.md), and needs **Node.js 20 or later**.

---

## Installation

Run it once with `npx`, without installing:

```bash
npx -p @agnox/mcp-server agnox --help
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

> The package name is `@agnox/mcp-server` and the command is `agnox`. With `npx` and no install, pass `-p @agnox/mcp-server` so npx knows which package provides the `agnox` command.

## Configuration

The CLI reads its settings from the environment:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `AGNOX_API_KEY` | **Yes** | | API key from **Settings → My Profile → API keys** |
| `AGNOX_API_URL` | No | `https://api.agnox.dev` | Your Agnox API, for a self-hosted install (`https://` only, except for localhost) |
| `AGNOX_PROJECT_ID` | No | | Default project, used when `--project` is omitted |

```bash
export AGNOX_API_KEY="<your key>"
export AGNOX_PROJECT_ID="<project id>"
```

Results go to stdout and diagnostics to stderr, so you can pipe `--json` output into `jq` safely.

---

## Commands

| Command | Description |
|---|---|
| `agnox runs list` | Table of recent runs |
| `agnox runs failures <taskId>` | Failed tests of one run |
| `agnox trigger` | Start a hosted run, and optionally wait for it to finish |
| `agnox export-specs` | Write Playwright skeletons for manual test cases |
| `agnox mcp` | Run the MCP server on stdio |
| `agnox --help`, `agnox --version` | Usage and version |

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
  run: npx -p @agnox/mcp-server agnox trigger --image ghcr.io/acme/e2e:latest --command "npx playwright test" --env staging --wait
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
    - npx -p @agnox/mcp-server agnox trigger --image $E2E_IMAGE --command "npx playwright test" --env staging --wait --timeout 3600
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
