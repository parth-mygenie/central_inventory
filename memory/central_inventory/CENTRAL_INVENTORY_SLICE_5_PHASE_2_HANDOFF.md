# Central Inventory Slice 5 Phase 2 Handoff

> **Date:** 23 May 2026
> **From:** Phase 1 API/Foundation Implementation Agent
> **To:** Phase 2 Stock Adjustment Flow Implementation Agent

---

## 1. Phase 1 Report Path

`/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_1_IMPLEMENTATION_REPORT.md`

## 2. Phase 2 Recommended Agent

`Central Inventory Slice 5 Phase 2 Stock Adjustment Flow Implementation Agent`

## 3. Phase 2 Scope

Stock Adjustment flow only (Central Store manager). Corresponds to Implementation Plan MH-1 (Section 9) and Section 11.1.

## 4. Phase 2 Allowed Work

### 4.1 Create `StockAdjustmentForm.jsx`

- **Route:** `/adjustment/new`
- **Entry point:** Operations Hub "Adjust Stock" button (Central only)
- **Role gating:** `canDo("adjust-stock")` — Central only. Others see `PermissionDenied`.

### 4.2 Form Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Type | Toggle (Increase/Decrease) | YES | Controls API method and source selector visibility |
| Item | Dropdown from inventory master | YES | Uses `api.getInventoryMaster()` |
| Quantity | Number input | YES | Validated via `validateQuantityForUnit()` |
| Unit | Read-only (from selected item) | Auto | |
| Source Segment | SourceSelector component | YES (decrease only) | Uses `api.getSourceOptions()`. Hidden for increase. |
| Reason | Dropdown from `ADJUSTMENT_REASONS` | YES | Import from `@/lib/reasonCategories`. "Other" shows free-text input. |

### 4.3 API Integration

- **Decrease:** `api.adjustStockDecrease({ sourceInventoryMasterId, quantity, unit, sourceSelector: { mode: "segment_id", segment_id }, reason })`
- **Increase:** `api.adjustStockIncrease({ sourceInventoryMasterId, quantity, unit, reason })`
- Both methods already in `api.js` (Phase 1).

### 4.4 UX Patterns (reuse from Slice 4)

- `useWriteAction` hook for submitting state + toast + error mapping
- `ConfirmActionDialog` for confirmation before submit
- Toast: "Stock increased — [item] +[qty] [unit]" or "Stock decreased — [item] -[qty] [unit]"
- Error: mapped via `mapApiErrorMessage()`
- On success: navigate back to Operations Hub

### 4.5 Route + Navigation Wiring

- Add `/adjustment/new` route to `App.js` (inside protected routes)
- Add "Adjust Stock" button to `OperationsHub.jsx` (visible when `canDo("adjust-stock")`)
- Button navigates to `/adjustment/new`

### 4.6 Validation

| Field | Rule | Error |
|-------|------|-------|
| Type | Required | "Select adjustment type" |
| Item | Required | "Select an item" |
| Quantity | > 0, UOM valid | "Quantity must be greater than 0" |
| Reason | Required (predefined category) | "Select a reason" |
| Source segment (decrease) | Required | "Select source segment" |

## 5. Phase 2 Must Read

| # | Document | Path |
|---|----------|------|
| 1 | Phase 1 Implementation Report | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_1_IMPLEMENTATION_REPORT.md` |
| 2 | Phase 0 Baseline Lock | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_0_APPROVAL_AND_BASELINE_LOCK.md` |
| 3 | Slice 5 Implementation Plan (Section 9 MH-1, Section 11.1) | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_IMPLEMENTATION_PLAN.md` |
| 4 | Existing `DirectDispatchForm.jsx` (form pattern reference) | `/app/frontend/src/components/central-inventory/DirectDispatchForm.jsx` |
| 5 | Existing `SourceSelector.jsx` | `/app/frontend/src/components/central-inventory/SourceSelector.jsx` |
| 6 | Existing `useWriteAction.js` | `/app/frontend/src/hooks/useWriteAction.js` |
| 7 | Existing `ConfirmActionDialog.jsx` | `/app/frontend/src/components/central-inventory/ConfirmActionDialog.jsx` |
| 8 | Existing `screenVisibility.js` | `/app/frontend/src/lib/screenVisibility.js` |
| 9 | Phase 1 `api.js` (new methods at lines 149–188) | `/app/frontend/src/services/api.js` |
| 10 | Phase 1 `reasonCategories.js` | `/app/frontend/src/lib/reasonCategories.js` |

## 6. Phase 2 Must NOT Do

1. Do NOT create `WastageEntryForm.jsx` — Phase 3 scope
2. Do NOT create `WastageReport.jsx` — Phase 4 scope
3. Do NOT modify `HistoryLedger.jsx` — Phase 5 scope
4. Do NOT modify `ContextSelector.jsx` banner — Phase 6 scope
5. Do NOT implement Stock Return, Lateral Transfers, or Edit Transfer
6. Do NOT modify backend code (`server.py`, `seed_data.py`)
7. Do NOT update `/app/memory/final/`
8. Do NOT add "Record Wastage" button to OperationsHub (Phase 3)
9. Do NOT add `/wastage/new` or `/wastage/report` routes (Phase 3/4)

## 7. Phase 2 Stop Gate

Phase 2 is complete when:

1. `StockAdjustmentForm.jsx` created and functional
2. `/adjustment/new` route added to `App.js`
3. "Adjust Stock" button added to `OperationsHub.jsx` (Central only)
4. Central user can increase and decrease stock via form
5. Master/Outlet users cannot access the form (PermissionDenied)
6. Confirmation dialog works
7. Toast feedback works (success + error)
8. UOM validation works
9. Duplicate prevention works (button disabled during submit)
10. Build passes
11. Phase 2 implementation report created at `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_2_IMPLEMENTATION_REPORT.md`
12. Stop before Phase 3

## 8. Credentials for Testing

| Role | Email | Password |
|------|-------|----------|
| Central Store | `abhishek@kalabahia.com` | `Qplazm@10` |
| Master Store | `owner@democentral1.com` | `Qplazm@10` |
| Outlet | `owner@demofranchise1.com` | `Qplazm@10` |

## 9. add-stock Payload Risk Note

The `adjustStockIncrease()` API method uses an estimated payload shape. During Phase 2 implementation, if the proxy returns an unexpected error for increase operations, the Phase 2 agent should:
1. Test a minimal payload via curl through the generic proxy
2. Adjust the `adjustStockIncrease()` method if needed
3. Document any payload changes in the Phase 2 report

The decrease API (`adjustStockDecrease`) is verified_ready and should work without issues.

---

*End of Phase 2 Handoff*
