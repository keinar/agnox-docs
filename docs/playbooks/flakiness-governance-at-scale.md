---
id: flakiness-governance-at-scale
title: Flakiness Governance & Stability Engineering
sidebar_label: Flakiness Governance
sidebar_position: 3
description: Why blind CI retries fail at scale, and how failure signature clustering, A–F stability grades and Auto-Quarantine keep a large Playwright suite fast and trustworthy.
keywords: [flaky tests, test flakiness, ci retries, quarantine, test stability, failure clustering, playwright]
---

# Flakiness Governance & Stability Engineering

Every large suite has flaky tests. The question is whether your team **manages** flakiness or just **absorbs** it. Teams that absorb it end up with a CI that is slow, red for no reason, and ignored. Teams that manage it treat flakiness as a measured, owned and time-boxed kind of debt.

This playbook covers why the default answer, more retries, stops working, and what to do instead.

---

## 1. Why blind retries fail at scale

`retries: 3` feels like a fix. At scale it turns into three problems.

**It hides real bugs.** A race condition in the product fails one run in five. With three retries, the test almost always passes on a later attempt, and the bug ships. Retries can't tell an unreliable test from an unreliable product.

**It makes CI slower in the worst way.** Retries cost the most on the slowest tests (timeouts), and they serialize: a test that times out at 30 seconds and retries three times costs two minutes on one worker. Across a few hundred unstable tests, that's a large share of your pipeline.

**The odds stop working.** If each test is independently 99.5% reliable, a 1,000-test run passes cleanly only about 0.7% of the time (0.995¹⁰⁰⁰). Retries raise the per-test number, but every retry that rescues a run also hides one more signal. Eventually "passed on retry" is normal, and nobody looks.

The fix is not zero retries. It's **one retry used as a measurement**: a test that fails then passes is flaky, so record that and act on it, instead of treating it as a pass.

---

## 2. Measure: grade every test, not just every run

You can't govern what you don't measure per test. Agnox links every result to its test case by a **stable test key** (spec file path plus title path), the same for hosted runs and the Playwright reporter, and grades each test on its history: pass rate and retry use.

| Grade | Pass rate | What to do |
|---|---|---|
| **A** | ≥ 95% | Nothing. |
| **B** | ≥ 80% | Watch. Look at the retries. |
| **C** | ≥ 65% | Investigate this sprint. |
| **D** | ≥ 50% | Unstable. Fix or quarantine. |
| **F** | < 50% | Broken or badly flaky. Quarantine now, fix with an owner. |
| **UNGRADED** | — | Not enough history yet. |

Grades turn "CI feels flaky" into a list: these 14 tests are D or F, these 3 belong to checkout, this one regressed from A to D last Tuesday. Track the **count of D/F tests per area** over time; it is a much better health metric than the run pass rate.

Duration matters too. A test that suddenly takes twice as long is often about to start timing out. Agnox flags a test as **Slow** when a run is far above its historical average.

---

## 3. Cluster: one cause, many failures

A red nightly with 60 failures is rarely 60 bugs. More often it's one expired token, one slow service or one changed component that 60 tests touch.

Agnox fingerprints every failure into a **failure signature**: it strips colour codes and Playwright's retry call log, replaces URL origins, UUIDs, long hex ids and numbers with placeholders, and hashes the result. Locator text is kept, because that is what tells two failures apart. The same failure on staging and production, or on Monday and Friday, gets the same signature. Failures with the same signature are **clustered** across tests and runs. Read the clusters before the individual failures:

- **One cluster covering most failures** → a shared cause. Fix it once; don't open 60 tickets.
- **A cluster that appears in many runs** → a systemic flake (environment, data, timing), usually in a fixture or helper.
- **Many small, unrelated clusters** → separate bugs. Triage them one by one.

Clustering also keeps AI analysis focused: root-cause analysis runs on each unique signature once, not on every duplicate failure. From an IDE, `list_failure_clusters` in the [MCP server](../developer-tools/mcp-server.md) returns the same view.

---

## 4. Contain: quarantine with rules

Quarantine takes a test's failures out of the pass/fail decision while it keeps running and reporting. Done well, it's the most effective flakiness tool there is. Done badly, it's a place where tests go to die.

### Automatic quarantine

With **Auto-Quarantine** enabled for a project (**Settings → Run Settings**), a test whose **3 most recent runs all failed** is quarantined automatically. A test that was quarantined automatically leaves quarantine as soon as its latest run passes.

### Manual quarantine

Quarantine a test by hand from the Investigation Hub, from the test case, or through `toggle_test_quarantine` in the MCP server. Manual quarantines are **never lifted automatically**; a person decides when the fix is in.

### The quality gate

For runs reported by `@agnox/playwright-reporter`, a failed run is reported as **passed** only when **every** failed result belongs to a quarantined test **and** the server is sure it received every result. A run that failed outside of tests (setup or teardown) is never turned green.

### Governance rules worth adopting

1. **Every quarantine has an owner and a ticket.** No owner, no quarantine.
2. **Time-box it.** Two weeks is a good default. Review the quarantined list in a weekly stability review and either fix, delete or extend with a reason.
3. **Cap it.** If more than ~2% of a suite is quarantined, stop adding features to that area until the number comes down.
4. **Never quarantine a product bug.** If the product is wrong, file a bug and let the test stay red, or mark it expected-to-fail with a link to the bug.
5. **Keep quarantined tests running.** Their results still feed the grade, so you can see when a fix worked.

---

## 5. Fix: the usual root causes

Most flakiness comes from a short list of causes. Grade and cluster data usually points at one of them.

| Symptom | Likely cause | Fix |
|---|---|---|
| Fails only in parallel | Shared data or account between tests | Data per test via fixtures; one account per worker |
| Timeouts on CI, never locally | Fixed waits, slow environment, unbounded polling | Wait for state (`expect(...).toBeVisible()`, `waitForResponse`); set explicit timeouts |
| "Element is not attached to the DOM" | Acting on an element that re-rendered | Use locators (`page.getByRole(...)`), not stored element handles |
| Same signature across many tests | Broken fixture, expired login, external service | Fix the shared fixture; stub third-party services |
| Fails at certain times of day | Date/time or time zone assumptions | Freeze the clock (`page.clock`) or compute dates relative to now |
| Order-dependent failures | Test relies on state from an earlier test | Make each test set up its own preconditions |

After a fix, prove it: run the test with `--repeat-each=10` locally, then watch its grade over the next few days.

---

## 6. A stability operating model

| Cadence | Activity |
|---|---|
| Every run | One retry, recorded as flaky. Quality gate respects quarantines. |
| Every morning | Read failure clusters from the nightly before individual failures. |
| Weekly | Stability review: new D/F tests, quarantined list, owners, deadlines. |
| Monthly | Trend of D/F count per product area; set a target for the next month. |

Make one person per area accountable for its D/F count. Flakiness without an owner always grows.

---

## Related

- [Flakiness Detective & A–F Stability Scoring →](../ai-capabilities/flakiness-detective.md)
- [Auto-Quarantine & Quality Gate →](../core-features/executions.md)
- [MCP Server →](../developer-tools/mcp-server.md)
- [Architecting Scalable Playwright Suites →](./scalable-playwright-architecture.md)
- [The 2027 Agentic QA Workflow →](./agentic-qa-workflow-mcp.md)
