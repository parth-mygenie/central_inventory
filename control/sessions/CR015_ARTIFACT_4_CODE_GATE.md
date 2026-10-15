# CR-015 — P24 FEFO Batch Stock Detail Panel: Code-Gate (Artifact #4)

> **Date:** 2026-06-13
> **CR:** CR-015
> **Author:** E1
> **Status:** APPROVED (self-review — minimal remaining scope, 1 file)

---

## Pre-Implementation Checklist

- [x] Artifact 0 (Session-Start) — DONE (`control/sessions/CR015_SESSION_START.md`)
- [x] Artifact 1 (Intake) — DONE (`AI/Plans/phase3/P24_fefo_batch_stock_planning.md`)
- [x] Artifact 2 (Impact Analysis) — DONE (`AI/Plans/api_implementation_status_p24_addendum.md` + §11.4)
- [x] Artifact 3 (Implementation Plan) — DONE (§11.8 revised plan)
- [x] API validated: 19 probes confirmed working (§0 of planning doc)
- [x] FEFO proven operational: order #869395 with segment_allocations (addendum §Follow-Up)
- [x] No frozen files in change set (checked L7 — `StockDetailPanel.jsx` is active)
- [x] `server.py` NOT touched
- [x] `terminology.js` NOT touched
- [x] `screenVisibility.js` NOT touched
- [x] `api.js` NOT touched (cache layer unaffected)
- [x] Existing Phase 1 + Phase 2 code reviewed — 672 lines, well-structured, 4 sections
- [x] `useRestaurantMap` dependency verified (CR-023, `hooks/useRestaurantMap.js`)

## Change Summary

| Metric | Value |
|--------|-------|
| Files changed | 1 (`StockDetailPanel.jsx`) |
| Gaps to fix | 2 (store name resolution + action buttons) |
| New files | 0 |
| New API calls | 0 (useRestaurantMap already fetches hierarchy data) |
| Cache changes | 0 |
| Risk level | LOW |

## Scope of Changes

### GAP-1: Source Store Name Resolution

**Current (L282):** `Store #{seg.source_restaurant_id}`
**After:** `restaurantMap[String(seg.source_restaurant_id)]?.name || \`Store #${seg.source_restaurant_id}\``

- Import `useRestaurantMap` in main component
- Pass `restaurantMap` as prop to `BatchInventorySection`
- Fallback to `Store #{id}` preserved for unmapped IDs

### GAP-2: Action Buttons

**Current:** "Record Wastage" / "Dispatch" text with no `onClick`
**After:** Wire as `navigate()` links:
- Expired batch → "Record Wastage" → `navigate('/wastage')`
- Near-expiry batch → "Dispatch" → `navigate('/dispatch/new')`

Both are simple navigation, no pre-fill context (would require form architecture changes — out of scope).

## Gate Decision

**APPROVED** — proceed to implementation. Rationale:
- 1 file, 2 targeted fixes
- No new API calls, no cache changes, no new dependencies (useRestaurantMap already in the app)
- Fallbacks preserved for edge cases
- Phase 1 + Phase 2 code is stable and well-tested by prior agents
- Remaining work is cosmetic polish, not structural

---

*Proceed to implementation.*
