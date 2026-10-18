# Central Inventory Slice 5 Phase 5 Handoff

> **Date:** 24 May 2026
> **From:** Phase 4 Wastage Report + Read-Only Visibility Implementation Agent
> **To:** Phase 5 Ledger / History Integration Implementation Agent

---

## 1. Phase 4 Report Path

`/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_4_IMPLEMENTATION_REPORT.md`

## 2. Phase 5 Recommended Agent

`Central Inventory Slice 5 Phase 5 Ledger / History Integration Implementation Agent`

## 3. Phase 5 Scope

Ledger / History Integration for Slice 5 actions only. Corresponds to Implementation Plan MH-3 (Section 9) and Section 13.

## 4. Phase 5 Allowed Work

### 4.1 Extend `HistoryLedger.jsx`

Add 3 new movement types to `MOVEMENT_TYPES`:
- `adjustment_increase` — "Adjustment (Increase)", direction: In
- `adjustment_decrease` — "Adjustment (Decrease)", direction: Out
- `wastage` — "Wastage", direction: Out

### 4.2 Extend `deriveLedgerEntries()`

Extend the existing ledger data derivation to include wastage entries. The wastage report API (`getWastageReport`) can provide wastage entries that should be merged into the ledger view.

### 4.3 Movement Type Filter

Add filter pills for the 3 new movement types alongside existing 4 types (Transfer Out, Transfer In, Partial Receive, Reversal).

### 4.4 Ledger Entry Display

For each new entry type:
- Movement Type: label from `MOVEMENT_TYPES`
- Direction: In (increase) or Out (decrease/wastage)
- Before/After: "—" (not available from API per Q-S3-010: A)
- Reason/Note: display reason from entry
- Actor/User: display user ID (no name resolution per Q-S3-007: A)
- Reference: adjustment/wastage reference ID if available

## 5. Phase 5 Must Read

| # | Document | Path |
|---|----------|------|
| 1 | Phase 4 Implementation Report | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_4_IMPLEMENTATION_REPORT.md` |
| 2 | Phase 0 Baseline Lock (Section 9) | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_0_APPROVAL_AND_BASELINE_LOCK.md` |
| 3 | Slice 5 Implementation Plan (Section 9 MH-3, Section 13) | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_IMPLEMENTATION_PLAN.md` |
| 4 | Existing `HistoryLedger.jsx` | `/app/frontend/src/components/central-inventory/HistoryLedger.jsx` |
| 5 | Phase 1 `api.js` (`getWastageReport`) | `/app/frontend/src/services/api.js` |
| 6 | Phase 4 `WastageReport.jsx` (API response handling reference) | `/app/frontend/src/components/central-inventory/WastageReport.jsx` |

## 6. Phase 5 Must NOT Do

1. Do NOT expand or modify `StockAdjustmentForm.jsx`
2. Do NOT expand or modify `WastageEntryForm.jsx`
3. Do NOT expand or modify `WastageReport.jsx` beyond linking from ledger if needed
4. Do NOT modify `ContextSelector.jsx` banner — Phase 6 scope
5. Do NOT implement Stock Return, Lateral Transfers, or Edit Transfer
6. Do NOT modify backend code
7. Do NOT update `/app/memory/final/`

## 7. Phase 5 Stop Gate

Phase 5 is complete when:

1. 3 new movement types added to `MOVEMENT_TYPES` in `HistoryLedger.jsx`
2. Wastage entries merged into ledger if API data is available
3. Movement type filter pills include new types
4. Before/After shows "—" for new entry types
5. Reason/note displays for new entry types
6. Build passes
7. Phase 5 implementation report created at `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_5_IMPLEMENTATION_REPORT.md`
8. Stop before Phase 6

## 8. Credentials for Testing

| Role | Email | Password |
|------|-------|----------|
| Central Store | `abhishek@kalabahia.com` | `Qplazm@10` |
| Master Store | `owner@democentral1.com` | `Qplazm@10` |
| Outlet | `owner@demofranchise1.com` | `Qplazm@10` |

## 9. Key Risk

The adjustment history API may not exist (Implementation Plan Risk #3). If no API provides adjustment entries, the ledger will only show wastage entries for the new movement types. This is documented as an accepted risk.

---

*End of Phase 5 Handoff*
