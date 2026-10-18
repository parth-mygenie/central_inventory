# CR-035 — Code-Gate (Artifact #4)

> **Date:** 2026-06-14
> **Status:** APPROVED

---

## Pre-Implementation Checklist

| # | Check | Result |
|---|-------|--------|
| 1 | Frozen files affected? | NO — `StoreManagement.jsx` is not frozen |
| 2 | API changes needed? | NO — uses existing `getHierarchyDetail` restaurants data + `pushBundle` |
| 3 | Backend changes needed? | NO |
| 4 | Terminology compliance? | YES — uses `mapRestaurantType()` for all labels |
| 5 | Regression risk? | LOW — Part A: new wizard replaces single-step form. Part B: additive (displayChildren merges outlets) |
| 6 | Test plan exists? | YES — 11 test cases in Artifact 3 |

## Changes Summary

| Part | Change | Scope |
|------|--------|-------|
| A | 2-step create wizard: Step 1 (fields) → Step 2 (review + catalog counts) → Create & Push | StoreManagement.jsx |
| B | Outlet visibility: extract restaurants from hierarchy-detail, merge into displayChildren | StoreManagement.jsx |

## Risk Assessment

- **Part A**: Replaces `handleCreate` with `handleCreateAndPush` (adds push after create). Single form → 2-step wizard. Form fields unchanged. Low risk.
- **Part B**: Uses existing API data (`restaurants` array from `getHierarchyDetail`). Additive — wraps `children` in `displayChildren` memo. Filter/count logic updated to use new computed list. Low risk.
- **No hook/API/backend changes.**

---

*Approved to proceed.*
