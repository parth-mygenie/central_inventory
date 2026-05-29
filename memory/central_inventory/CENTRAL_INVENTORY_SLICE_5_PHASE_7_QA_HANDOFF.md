# Central Inventory Slice 5 Phase 7 QA Handoff

> **Date:** 24 May 2026
> **From:** Phase 6 Polish + Validation + Regression Implementation Agent
> **To:** Phase 7 Final QA Handover Agent

---

## 1. Phase 6 Report Path

`/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_PHASE_6_IMPLEMENTATION_REPORT.md`

## 2. Phase 7 Recommended Agent

`Central Inventory Slice 5 Phase 7 Final QA Handover Agent`

## 3. Slice 5 Features to QA

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Hardcoded UI cleanup — no global "Read-only Mode" badge | Phase 6 | Implemented |
| 2 | Hardcoded UI cleanup — no "Phase 1 Limited Slice" banner | Phase 6 | Implemented |
| 3 | Hardcoded UI cleanup — neutral login footer | Phase 6 | Implemented |
| 4 | Stock Adjustment form — Central-only increase/decrease | Phase 2 | Implemented |
| 5 | Wastage Entry form — all roles, own store | Phase 3 | Implemented |
| 6 | Wastage Report — role-scoped read-only | Phase 4 | Implemented |
| 7 | Wastage ledger/history traceability | Phase 5 | Implemented (data-dependent) |
| 8 | Stock Adjustment traceability | Phase 5 | Partial (no adjustment history API) |
| 9 | Reason categories — 5 adjustment + 6 wastage | Phase 1 | Implemented |
| 10 | Confirmation dialogs — both forms | Phase 2/3 | Implemented |
| 11 | Duplicate prevention — both forms | Phase 2/3 | Implemented |
| 12 | UOM validation — pcs/kg/ltr | Phase 2/3 | Implemented |

## 4. Required QA Roles

| Role | Email | Password | Restaurant ID | Type |
|------|-------|----------|---------------|------|
| Central Store | `abhishek@kalabahia.com` | `Qplazm@10` | 1 | master |
| Master Store | `owner@democentral1.com` | `Qplazm@10` | 781 | central |
| Outlet | `owner@demofranchise1.com` | `Qplazm@10` | 783 | franchise |

## 5. Required QA Checks

### 5.1 Hardcoded UI Cleanup Verification

- [ ] Login page shows "Central Inventory — MyGenie" (not "Phase 1 — Read-only preview")
- [ ] Header does NOT show "Read-only Mode" badge for any role
- [ ] Operations Hub does NOT show "Phase 1 Limited Slice" banner for any role
- [ ] No "Write operations pending backend resolution" text appears anywhere
- [ ] Reports sidebar still shows "(soon)" — accurate deferred indicator

### 5.2 Stock Adjustment (Central Only)

- [ ] Central: "Adjust Stock" button visible on Operations Hub
- [ ] Central: `/adjustment/new` loads Stock Adjustment form
- [ ] Central: Increase/Decrease toggle works
- [ ] Central: Item dropdown loads from inventory master API
- [ ] Central: Quantity input validates (pcs=whole, kg/ltr=2 decimals)
- [ ] Central: Source Segment shows for Decrease, hidden for Increase
- [ ] Central: Reason dropdown shows 5 categories
- [ ] Central: "Other" reason shows free-text textarea
- [ ] Central: Confirmation dialog appears before submit
- [ ] Central: Submit button disables during submit
- [ ] Master: "Adjust Stock" button NOT visible on Operations Hub
- [ ] Master: `/adjustment/new` shows PermissionDenied
- [ ] Outlet: "Adjust Stock" button NOT visible on Operations Hub
- [ ] Outlet: `/adjustment/new` shows PermissionDenied

### 5.3 Wastage Entry (All Roles)

- [ ] Central: "Record Wastage" button visible
- [ ] Master: "Record Wastage" button visible
- [ ] Outlet: "Record Wastage" button visible
- [ ] Any role: `/wastage/new` loads Wastage Entry form
- [ ] Item dropdown loads
- [ ] Quantity input validates
- [ ] Source Segment always required
- [ ] Reason dropdown shows 6 categories
- [ ] "Other" reason shows free-text textarea
- [ ] Confirmation dialog appears before submit (destructive variant)
- [ ] Submit button disables during submit

### 5.4 Wastage Report (All Roles)

- [ ] Central: "Wastage Report" button visible
- [ ] Master: "Wastage Report" button visible
- [ ] Outlet: "Wastage Report" button visible
- [ ] `/wastage/report` loads
- [ ] Date range filter works
- [ ] Empty state shows when no data
- [ ] Error state shows with Retry on API failure
- [ ] No cost/value columns

### 5.5 History & Ledger

- [ ] Transfer History tab loads with existing transfers
- [ ] Stock Ledger tab loads with existing movements
- [ ] 7 movement type filter pills visible (4 existing + 3 new)
- [ ] Before/After columns show "—"
- [ ] Clickable transfer references still work
- [ ] No crash when wastage data is empty

### 5.6 Terminology & Role Compliance

- [ ] No backend terms ("master"/"central"/"franchise") in any UI text
- [ ] Store badges use "Central Store" / "Master Store" / "Outlet"
- [ ] No cost/value fields anywhere
- [ ] Permission guards work correctly per role

### 5.7 Slice 1–4 Regression

- [ ] Login works for all 3 roles
- [ ] Operations Hub loads for all 3 roles
- [ ] Hierarchy Summary loads
- [ ] Pending Queues loads with tabs
- [ ] Transfer Detail loads with action buttons
- [ ] Direct Dispatch form loads (Central/Master)
- [ ] Request Stock form loads (Master/Outlet)
- [ ] History & Ledger loads

## 6. Known Limitations for QA

| # | Limitation | Reason | Severity |
|---|-----------|--------|----------|
| 1 | Stock Adjustment traceability partial | No adjustment history API exists. Movement labels/filter pills defined but no rows appear. | MEDIUM — accepted risk |
| 2 | Wastage ledger rows empty | No wastage data recorded in preprod yet. `deriveWastageEntries()` is ready. | LOW |
| 3 | Wastage Report may show error for Master/Outlet | Preprod API may restrict wastage report by role. Error state with Retry is correct UX. | LOW |
| 4 | `add-stock` increase API payload estimated | May need adjustment if preprod API expects different fields. Decrease is verified_ready. | MEDIUM |
| 5 | Edit Transfer button is noop | API contract unknown. Deferred per OI-001. | LOW — expected |

## 7. Phase 7 Must Not Do

- No implementation
- No backend changes
- No `/app/memory/final/` updates
- No scope expansion
- No fake ledger records
- No marking deferred features as complete

## 8. Phase 7 Expected Output

Phase 7 should produce:
1. Final QA handover/validation report
2. Pass/fail matrix per feature per role
3. Known issues list
4. Owner smoke checklist
5. Final Slice 5 acceptance recommendation

---

*End of Phase 7 QA Handoff*
