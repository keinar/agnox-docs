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
- Delete test cases using the trash icon in the test case row.

---

## Bulk Actions

Select one or more test cases using the checkboxes. The floating **Bulk Actions** bar appears with:

- **Optimize with AI** — convert selected cases (up to 20) to BDD format using the [Smart Test Optimizer](../ai-capabilities/test-optimizer)
- **Delete** — remove selected test cases

---

## Using Test Cases in Cycles

Test cases are the building blocks for [Test Cycles](./test-cycles). When creating a cycle, you select test cases from the suite-grouped checklist to include as **MANUAL items** in the cycle.

---

## Related

- [Test Cycles →](./test-cycles)
- [Smart Test Optimizer →](../ai-capabilities/test-optimizer)
