# Central Inventory Slice 5 Phase 4 Handoff

> **Date:** 24 May 2026
> **From:** Phase 3 Wastage Entry Flow Implementation Agent
> **To:** Phase 4 Wastage Report + Read-Only Visibility Implementation Agent

---

## 1. Phase 3 Report Path

`/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_3_IMPLEMENTATION_REPORT.md`

## 2. Phase 4 Recommended Agent

`Central Inventory Slice 5 Phase 4 Wastage Report + Read-Only Visibility Implementation Agent`

## 3. Phase 4 Scope

Wastage Report + read-only visibility only. Corresponds to Implementation Plan MH-4 (Section 9) and Section 11.3.

## 4. Phase 4 Allowed Work

### 4.1 Create `WastageReport.jsx`

- **Route:** `/wastage/report`
- **Entry point:** Operations Hub or sidebar, or from WastageEntryForm (implementation plan says: "Operations Hub or sidebar (if added), or from Wastage Entry form")
- **Role visibility:** Central=all stores, Master=own+children, Outlet=own only

### 4.2 Report Features

| Feature | Details |
|---------|---------|
| Data source | `api.getWastageReport()` from Phase 1 |
| Date range filter | Date picker for from/to dates |
| Table columns | Date, Store, Item, Quantity, Unit, Reason (at minimum) |
| Role scoping | Central: `restaurant_ids` = all stores. Master: own + children. Outlet: own only. |
| Empty state | "No wastage entries found" |
| Loading state | Loading skeleton |
| Error state | Error with retry |

### 4.3 API Integration

- `api.getWastageReport({ restaurantIds, fromDate, toDate })`
- Method already in `api.js` (Phase 1)
- Response shape needs discovery — API is verified_ready_with_notes

### 4.4 Route + Navigation Wiring

- Add `/wastage/report` route to `App.js` (inside protected routes)
- Add navigation entry point (sidebar or Operations Hub link)

## 5. Phase 4 Must Read

| # | Document | Path |
|---|----------|------|
| 1 | Phase 3 Implementation Report | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_3_IMPLEMENTATION_REPORT.md` |
| 2 | Phase 0 Baseline Lock | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_0_APPROVAL_AND_BASELINE_LOCK.md` |
| 3 | Slice 5 Implementation Plan (Section 9 MH-4, Section 11.3) | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_IMPLEMENTATION_PLAN.md` |
| 4 | Phase 1 `api.js` (`getWastageReport` at line 182) | `/app/frontend/src/services/api.js` |
| 5 | Existing `HistoryLedger.jsx` (table pattern reference) | `/app/frontend/src/components/central-inventory/HistoryLedger.jsx` |
| 6 | Existing `DateRangePicker.jsx` | `/app/frontend/src/components/common/DateRangePicker.jsx` |
| 7 | `useLoginContext.js` (for restaurantId, hierarchy helpers) | `/app/frontend/src/hooks/useLoginContext.js` |
| 8 | `screenVisibility.js` (screen access for wastage report) | `/app/frontend/src/lib/screenVisibility.js` |
| 9 | Seed data `seed_data.py` (restaurant hierarchy for scoping) | `/app/backend/seed_data.py` |

## 6. Phase 4 Must NOT Do

1. Do NOT expand or modify `StockAdjustmentForm.jsx`
2. Do NOT expand or modify `WastageEntryForm.jsx` (except linking to report if needed)
3. Do NOT modify `HistoryLedger.jsx` — Phase 5 scope
4. Do NOT modify `ContextSelector.jsx` banner — Phase 6 scope
5. Do NOT implement Stock Return, Lateral Transfers, or Edit Transfer
6. Do NOT modify backend code
7. Do NOT update `/app/memory/final/`

## 7. Phase 4 Stop Gate

Phase 4 is complete when:

1. `WastageReport.jsx` created and functional
2. `/wastage/report` route added to `App.js`
3. Navigation entry point added
4. All 3 roles see correctly scoped data
5. Date range filter works
6. Empty/loading/error states work
7. Build passes
8. Phase 4 implementation report created at `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_4_IMPLEMENTATION_REPORT.md`
9. Stop before Phase 5

## 8. Credentials for Testing

| Role | Email | Password |
|------|-------|----------|
| Central Store | `abhishek@kalabahia.com` | `Qplazm@10` |
| Master Store | `owner@democentral1.com` | `Qplazm@10` |
| Outlet | `owner@demofranchise1.com` | `Qplazm@10` |

## 9. API Response Shape Discovery Note

The `getWastageReport` API is verified_ready_with_notes. The exact response shape needs discovery during Phase 4 implementation. The Phase 4 agent should:
1. Call the API through the proxy to discover the response structure
2. Handle the actual response shape (may differ from estimated payload)
3. Document the discovered response shape in the Phase 4 report

---

*End of Phase 4 Handoff*
