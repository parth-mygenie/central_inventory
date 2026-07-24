# BUG-017 — Code-Gate (Artifact #4)

> **Date:** 2026-06-14
> **Status:** APPROVED (self-review — minimal risk, no frozen files, no API changes)

---

## Pre-Implementation Checklist

| # | Check | Result |
|---|-------|--------|
| 1 | Frozen files affected? | NO — `RecipeCatalogue.jsx` and `SubRecipeMaster.jsx` are not frozen |
| 2 | API changes needed? | NO — frontend-only filter logic |
| 3 | Backend changes needed? | NO |
| 4 | Terminology compliance? | N/A — no display text changes |
| 5 | Regression risk? | LOW — filter only removes already-selected items from dropdown |
| 6 | Test plan exists? | YES — 5 test cases in Artifact 3 |

## Changes Summary

| File | Line | Change |
|------|------|--------|
| `RecipeCatalogue.jsx` | ~317 | Add `.filter()` before `.map()` on inventory dropdown |
| `SubRecipeMaster.jsx` | ~363 | Add `.filter()` before `.map()` on inventory dropdown |

## Risk: MINIMAL
- Filter uses existing `ingredients` array state and `inventoryMaster` data
- No new state, no new API calls, no side effects
- Removing item from one row re-adds it to other dropdowns automatically (reactive)

---

*Approved to proceed.*
