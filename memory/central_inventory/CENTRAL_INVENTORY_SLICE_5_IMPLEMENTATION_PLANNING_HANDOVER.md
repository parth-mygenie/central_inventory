# Central Inventory Slice 5 — Implementation Planning Handover

> **Date:** 23 May 2026
> **From:** Slice 5 Implementation Planning Agent
> **To:** Slice 5 Implementation Agent

---

## 1. Planning Document

**Path:** `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_IMPLEMENTATION_PLAN.md`

**Status:** `implementation_plan_ready_owner_approval_required`

---

## 2. Approved Scope

| Category | Count |
|----------|-------|
| Must-have items | 7 |
| Should-have items | 4 |
| File targets | 10 (5 new + 5 modified) |
| APIs needed | 4 new + 2 existing = 6 |
| Baseline decisions confirmed | 20 |
| Pending owner questions | 0 |

---

## 3. File Targets Summary

### New Files (5)

| # | File | Purpose |
|---|------|---------|
| 1 | `StockAdjustmentForm.jsx` | Central-only stock adjustment form |
| 2 | `WastageEntryForm.jsx` | All-role wastage entry form |
| 3 | `WastageReport.jsx` | Read-only wastage report view |
| 4 | `reasonCategories.js` | Predefined reason categories config |
| 5 | (Edit Transfer form — conditional on API discovery) | Should-have |

### Modified Files (5)

| # | File | Change |
|---|------|--------|
| 1 | `api.js` | Add 4 API methods |
| 2 | `App.js` | Add 3 routes |
| 3 | `OperationsHub.jsx` | Add Adjust Stock + Record Wastage buttons |
| 4 | `HistoryLedger.jsx` | Add 3 new movement types to ledger |
| 5 | `ContextSelector.jsx` | Banner text update (should-have) |

---

## 4. API Readiness

| API | Status |
|-----|--------|
| Decrease Adjustment | verified_ready |
| Record Wastage | verified_ready |
| Wastage Report | verified_ready_with_notes |
| add-stock (Increase) | partially_verified_more_evidence_needed |
| Edit Transfer (update) | blocked_payload_unclear (should-have) |

---

## 5. Role/Permission Matrix

| Action | Central | Master | Outlet |
|--------|---------|--------|--------|
| Stock Adjustment | allowed | hidden | hidden |
| Record Wastage | allowed | allowed | allowed |
| Wastage Report | all stores | own + children | own only |

---

## 6. Key Risks

| # | Risk | Severity |
|---|------|----------|
| 1 | add-stock increase API payload unknown | MEDIUM |
| 2 | Adjustment history API may not exist | MEDIUM |
| 3 | Edit Transfer API unknown | MEDIUM |
| 4 | Permission leakage | MEDIUM |

---

## 7. Owner Approval Required

Owner must approve implementation plan before Slice 5 implementation begins.

---

## 8. Recommended Next Agent

### `Central Inventory Slice 5 Implementation Agent`

**Implementation: 8 phases, ~10 file targets, zero pending decisions.**

**Credentials:**
- Central: `abhishek@kalabahia.com` / `Qplazm@10`
- Master: `owner@democentral1.com` / `Qplazm@10`
- Outlet: `owner@demofranchise1.com` / `Qplazm@10`

---

*End of Handover*
