# Central Inventory Slice 5 Phase 3 Handoff

> **Date:** 23 May 2026
> **From:** Phase 2 Stock Adjustment Flow Implementation Agent
> **To:** Phase 3 Wastage Entry Flow Implementation Agent

---

## 1. Phase 2 Report Path

`/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_2_IMPLEMENTATION_REPORT.md`

## 2. Phase 3 Recommended Agent

`Central Inventory Slice 5 Phase 3 Wastage Entry Flow Implementation Agent`

## 3. Phase 3 Scope

Wastage Entry flow only. Corresponds to Implementation Plan MH-2 (Section 9) and Section 11.2.

## 4. Phase 3 Allowed Work

### 4.1 Create `WastageEntryForm.jsx`

- **Route:** `/wastage/new`
- **Entry point:** Operations Hub "Record Wastage" button (all roles)
- **Role gating:** `canDo("record-wastage")` — all roles at own store level.

### 4.2 Form Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Item | Dropdown from inventory master | YES | Uses `api.getInventoryMaster()` |
| Quantity | Number input | YES | Validated via `validateQuantityForUnit()` |
| Unit | Read-only (from selected item) | Auto | |
| Source Segment | SourceSelector component | YES | Uses `api.getSourceOptions()` — waste from specific segment |
| Reason | Dropdown from `WASTAGE_REASONS` | YES | Import from `@/lib/reasonCategories`. "Other" shows free-text input. |

### 4.3 API Integration

- `api.recordWastage({ sourceInventoryMasterId, quantity, unit, sourceSelector: { mode: "segment_id", segment_id }, reason })`
- Method already in `api.js` (Phase 1).

### 4.4 UX Patterns (reuse from Phase 2 / Slice 4)

- `useWriteAction` hook for submitting state + toast + error mapping
- `ConfirmActionDialog` for confirmation before submit
- Toast: "Wastage recorded — [item] [qty] [unit]"
- Error: mapped via `mapApiErrorMessage()`
- On success: navigate back to Operations Hub

### 4.5 Route + Navigation Wiring

- Add `/wastage/new` route to `App.js` (inside protected routes)
- Add "Record Wastage" button to `OperationsHub.jsx` (visible when `canDo("record-wastage")` — all roles)
- Button navigates to `/wastage/new`

### 4.6 Validation

| Field | Rule | Error |
|-------|------|-------|
| Item | Required | "Select an item" |
| Quantity | > 0, UOM valid | "Quantity must be greater than 0" |
| Reason | Required (predefined category) | "Select a reason" |
| Source segment | Required | "Select source segment" |

## 5. Phase 3 Must Read

| # | Document | Path |
|---|----------|------|
| 1 | Phase 2 Implementation Report | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_2_IMPLEMENTATION_REPORT.md` |
| 2 | Phase 0 Baseline Lock | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_0_APPROVAL_AND_BASELINE_LOCK.md` |
| 3 | Slice 5 Implementation Plan (Section 9 MH-2, Section 11.2) | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_IMPLEMENTATION_PLAN.md` |
| 4 | Phase 2 `StockAdjustmentForm.jsx` (pattern reference) | `/app/frontend/src/components/central-inventory/StockAdjustmentForm.jsx` |
| 5 | Existing `SourceSelector.jsx` | `/app/frontend/src/components/central-inventory/SourceSelector.jsx` |
| 6 | Existing `useWriteAction.js` | `/app/frontend/src/hooks/useWriteAction.js` |
| 7 | Existing `ConfirmActionDialog.jsx` | `/app/frontend/src/components/central-inventory/ConfirmActionDialog.jsx` |
| 8 | Existing `screenVisibility.js` | `/app/frontend/src/lib/screenVisibility.js` |
| 9 | Phase 1 `api.js` (`recordWastage` at line 172) | `/app/frontend/src/services/api.js` |
| 10 | Phase 1 `reasonCategories.js` (`WASTAGE_REASONS`) | `/app/frontend/src/lib/reasonCategories.js` |

## 6. Phase 3 Must NOT Do

1. Do NOT expand or modify `StockAdjustmentForm.jsx`
2. Do NOT create `WastageReport.jsx` — Phase 4 scope
3. Do NOT modify `HistoryLedger.jsx` — Phase 5 scope
4. Do NOT modify `ContextSelector.jsx` banner — Phase 6 scope
5. Do NOT implement Stock Return, Lateral Transfers, or Edit Transfer
6. Do NOT modify backend code (`server.py`, `seed_data.py`)
7. Do NOT update `/app/memory/final/`
8. Do NOT add `/wastage/report` route (Phase 4)

## 7. Phase 3 Stop Gate

Phase 3 is complete when:

1. `WastageEntryForm.jsx` created and functional
2. `/wastage/new` route added to `App.js`
3. "Record Wastage" button added to `OperationsHub.jsx` (all roles)
4. All 3 roles can record wastage at own store level
5. Confirmation dialog works
6. Toast feedback works (success + error)
7. UOM validation works
8. Duplicate prevention works (button disabled during submit)
9. Build passes
10. Phase 3 implementation report created at `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_3_IMPLEMENTATION_REPORT.md`
11. Stop before Phase 4

## 8. Credentials for Testing

| Role | Email | Password |
|------|-------|----------|
| Central Store | `abhishek@kalabahia.com` | `Qplazm@10` |
| Master Store | `owner@democentral1.com` | `Qplazm@10` |
| Outlet | `owner@demofranchise1.com` | `Qplazm@10` |

## 9. Pattern Reference

Phase 3 can closely follow the `StockAdjustmentForm.jsx` pattern from Phase 2 with these differences:

| Aspect | StockAdjustmentForm (Phase 2) | WastageEntryForm (Phase 3) |
|--------|-------------------------------|---------------------------|
| Role gating | `canDo("adjust-stock")` — Central only | `canDo("record-wastage")` — all roles |
| Type toggle | Increase/Decrease | Not needed — wastage is always reduction |
| Source selector | Required for decrease only | Always required |
| API method | `adjustStockIncrease` / `adjustStockDecrease` | `recordWastage` |
| Reason categories | `ADJUSTMENT_REASONS` (5) | `WASTAGE_REASONS` (6) |
| Success toast | "Stock increased/decreased — ..." | "Wastage recorded — [item] [qty] [unit]" |

---

*End of Phase 3 Handoff*
