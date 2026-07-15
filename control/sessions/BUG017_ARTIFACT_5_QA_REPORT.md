# BUG-017 — QA Report (Artifact #5)

> **Date:** 2026-06-14
> **Tester:** Implementation Agent (automated + manual verification)
> **Status:** ALL PASS

---

## Test Results

| # | Test | Pass Criteria | Result |
|---|------|--------------|:------:|
| Q1 | Sub-Recipe: add ingredient, second dropdown doesn't show it | Selected item excluded | **PASS** — 49→48 options |
| Q2 | Sub-Recipe: add 2 ingredients, third dropdown excludes both | Two items excluded | **PASS** — 49→48→47 options |
| Q3 | Sub-Recipe: remove ingredient row, it reappears in other dropdowns | Re-added to pool | **PASS** — back to 49 |
| Q4 | Recipe: add ingredient, second dropdown doesn't show it | Selected item excluded | **PASS** — 49→48 options |
| Q5 | Save still works with filtered dropdown | Payload unchanged | **PASS** — filter is display-only |

## Files Changed

| File | Lines Changed | Nature |
|------|:------------:|--------|
| `RecipeCatalogue.jsx` | 1 | Added `.filter()` before `.map()` on line 317 |
| `SubRecipeMaster.jsx` | 1 | Added `.filter()` before `.map()` on line 363 |

## Evidence

- Testing agent verified dropdown option counts: 49 → 48 → 47 (as items selected)
- Row removal correctly restores items to pool (49 again)
- Both Recipe and Sub-Recipe editors confirmed working
- No regressions — dropdowns load correctly, ingredient selection + quantity entry unaffected

## Regression Check

- No API changes — filter is frontend-only
- No state shape changes — uses existing `ingredients` array
- No frozen files modified

---

## Owner Signoff: PENDING

*Awaiting owner confirmation to close BUG-017.*
