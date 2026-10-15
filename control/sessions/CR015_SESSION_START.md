# Session-Start — CR-015: P24 FEFO Batch Stock Detail Panel (Artifact #0)

> **Date:** 2026-06-13
> **Agent:** E1
> **Sprint:** S3
> **Item ID:** CR-015
> **Item Title:** P24 — FEFO Batch Stock Detail Panel
> **Item Type:** CR
> **Branch:** 13-6-26

---

## What I'm Working On

CR-015 is ~95% built (Phase 1 + Phase 2 complete, Phase 3 ~90%). This session addresses the 2 gaps
identified in the post-implementation validation (§11.4 of the planning doc):

1. **GAP-1:** Source store name shows `Store #807` instead of real name — wire `useRestaurantMap` (CR-023)
2. **GAP-2:** "Record Wastage" / "Dispatch" action buttons in batch table have no click handlers

Plus: smoke test against live 806 hierarchy data, verify wastage segment_snapshot, governance closure.

## Files I Expect to Touch

| File | Action | Reason |
|------|--------|--------|
| `frontend/src/components/central-inventory/StockDetailPanel.jsx` | MODIFY | GAP-1: import `useRestaurantMap`, resolve source store names. GAP-2: wire or remove action buttons |

## Pre-Conditions Verified

- [x] Read `control/L1_CONTROL_DASHBOARD.md` — S3 active, CR-015 PLANNED
- [x] Read `control/L6_SPRINT_STATUS.md` — CR-015 assigned to S3
- [x] Checked `control/registry.json` — CR-015 exists, status PLANNED, sprint_key S3
- [x] Checked `control/L7_FILE_OWNERSHIP.md` — `StockDetailPanel.jsx` not frozen
- [x] Terminology mapping understood (backend `master` = business Central Store)
- [x] Read planning doc `AI/Plans/phase3/P24_fefo_batch_stock_planning.md` including §11 validation
- [x] Read API addendum `AI/Plans/api_implementation_status_p24_addendum.md` — FEFO proven operational
- [x] Verified `useRestaurantMap` hook exists (CR-023) and is available for import
- [x] Verified cache invalidation covers `getStockDetail:` prefix (api.js L133)

## Risks / Concerns

1. **806 hierarchy may have different data than legacy rid=1 test data** — original API probes were against rid=1 stores. Smoke test against 806 will reveal if response shapes differ.
2. **`useRestaurantMap` may not include source stores** — if `source_restaurant_id` references a store outside the logged-in user's hierarchy scope, the map won't have it. Fallback to `Store #{id}` is safe.
3. **No wastage records with FEFO audit** — all existing wastage records have `segment_allocations_json=null` (addendum §2). `segment_snapshot` rendering may have nothing to display.

## Exit Criteria

- Source store names display as real store names in batch table (not `Store #ID`)
- Action buttons either navigate to correct screens or are cleanly removed
- Smoke test passes against 806 hierarchy (panel loads, data renders correctly)
- All governance artifacts (0-6) complete
- CR-015 status → CLOSED in registry

---

*After session: update registry.json artifact refs and run the generator.*
