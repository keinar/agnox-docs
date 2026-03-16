---
id: test-cases
title: Test Cases (Quality Hub)
sidebar_position: 2
---

# Test Cases (Quality Hub)

The **Quality Hub** is your living manual test repository — a structured, searchable library of test cases organized by suite, with built-in AI step generation.

---

## Creating a Test Case

1. Navigate to **Test Cases** from the sidebar.
2. Select your **Project** from the dropdown.
3. Click **New Test Case** to open the creation drawer.
4. Fill in:
   - **Title** — e.g., "Login flow with invalid credentials"
   - **Suite** — grouping label (e.g., "Authentication", "Checkout")
   - **Priority** — `LOW` / `MEDIUM` / `HIGH` / `CRITICAL`
   - **Steps** — individual test steps with **Action** and **Expected Result**

---

## AI-Powered Step Generation

Skip the manual authoring step — describe your intent and let AI generate structured steps:

1. In the test case drawer, click **Generate with AI**.
2. Enter a natural-language description, e.g.: *"Test the checkout flow with a coupon code."*
3. Gemini generates a structured array of test steps automatically.
4. Review and edit the generated steps before saving.

---

## Managing Test Cases

- Test cases are grouped by **Suite** using collapsible accordions.
- Click any test case row to open the **edit drawer**.
- **Viewer** role: all create, edit, and delete actions are hidden — read-only access.

### Deleting a Test Case

Click the trash icon on any test case row to delete it individually.

### Suite Deletion

Click **Delete Suite** on a suite header to remove all test cases in that suite at once. An amber warning modal appears when the selection includes any **AUTOMATED** test cases.

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

Test cases are the building blocks for [Test Cycles](./test-cycles). When creating a cycle, you select test cases from the suite-grouped checklist to include as **MANUAL items** in the cycle.

---

## Related

- [Test Cycles →](./test-cycles)
- [Smart Test Optimizer →](../ai-capabilities/test-optimizer)
