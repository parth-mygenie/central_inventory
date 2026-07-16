# Central Inventory Slice 5 — Phase 1 Handoff

> **Date:** 23 May 2026
> **From:** Phase 0 Approval + Baseline Lock Agent
> **To:** Phase 1 API/Foundation Implementation Agent

---

## 1. Phase 0 Lock Document Path

`/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_0_APPROVAL_AND_BASELINE_LOCK.md`

## 2. Implementation Plan Path

`/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_IMPLEMENTATION_PLAN.md`

## 3. Phase 1 Scope

| # | Task | File | Type |
|---|------|------|------|
| 1 | Add `adjustStockIncrease()` API method | `src/services/api.js` | MODIFY |
| 2 | Add `adjustStockDecrease()` API method | `src/services/api.js` | MODIFY |
| 3 | Add `recordWastage()` API method | `src/services/api.js` | MODIFY |
| 4 | Add `getWastageReport()` API method | `src/services/api.js` | MODIFY |
| 5 | Create predefined reason categories config | `src/lib/reasonCategories.js` | NEW |
| 6 | (Optional) Discover `add-stock` payload shape via proxy | N/A — API exploration | INVESTIGATION |

### Reason Categories to Implement (Q-S5-003: B)

**Adjustment:**
- Counting Error
- System Correction
- Opening Balance
- Quality Issue
- Other

**Wastage:**
- Expired
- Spoiled
- Damaged
- Spillage
- Pest/Contamination
- Other

## 4. Files Phase 1 Is Allowed to Touch

| File | Allowed Change |
|------|---------------|
| `src/services/api.js` | Add 4 new API method functions + export them |
| `src/lib/reasonCategories.js` | Create new file with category arrays |

## 5. Files Phase 1 Must NOT Touch

| File | Reason |
|------|--------|
| `src/App.js` | Routes are Phase 2/3 scope |
| `src/components/central-inventory/OperationsHub.jsx` | Buttons are Phase 2/3 scope |
| `src/components/central-inventory/HistoryLedger.jsx` | Ledger extension is Phase 5 scope |
| `src/components/central-inventory/ContextSelector.jsx` | Banner update is Phase 6 scope |
| `src/components/layout/Sidebar.jsx` | Navigation changes are Phase 2/3 scope |
| `backend/server.py` | No backend changes in Slice 5 |
| `backend/seed_data.py` | No backend changes in Slice 5 |
| Any file under `/app/memory/final/` | Excluded from all phases |

## 6. API/Client/Config Items to Implement

### API Methods (add to `api.js`)

| Method | Endpoint | Payload Reference |
|--------|----------|-------------------|
| `adjustStockDecrease(payload)` | `POST /proxy/v2/inventory-transfer/decrease-adjustment` | `{ source_inventory_master_id, quantity, unit, source_selector: { mode: "segment_id", segment_id }, reason }` |
| `adjustStockIncrease(payload)` | `POST /proxy/v2/inventory/add-stock` | `{ source_inventory_master_id, quantity, unit, reason }` (estimated — verify via proxy) |
| `recordWastage(payload)` | `POST /proxy/v2/inventory/record-wastage` | `{ source_inventory_master_id, quantity, unit, source_selector: { mode: "segment_id", segment_id }, reason }` |
| `getWastageReport(payload)` | `POST /proxy/v2/inventory/wastage-report` | `{ restaurant_ids: [number], from_date, to_date }` (estimated) |

### Config File (`reasonCategories.js`)

Export two arrays:
- `ADJUSTMENT_REASONS` — 5 items
- `WASTAGE_REASONS` — 6 items

Each item should have `{ value: string, label: string }` shape for use in dropdown selects.

## 7. Explicit Non-Goals for Phase 1

1. Do NOT create any React component files (no forms, no reports, no dialogs)
2. Do NOT add routes
3. Do NOT add navigation items
4. Do NOT add buttons to existing screens
5. Do NOT modify `HistoryLedger.jsx`
6. Do NOT modify backend
7. Do NOT call stock-changing APIs against live preprod data
8. Do NOT expand scope to Stock Return, Lateral Transfers, or Edit Transfer
9. Do NOT update `/app/memory/final/`

## 8. Required Build/Check Command

After changes:
- Frontend must compile without errors: verify via `tail -n 10 /var/log/supervisor/frontend.out.log` showing `webpack compiled successfully`
- No regression: verify existing pages still load (login page, Operations Hub)

## 9. Phase 1 Stop Gate

Phase 1 is complete when:
1. 4 API methods added to `api.js` and exported
2. `reasonCategories.js` created with correct categories
3. Frontend compiles without errors
4. No regression on existing functionality
5. Phase 1 implementation report created

## 10. Required Phase 1 Report Path

`/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_1_IMPLEMENTATION_REPORT.md`

Report must include:
- Files changed/created
- API methods added (with payload shapes)
- Build verification result
- Regression check result
- Any API discovery findings (add-stock payload)
- Recommendation for Phase 2

---

*End of Phase 1 Handoff*
