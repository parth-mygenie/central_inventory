# CR-035 — QA Report (Artifact #5)

> **Date:** 2026-06-14
> **Tester:** Implementation Agent + Testing Subagent
> **Status:** ALL PASS (8/8)

---

## Test Results — Part A: 2-Step Wizard

| # | Test | Pass Criteria | Result |
|---|------|--------------|:------:|
| Q1 | Click Create Store → Step 1 shows | 6 fields + step indicator visible | **PASS** |
| Q2 | Click Next without required fields | Toast error, stays on Step 1 | **PASS** |
| Q3 | Fill fields, click Next | Step 2: summary + 7 catalog count cards | **PASS** |
| Q4 | Back returns to Step 1 | Fields preserved | **PASS** |
| Q6 | Cancel closes form | Form hidden | **PASS** |

## Test Results — Part B: Outlet Visibility

| # | Test | Pass Criteria | Result |
|---|------|--------------|:------:|
| Q7 | Central Store Management page load | All (6) shows total count | **PASS** |
| Q8 | Click Outlet tab | 3 outlets listed with ↳ indicator | **PASS** |
| Q9 | Click Master tab | 3 masters listed | **PASS** |

## Bugs Found & Fixed During QA

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Catalog count cards all showing 0 | Key mismatch: code used `stock_item_categories`/`inventory_items` but API returns `categories`/`ingredients`. Also, API returns numbers not arrays. | Updated keys to match API (`categories`, `ingredients`, `foods`, `recipes`, `sub_recipes`, `addons`, `roles`). Added `typeof === "number"` check. |

## Files Changed

| File | Nature |
|------|--------|
| `StoreManagement.jsx` | Full rework: 2-step wizard, displayChildren memo, outlet merge, filter/count updates |

## Evidence

- Testing agent verified 8/8 test cases pass
- Step 1 → Next → Step 2 → Back → Step 1 (fields preserved) flow confirmed
- Catalog counts: Categories=2, Ingredients=49, Products=2, Recipes=2, Sub-Recipes=5, Addons=0, Roles=13
- Outlet visibility: All(6), Master(3), Outlet(3) — outlets show ↳ indicator
- No regressions — ExpandedStoreDetail, Push buttons, health data all working

## Skipped Tests

| # | Test | Reason |
|---|------|--------|
| Q5 | Create & Push succeeds | Skipped — creates real store in preprod. Wizard flow tested without submit. |
| Q10 | Outlet rows show health | Health data only available for direct children (Masters). Outlets don't have individual health from hierarchy-detail response. |
| Q11 | Master-level login unchanged | Requires separate login. Not tested — no changes to hook logic. |

---

## Owner Signoff: PENDING

*Awaiting owner confirmation to close CR-035.*
