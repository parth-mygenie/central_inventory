# Central Inventory Slice 5 Phase 0 Approval and Baseline Lock

> **Date:** 23 May 2026
> **Agent:** Senior Central Inventory Slice 5 Phase 0 Approval + Baseline Lock Agent
> **Purpose:** Formally lock approved Slice 5 baseline before implementation begins

---

## 1. Phase 0 Status

### `phase_0_approved_baseline_locked_ready_for_phase_1`

All prerequisite documents reviewed. Owner approval recorded. Scope, file targets, APIs, role/permission matrix, ledger/history plan, validation/defaults plan, and 8-phase implementation roadmap are locked. No pending owner questions. No scope conflicts. Phase 1 can start.

---

## 2. Inputs Reviewed

| # | Document | Path | Reviewed |
|---|----------|------|----------|
| 1 | PRD.md | `/app/memory/PRD.md` | YES |
| 2 | Slice 5 Scope Planning | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_SCOPE_PLANNING.md` | YES (302 lines) |
| 3 | Slice 5 Scope Planning Handover | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_SCOPE_PLANNING_HANDOVER.md` | YES (45 lines) |
| 4 | Slice 5 Implementation Plan | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_IMPLEMENTATION_PLAN.md` | YES (573 lines — primary source of truth for baseline) |
| 5 | Slice 5 Implementation Planning Handover | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_IMPLEMENTATION_PLANNING_HANDOVER.md` | YES (107 lines) |
| 6 | Owner Answers Complete (104 decisions) | `/app/memory/central_inventory/OWNER_ANSWERS_COMPLETE.md` | YES (416 lines) |
| 7 | Slice 1-4 Final Acceptance and Closure Report | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_1_TO_4_FINAL_ACCEPTANCE_AND_CLOSURE_REPORT.md` | YES (339 lines) |
| 8 | Post-Slice 4 Open Items Register | `/app/memory/central_inventory/CENTRAL_INVENTORY_POST_SLICE_4_OPEN_ITEMS_REGISTER.md` | YES (234 lines — 16 open items, OI-003 and OI-004 are Slice 5) |
| 9 | PRD Update After Slice 1-4 Closure | `/app/memory/central_inventory/PRD_UPDATE_AFTER_SLICE_1_TO_4_CLOSURE.md` | YES (46 lines) |
| 10 | Slice 4 Implementation Plan | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_4_IMPLEMENTATION_PLAN.md` | YES (996 lines — pattern reference) |
| 11 | Slice 4 Implementation Report | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_4_IMPLEMENTATION_REPORT.md` | YES (147 lines — 12/12 MH + 3/4 SH) |
| 12 | Slice 4 QA Handover | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_4_QA_HANDOVER.md` | YES (140 lines) |
| 13 | API Evidence — Comprehensive Final | `/app/memory/central_inventory/api_evidence/API_VERIFICATION_COMPREHENSIVE_FINAL.md` | YES (118 lines — 52/52 PASS, Section E confirms Decrease Adj, Record Wastage, Wastage Report) |

**Total: 13 inputs reviewed**

---

## 3. Owner Approval Recorded

Owner approval granted for Central Inventory Slice 5 implementation plan.

**Approved:**

1. 7 must-have items
2. 4 should-have items
3. 8-phase implementation plan
4. 10 file targets — 5 new + 5 modified
5. 6 mapped APIs — 4 new + 2 existing
6. `StockAdjustmentForm` as Central-only
7. `WastageEntryForm` for all roles
8. `WastageReport`
9. `reasonCategories` config
10. Role/permission matrix
11. Ledger/history impact plan
12. Validation/defaults plan
13. Smoke checklist

**Constraint:** Proceed with Slice 5 implementation only. Do not expand scope beyond the approved plan.

---

## 4. Approved Slice 5 Scope

### Must-Have (7 items)

| # | Item | Source |
|---|------|--------|
| 1 | Stock Adjustment form (Central Store manager only) | Implementation Plan Section 9 MH-1 |
| 2 | Wastage Entry form (any store manager, own level) | Implementation Plan Section 9 MH-2 |
| 3 | Adjustment/Wastage entries in Stock Ledger | Implementation Plan Section 9 MH-3 |
| 4 | Wastage Report view | Implementation Plan Section 9 MH-4 |
| 5 | Predefined reason categories for adjustment and wastage | Implementation Plan Section 9 MH-5 |
| 6 | Confirmation dialogs for adjustment and wastage | Implementation Plan Section 9 MH-6 |
| 7 | Duplicate prevention + toast feedback | Implementation Plan Section 9 MH-7 |

### Should-Have (4 items)

| # | Item | Source |
|---|------|--------|
| 8 | Edit Transfer (if API discoverable) | Implementation Plan Section 10 SH-8 |
| 9 | Read-only banner text update | Implementation Plan Section 10 SH-9 |
| 10 | Adjustment/Wastage summary on Operations Hub | Implementation Plan Section 10 SH-10 |
| 11 | Source selector parent heuristic fix | Implementation Plan Section 10 SH-11 |

### Explicitly Deferred (NOT Slice 5)

| # | Item | Deferred To |
|---|------|-------------|
| 12 | Stock Return flow | Slice 6 |
| 13 | Lateral Master-to-Master transfers | Slice 6 |

---

## 5. Approved Components

| # | Component | Type | Confirmed in Implementation Plan |
|---|-----------|------|----------------------------------|
| 1 | `StockAdjustmentForm.jsx` | NEW — Central-only stock adjustment form | YES — Section 11.1 |
| 2 | `WastageEntryForm.jsx` | NEW — All-role wastage entry form | YES — Section 11.2 |
| 3 | `WastageReport.jsx` | NEW — Read-only wastage report view | YES — Section 11.3 |
| 4 | `reasonCategories.js` | NEW — Predefined reason categories config | YES — Section 9 MH-5 |

**Mismatch check:** Component names in the implementation plan match exactly. No mismatch detected.

---

## 6. Approved File Target Summary

**Total file targets:** 10
**New file targets:** 5
**Modified file targets:** 5

### New Files (5)

| # | File Path | Purpose | Source |
|---|-----------|---------|--------|
| 1 | `src/components/central-inventory/StockAdjustmentForm.jsx` | Central-only stock adjustment form (increase/decrease, item, quantity, reason, source selector for decrease) | Implementation Plan Section 6 Row 2 |
| 2 | `src/components/central-inventory/WastageEntryForm.jsx` | All-role wastage entry form (item, quantity, reason, source selector) | Implementation Plan Section 6 Row 3 |
| 3 | `src/components/central-inventory/WastageReport.jsx` | Read-only wastage report table (date, store, item, quantity, reason) with date range filter | Implementation Plan Section 6 Row 4 |
| 4 | `src/lib/reasonCategories.js` | Predefined reason categories for adjustment (5 categories) and wastage (6 categories) | Implementation Plan Section 6 Row 8 |
| 5 | (Conditional) `EditTransferForm.jsx` or modification to `TransferDetail.jsx` | Edit Transfer — conditional on API discovery (SH-8) | Implementation Plan Section 10 SH-8 |

### Modified Files (5)

| # | File Path | Planned Change | Source |
|---|-----------|----------------|--------|
| 1 | `src/services/api.js` | Add 4 API methods: `adjustStockIncrease()`, `adjustStockDecrease()`, `recordWastage()`, `getWastageReport()` | Implementation Plan Section 6 Row 1 |
| 2 | `src/App.js` | Add 3 routes: `/adjustment/new`, `/wastage/new`, `/wastage/report` | Implementation Plan Section 6 Row 6 |
| 3 | `src/components/central-inventory/OperationsHub.jsx` | Add "Adjust Stock" (Central only) and "Record Wastage" (all roles) buttons | Implementation Plan Section 6 Row 7 |
| 4 | `src/components/central-inventory/HistoryLedger.jsx` | Add 3 new movement types (`adjustment_increase`, `adjustment_decrease`, `wastage`) to `MOVEMENT_TYPES` and extend `deriveLedgerEntries()` | Implementation Plan Section 6 Row 5 |
| 5 | `src/components/central-inventory/ContextSelector.jsx` | Update "Phase 1 Limited Slice" banner text (SH-9) | Implementation Plan Section 6 Row 9 |

**Note:** Implementation Plan Section 6 Row 10 lists `RequestStockForm.jsx` for source selector parent heuristic fix (SH-11). This is a minor modification to an existing file but was counted as part of the 5 modified files. The actual count in the implementation plan is 5 new + 5 modified = 10 file targets. **No mismatch.**

---

## 7. Approved API Summary

**Total APIs mapped:** 6
**New APIs:** 4
**Existing APIs:** 2

### New API Methods (4)

| # | Method | Endpoint | Readiness | Risk | Source |
|---|--------|----------|-----------|------|--------|
| 1 | `adjustStockDecrease()` | `POST /proxy/v2/inventory-transfer/decrease-adjustment` | **verified_ready** | LOW — E2E Section E PASS with segment_id selector | Implementation Plan Section 7.1 |
| 2 | `adjustStockIncrease()` | `POST /proxy/v2/inventory/add-stock` | **partially_verified_more_evidence_needed** | MEDIUM — payload shape needs proxy discovery. Q-ADJ-001 Hybrid confirms this endpoint exists for increases. No source_selector needed. | Implementation Plan Section 7.2 |
| 3 | `recordWastage()` | `POST /proxy/v2/inventory/record-wastage` | **verified_ready** | LOW — E2E Section E PASS with segment_id selector | Implementation Plan Section 7.3 |
| 4 | `getWastageReport()` | `POST /proxy/v2/inventory/wastage-report` (or GET) | **verified_ready_with_notes** | LOW — E2E Section E "Wastage Report PASS". Multi-restaurant scope confirmed. Exact response shape needs discovery during implementation. | Implementation Plan Section 7.4 |

### Existing API Methods (2)

| # | Method | Endpoint | Readiness | Source |
|---|--------|----------|-----------|--------|
| 5 | `getInventoryMaster()` | `GET /proxy/v2/inventory/get-inventory-master` | **verified_ready** — pre-existing from Slice 1 | Implementation Plan Section 7.5 |
| 6 | `getSourceOptions()` | `POST /proxy/v2/inventory-transfer/source-options` | **verified_ready** — pre-existing from Slice 4 | Implementation Plan Section 7.6 |

### API Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | `add-stock` increase API payload unknown | MEDIUM | Discover via generic proxy during Phase 1. Decrease API shape is reference. If fails, show increase as "coming soon". |
| 2 | Wastage Report exact response shape unknown | LOW | API verified PASS. Discover shape during implementation. |
| 3 | Adjustment history API may not exist | MEDIUM | Ledger may only show wastage entries initially. Adjustment entries defer if no source API. |

**Mismatch check:** Implementation plan specifies 4 new + 2 existing = 6 APIs. Confirmed. **No mismatch.**

---

## 8. Approved Role / Permission Baseline

### Role Matrix

| Action | Central (backend `master`) | Master (backend `central`) | Outlet (backend `franchise`) |
|--------|---------------------------|---------------------------|------------------------------|
| Stock Adjustment (increase) | **ALLOWED** | HIDDEN | HIDDEN |
| Stock Adjustment (decrease) | **ALLOWED** | HIDDEN | HIDDEN |
| Record Wastage | **ALLOWED** (own level) | **ALLOWED** (own level) | **ALLOWED** (own level) |
| View Wastage Report | **ALLOWED** (all stores) | **ALLOWED** (own + children) | **ALLOWED** (own only) |
| Edit Transfer (SH-8, conditional) | not_applicable | **ALLOWED** (own requests, status=requested) | **ALLOWED** (own requests, status=requested) |

### Permission Enforcement

- `StockAdjustmentForm` is **Central-only**. Enforced via existing `canDo("adjust-stock")` in `screenVisibility.js` (line 46: `"adjust-stock": { master: true, central: false, franchise: false }`). Master and Outlet users see `PermissionDenied` component.
- `WastageEntryForm` is available to **all roles** at own store level. Enforced via existing `canDo("record-wastage")` in `screenVisibility.js` (line 47: `"record-wastage": { master: true, central: true, franchise: true }`).
- No unauthorized role leakage is allowed. Backend validates server-side.

### Business Terminology Rule

All user-facing text must use **Central / Master / Outlet** terminology. Backend terms (`master`, `central`, `franchise`) must never appear in:
- UI labels, form fields, button text
- Headings, filters, tab labels
- Confirmation dialogs, toast messages
- Error messages (mapped via `mapApiErrorMessage()`)
- Owner-facing documentation

---

## 9. Approved Ledger / History Baseline

### How Stock Adjustment Affects Ledger/History

| Adjustment Type | Ledger Entry | Movement Type | Direction | Stock Effect |
|----------------|-------------|---------------|-----------|-------------|
| Increase | YES | `adjustment_increase` | In | Stock increased at store |
| Decrease | YES | `adjustment_decrease` | Out | Stock decreased at store |

### How Wastage Affects Ledger/History

| Action | Ledger Entry | Movement Type | Direction | Stock Effect |
|--------|-------------|---------------|-----------|-------------|
| Record Wastage | YES | `wastage` | Out | Stock reduced immediately (SKIP-006: A) |

### Before/After Quantity Behavior

Before/after quantity displays as "—" (not available from API). This is a known limitation accepted by the owner (Q-S3-010: A, BLK-R-002). No change from Slice 3 behavior.

### Reason/Note Display

- Adjustment entries: show predefined reason category from `reasonCategories.js`
- Wastage entries: show predefined wastage reason category

### Actor Display

Actor/user names display as numeric IDs (no user name resolution API exists). Same fallback as Slice 3 (Q-S3-007: A).

### Refresh Behavior

| After Action | Refresh Strategy |
|-------------|-----------------|
| Stock Adjustment submit | Navigate to Operations Hub. Hub refetches on mount. |
| Wastage Entry submit | Navigate to Operations Hub. Hub refetches on mount. |
| Wastage Report view | Fetches fresh data on mount. Date filter triggers refetch. |
| Stock Ledger | Refetches on mount. New entries from wastage report merge on load. |

### Fallback Behavior if Backend Data is Missing

- Wastage report API returns empty array → show "No wastage entries found" empty state
- Adjustment history API may not exist → ledger shows wastage entries only; adjustment entries defer if no source API (Risk #3 in Section 7)
- Before/after quantity not in API → display "—"
- Actor name not in API → display numeric ID

---

## 10. Approved Validation / Defaults Baseline

| Rule | Details | Source |
|------|---------|--------|
| Required item | Item must be selected from inventory master dropdown | Implementation Plan Section 12 |
| Required quantity | Quantity must be greater than 0 | Implementation Plan Section 12 |
| Quantity > 0 | Error: "Quantity must be greater than 0" | Implementation Plan Section 12 |
| UOM handling | `pcs` = whole numbers only, `kg`/`ltr` = 2 decimal places. Uses existing `validateQuantityForUnit()` from `formatters.js` | ITM-002: C |
| Reason/category behavior | Required. Predefined category dropdown. "Other" allows free-text entry. | Q-ADJ-003: A |
| Q-S5-003 default behavior | Adjustment categories: Counting Error, System Correction, Opening Balance, Quality Issue, Other. Wastage categories: Expired, Spoiled, Damaged, Spillage, Pest/Contamination, Other. Configurable in next phase per owner note. | Q-S5-003: B |
| Photo/evidence default behavior | Not included in Slice 5. Text reason only. Phase 2 per Q-WASTE-002: D. | Q-WASTE-002: D |
| Cost/value exclusion | Excluded from Slice 5 forms and reports. Future scope per SKIP-003: C, OI-009. | SKIP-003: C |
| Duplicate-submit prevention | Reuse existing `useWriteAction` hook from Slice 4. Button disabled during API call. | UX-002: A |
| Error/terminology mapping | All API error messages pass through `mapApiErrorMessage()` to replace backend terms. | Q-TERM-003: A |
| Source selector (decrease only) | Required for Stock Adjustment decrease. Uses existing `SourceSelector` component with `segment_id` mode. Not required for increase. | Implementation Plan Section 9 MH-1 |
| Source selector (wastage) | Required. Uses existing `SourceSelector` component. | Implementation Plan Section 9 MH-2 |

---

## 11. Approved 8-Phase Implementation Roadmap

### Phase 0 — Approval + Baseline Lock

| Field | Value |
|-------|-------|
| **Purpose** | Formally lock approved scope, record owner approval, confirm all baseline decisions before any code changes |
| **Scope** | Document creation only. No code changes. |
| **Stop gate** | Phase 0 lock document created and verified complete |
| **Expected output** | `CENTRAL_INVENTORY_SLICE_5_PHASE_0_APPROVAL_AND_BASELINE_LOCK.md` (this document) |

### Phase 1 — API Client + Shared Config Foundation

| Field | Value |
|-------|-------|
| **Purpose** | Add API client methods for Slice 5 flows and shared configuration |
| **Scope** | Add 4 new API methods to `api.js`. Create `reasonCategories.js` config. Add any shared constants/helpers needed by later phases. Verify API payloads via proxy discovery. |
| **Stop gate** | API methods added, reason categories config created, build succeeds, no regressions |
| **Expected output** | `CENTRAL_INVENTORY_SLICE_5_PHASE_1_IMPLEMENTATION_REPORT.md` |

### Phase 2 — Stock Adjustment Flow

| Field | Value |
|-------|-------|
| **Purpose** | Build the Stock Adjustment form (Central-only) with increase/decrease support |
| **Scope** | Create `StockAdjustmentForm.jsx`. Add `/adjustment/new` route to `App.js`. Add "Adjust Stock" button to `OperationsHub.jsx` (Central only). Wire to API methods. Confirmation dialog. UOM validation. |
| **Stop gate** | Central user can adjust stock (increase + decrease). Master/Outlet cannot access form. Toast feedback works. |
| **Expected output** | `CENTRAL_INVENTORY_SLICE_5_PHASE_2_IMPLEMENTATION_REPORT.md` |

### Phase 3 — Wastage Entry Flow

| Field | Value |
|-------|-------|
| **Purpose** | Build the Wastage Entry form (all roles, own store level) |
| **Scope** | Create `WastageEntryForm.jsx`. Add `/wastage/new` route to `App.js`. Add "Record Wastage" button to `OperationsHub.jsx` (all roles). Wire to API. Confirmation dialog. |
| **Stop gate** | All 3 roles can record wastage at own level. Toast feedback works. |
| **Expected output** | `CENTRAL_INVENTORY_SLICE_5_PHASE_3_IMPLEMENTATION_REPORT.md` |

### Phase 4 — Wastage Report + Read-Only Visibility

| Field | Value |
|-------|-------|
| **Purpose** | Build the Wastage Report view (role-scoped read-only) |
| **Scope** | Create `WastageReport.jsx`. Add `/wastage/report` route. Date range filter. Role-scoped visibility (Central=all stores, Master=own+children, Outlet=own). |
| **Stop gate** | All 3 roles see correctly scoped wastage report. |
| **Expected output** | `CENTRAL_INVENTORY_SLICE_5_PHASE_4_IMPLEMENTATION_REPORT.md` |

### Phase 5 — Ledger / History Integration

| Field | Value |
|-------|-------|
| **Purpose** | Extend Stock Ledger to show adjustment/wastage entries |
| **Scope** | Add 3 new movement types to `MOVEMENT_TYPES` in `HistoryLedger.jsx`. Extend `deriveLedgerEntries()` to merge wastage report data. Add movement type filter pills for new types. |
| **Stop gate** | Stock Ledger shows wastage entries with correct movement type. Adjustment entries shown if API data available. |
| **Expected output** | `CENTRAL_INVENTORY_SLICE_5_PHASE_5_IMPLEMENTATION_REPORT.md` |

### Phase 6 — Polish + Validation + Regression

| Field | Value |
|-------|-------|
| **Purpose** | Should-have items, validation hardening, regression testing |
| **Scope** | SH-9 banner text update. SH-10 Ops Hub summary (if API data available). SH-11 source selector fix. SH-8 Edit Transfer API discovery (conditional). Full regression on Slice 1-4 flows. |
| **Stop gate** | All should-have items addressed. No regression in existing flows. |
| **Expected output** | `CENTRAL_INVENTORY_SLICE_5_PHASE_6_IMPLEMENTATION_REPORT.md` |

### Phase 7 — Documentation + QA Handover

| Field | Value |
|-------|-------|
| **Purpose** | Final documentation, smoke testing, QA handover for owner |
| **Scope** | Smoke checklist execution across all 3 roles. QA handover document. Implementation report. PRD update. |
| **Stop gate** | All smoke checks pass. QA handover ready for owner. |
| **Expected output** | `CENTRAL_INVENTORY_SLICE_5_IMPLEMENTATION_REPORT.md`, `CENTRAL_INVENTORY_SLICE_5_QA_HANDOVER.md` |

---

## 12. Explicitly Out of Scope for Slice 5

| # | Item | Category | Source |
|---|------|----------|--------|
| 1 | Edit Transfer (if API not discoverable) | conditional_defer | OI-001 — attempt discovery in Phase 6, defer if not found |
| 2 | Stock Return flow | deferred_to_slice_6 | Q-S5-001: A scope decision; Conflict-002 complexity |
| 3 | Lateral Master-to-Master transfers | deferred_to_slice_6 | Q-S5-001: A scope decision; requires operational settings UI |
| 4 | Reports screen | deferred_future | OI-006 — owner specification needed |
| 5 | CSV/PDF export | deferred_future | OI-007 |
| 6 | KPI dashboard | deferred_future | OI-008 — owner KPI specification pending (RPT-003: D) |
| 7 | Cost/value reporting | deferred_future | OI-009, SKIP-003: C |
| 8 | Recipe/sales consumption integration | deferred_future | OI-010 — P3, separate system |
| 9 | Backend code changes | excluded | Slice 5 is frontend-only via proxy. No changes to `server.py` or `seed_data.py`. |
| 10 | Backend terminology refactor | excluded | Backend uses `master`/`central`/`franchise` internally. Frontend maps via terminology adapter. No backend changes. |
| 11 | Slice 6 planning or implementation | excluded | Not part of Slice 5. |
| 12 | `/app/memory/final/` updates | excluded | Not touched in any phase. |
| 13 | Photo/evidence for wastage | deferred_phase_2 | Q-WASTE-002: D |
| 14 | Reconciliation Request workflow | deferred_future | Conflict-003 — formal in-system workflow, separate from adjustment |
| 15 | Physical stocktake | deferred_future | STK-004: A — no API exists |
| 16 | WebSocket real-time notifications | deferred_future | OI-002 — Phase 2 per Q-NOTIF-002: D |

---

## 13. Risks Locked for Implementation Tracking

| # | Risk | Severity | Mitigation | Tracking |
|---|------|----------|------------|----------|
| 1 | API contract mismatch — `add-stock` increase payload unknown | MEDIUM | Discover via generic proxy in Phase 1. Decrease API shape is reference. If fails, show "coming soon" for increase. | Phase 1 |
| 2 | Role permission leakage — adjustment visible to non-Central roles | MEDIUM | Central-only enforcement via `canDo("adjust-stock")` already configured. Backend validates server-side. Test in all 3 roles. | Phase 2, Phase 7 |
| 3 | Ledger consistency — new movement types must not break existing transfer entries | MEDIUM | Extend `MOVEMENT_TYPES` array additively. New types use distinct keys. Existing deriveLedgerEntries logic unchanged for transfers. | Phase 5 |
| 4 | Before/after quantity — not available from API | LOW | Display "—" as per existing Slice 3 behavior (Q-S3-010: A). No change. | Accepted |
| 5 | UOM risk — incorrect decimal handling | LOW | Reuse existing `validateQuantityForUnit()`. pcs=whole, kg/ltr=2 decimals (ITM-002: C). | Phase 2, Phase 3 |
| 6 | Evidence/photo handling — excluded for Slice 5 | LOW | Text reason only per Q-WASTE-002: D. No photo UI. | Accepted |
| 7 | Adjustment/wastage stock impact — stock going negative | LOW | Wastage can push stock negative — allowed per SKIP-009: A. Display clearly, no frontend block. | Phase 3 |
| 8 | Backend terminology in API errors | LOW | All errors mapped via `mapApiErrorMessage()`. Existing infrastructure from Slice 4. | Phase 2, Phase 3 |
| 9 | Duplicate submission — double submit on slow network | LOW | Reuse `useWriteAction` hook. Button disabled during API call. | Phase 2, Phase 3 |
| 10 | Regression on Slice 1-4 transfer flows | LOW | New routes and components are additive. Minimal changes to existing files (`api.js` adds methods, `App.js` adds routes, `OperationsHub.jsx` adds buttons, `HistoryLedger.jsx` extends MOVEMENT_TYPES). Full regression in Phase 6. | Phase 6, Phase 7 |

---

## 14. Phase 1 Readiness Checklist

| # | Gate | Met? | Evidence |
|---|------|------|----------|
| 1 | Slice 5 scope plan exists | YES | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_SCOPE_PLANNING.md` |
| 2 | Slice 5 implementation plan exists | YES | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_IMPLEMENTATION_PLAN.md` |
| 3 | Owner approval recorded | YES | Section 3 of this document |
| 4 | Must-have scope locked | YES | 7 items — Section 4 |
| 5 | Should-have scope locked | YES | 4 items — Section 4 |
| 6 | File targets locked | YES | 10 targets (5 new + 5 modified) — Section 6 |
| 7 | API matrix reviewed | YES | 6 APIs (4 new + 2 existing) — Section 7 |
| 8 | Role matrix reviewed | YES | Section 8 |
| 9 | Ledger/history plan reviewed | YES | Section 9 |
| 10 | Validation/defaults plan reviewed | YES | Section 10 |
| 11 | Out-of-scope items documented | YES | 16 items — Section 12 |
| 12 | No owner questions pending | YES | All 20 baseline decisions confirmed (Implementation Plan Section 3). 0 pending. |
| 13 | No code changes made in Phase 0 | YES | This is a documentation-only phase |

**All 13 gates met. Phase 1 can start.**

---

## 15. Phase 1 Agent Instructions

### Recommended Next Agent

`Central Inventory Slice 5 Phase 1 API/Foundation Implementation Agent`

### Phase 1 Must:

1. Read this Phase 0 lock document (`CENTRAL_INVENTORY_SLICE_5_PHASE_0_APPROVAL_AND_BASELINE_LOCK.md`)
2. Read the Slice 5 implementation plan (`CENTRAL_INVENTORY_SLICE_5_IMPLEMENTATION_PLAN.md`)
3. Implement **only** the following foundation items:
   - Add 4 new API client methods to `src/services/api.js`: `adjustStockIncrease()`, `adjustStockDecrease()`, `recordWastage()`, `getWastageReport()`
   - Create `src/lib/reasonCategories.js` with predefined categories:
     - Adjustment: Counting Error, System Correction, Opening Balance, Quality Issue, Other
     - Wastage: Expired, Spoiled, Damaged, Spillage, Pest/Contamination, Other
   - Discover `add-stock` increase API payload shape via generic proxy (optional Phase 1 task — low-risk)
   - Add any shared constants/helpers if needed by later phases
   - Export all new items for later component consumption
4. Verify build succeeds (`webpack compiled successfully`)
5. Verify no regression on existing Slice 1-4 functionality (basic curl/page-load check)
6. Create Phase 1 implementation report at `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_1_IMPLEMENTATION_REPORT.md`
7. Stop for next-phase approval

### Phase 1 Must NOT:

1. Create `StockAdjustmentForm.jsx` UI
2. Create `WastageEntryForm.jsx` UI
3. Create `WastageReport.jsx` UI
4. Add navigation/sidebar entries for new pages
5. Add routes to `App.js`
6. Add buttons to `OperationsHub.jsx`
7. Change role behavior in live screens
8. Modify backend code (`server.py`, `seed_data.py`)
9. Test live stock-changing APIs against preprod (unless safe test data defined)
10. Expand scope to Stock Return, Lateral Transfers, or Edit Transfer
11. Update `/app/memory/final/`

### Credentials for Testing

| Role | Email | Password |
|------|-------|----------|
| Central Store | `abhishek@kalabahia.com` | `Qplazm@10` |
| Master Store | `owner@democentral1.com` | `Qplazm@10` |
| Outlet | `owner@demofranchise1.com` | `Qplazm@10` |

---

## 16. Final Verdict

### `baseline_locked_phase_1_can_start`

All prerequisite documents reviewed (13/13). Owner approval recorded. 7 must-have and 4 should-have items locked. 10 file targets locked. 6 APIs locked. Role/permission baseline confirmed. Ledger/history plan confirmed. Validation/defaults plan confirmed. 16 out-of-scope items documented. 10 risks identified for implementation tracking. 8-phase implementation roadmap locked. No code changes made. No scope conflicts. No pending owner questions.

Phase 1 implementation can begin.

---

*End of Phase 0 Approval and Baseline Lock*
