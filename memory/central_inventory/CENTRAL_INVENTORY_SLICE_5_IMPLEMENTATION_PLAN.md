# Central Inventory Slice 5 Implementation Plan

> **Date:** 23 May 2026
> **Agent:** Senior Central Inventory Slice 5 Implementation Planning Agent
> **Status:** Planning only — no code modified

---

## 1. Planning Status

### `implementation_plan_ready_owner_approval_required`

All 7 must-have and 4 should-have items planned with file targets, API payloads, validation rules, and smoke tests. 20 baseline decisions confirmed from existing docs and owner answers. No pending questions. Owner approval required before implementation begins.

---

## 2. Inputs Reviewed

| # | Input | Reviewed |
|---|-------|----------|
| 1 | CENTRAL_INVENTORY_SLICE_5_SCOPE_PLANNING.md | YES (302 lines — source of truth for scope) |
| 2 | CENTRAL_INVENTORY_SLICE_5_SCOPE_PLANNING_HANDOVER.md | YES |
| 3 | PRD.md | YES (218 lines) |
| 4 | OWNER_ANSWERS_COMPLETE.md | YES (416 lines — Batch 4, Conflict-002/003, SKIP-001-011) |
| 5 | CENTRAL_INVENTORY_SLICE_4_IMPLEMENTATION_REPORT.md | YES (147 lines) |
| 6 | CENTRAL_INVENTORY_POST_SLICE_4_OPEN_ITEMS_REGISTER.md | YES (OI-003, OI-004) |
| 7 | api_evidence/API_VERIFICATION_COMPREHENSIVE_FINAL.md | YES (Section E: Decrease Adj PASS, Record Wastage PASS, Wastage Report PASS) |
| 8 | Frontend: `api.js` | YES (174 lines — write methods exist from Slice 4) |
| 9 | Frontend: `OperationsHub.jsx` | YES (250 lines — has Dispatch/Request buttons) |
| 10 | Frontend: `HistoryLedger.jsx` | YES (688 lines — deriveLedgerEntries, MOVEMENT_TYPES) |
| 11 | Frontend: `SourceSelector.jsx` | YES (108 lines — reusable for adjustment) |
| 12 | Frontend: `DirectDispatchForm.jsx` | YES (192 lines — pattern reference for new forms) |
| 13 | Frontend: `ConfirmActionDialog.jsx` | YES (37 lines — reusable) |
| 14 | Frontend: `useWriteAction.js` | YES (47 lines — reusable hook) |
| 15 | Frontend: `screenVisibility.js` | YES (124 lines — already has `adjust-stock` and `record-wastage` permissions) |
| 16 | Frontend: `formatters.js` | YES (73 lines — `validateQuantityForUnit` exists) |
| 17 | Frontend: `App.js` | YES (89 lines — current routes) |

**Total: 17 inputs reviewed**

---

## 3. Baseline Decisions Confirmed Before Implementation Planning

| # | Decision | Answer | Source |
|---|----------|--------|--------|
| 1 | Slice 5 direction | Option A — Stock Adjustment + Wastage | Q-S5-001: A |
| 2 | Adjustment reason categories | Defaults: Counting Error, System Correction, Opening Balance, Quality Issue, Other | Q-S5-003: B |
| 3 | Wastage reason categories | Defaults: Expired, Spoiled, Damaged, Spillage, Pest/Contamination, Other | Q-WASTE-001: B + standard |
| 4 | Adjustment: who | Central Store manager ONLY | Q-ADJ-002: A |
| 5 | Adjustment: approval | No — immediate with audit trail | SKIP-004: B |
| 6 | Adjustment: increase/decrease | Hybrid: `add-stock` + dedicated decrease API | Q-ADJ-001: Hybrid |
| 7 | Adjustment: reason mandatory | Yes, predefined categories | Q-ADJ-003: A |
| 8 | Wastage: who | Any store manager at own level | SKIP-007: A |
| 9 | Wastage: approval | No — immediate with audit trail | SKIP-005: B |
| 10 | Wastage: ledger impact | Immediate stock reduction | SKIP-006: A |
| 11 | Wastage: photo evidence | Phase 2 — text reason only | Q-WASTE-002: D |
| 12 | Separate forms for adj/wastage | Yes — different permissions | Conflict-003 |
| 13 | Cost/value display | Excluded from Slice 5 | SKIP-003: C |
| 14 | Confirmation dialogs | Required for all destructive actions | SEC-002: A |
| 15 | Duplicate prevention | useWriteAction hook | UX-002: A |
| 16 | UOM rules | pcs=whole, kg/ltr=2 decimals | ITM-002: C |
| 17 | Edit Transfer | Should-have, attempt API discovery | OI-001 |
| 18 | Stock Return | Deferred to Slice 6 | Q-S5-001 scope |
| 19 | Lateral Transfers | Deferred to Slice 6 | Q-S5-001 scope |
| 20 | Terminology | Always Central/Master/Outlet — never backend terms | Q-TERM-003: A |

**Zero pending decisions. All 20 baseline items confirmed.**

---

## 4. Approved Slice 5 Scope

### Must-Have (7 items)

| # | Item |
|---|------|
| 1 | Stock Adjustment form (Central Store manager only) |
| 2 | Wastage Entry form (any store manager, own level) |
| 3 | Adjustment/Wastage entries in Stock Ledger |
| 4 | Wastage Report view |
| 5 | Predefined reason categories for adjustment and wastage |
| 6 | Confirmation dialogs for adjustment and wastage |
| 7 | Duplicate prevention + toast feedback |

### Should-Have (4 items)

| # | Item |
|---|------|
| 8 | Edit Transfer (if API discoverable) |
| 9 | Read-only banner text update |
| 10 | Adjustment/Wastage summary on Operations Hub |
| 11 | Source selector parent heuristic fix |

### Explicitly Deferred

- Stock Return flow (Slice 6)
- Lateral Master-to-Master transfers (Slice 6)

---

## 5. Current Code Recon Summary

**Existing patterns to reuse:**
- `DirectDispatchForm.jsx` — form pattern with item rows, SourceSelector, validation, submit
- `ConfirmActionDialog.jsx` — reusable confirmation (already handles any title/description)
- `useWriteAction.js` — submitting state + toast + error mapping
- `SourceSelector.jsx` — segment_id/filter_bucket picker for item source
- `validateQuantityForUnit()` — UOM validation in formatters.js

**Existing permissions already configured:**
- `screenVisibility.js` line 29: `"scr-17-adjustment": { master: FULL, central: HIDDEN, franchise: HIDDEN }` — Central only
- `screenVisibility.js` line 30: `"scr-18-wastage": { master: FULL, central: FULL, franchise: FULL }` — all roles
- `ACTION_PERMISSIONS` line 46: `"adjust-stock": { master: true, central: false, franchise: false }` — Central only
- `ACTION_PERMISSIONS` line 47: `"record-wastage": { master: true, central: true, franchise: true }` — all roles

**Stock Ledger:** `HistoryLedger.jsx` has `MOVEMENT_TYPES` (line 21) with 4 types and `deriveLedgerEntries()` (line 34) that only processes transfers. Must add adjustment/wastage types.

**Routes:** `App.js` needs `/adjustment/new` and `/wastage/new` routes.

**Operations Hub:** Already has `canDo("adjust-stock")` and `canDo("record-wastage")` available via screenVisibility.

---

## 6. File Target Map

| # | Area | Existing File | Planned Change | New/Modified | Risk |
|---|------|---------------|----------------|-------------|------|
| 1 | Adjustment API methods | `src/services/api.js` | Add `adjustStockIncrease()`, `adjustStockDecrease()`, `getWastageReport()`, `recordWastage()` | MODIFIED | LOW |
| 2 | Stock Adjustment form | `src/components/central-inventory/StockAdjustmentForm.jsx` | NEW — Central-only form with item, segment, quantity, type, reason | NEW | MEDIUM |
| 3 | Wastage Entry form | `src/components/central-inventory/WastageEntryForm.jsx` | NEW — all roles, item, segment, quantity, reason | NEW | MEDIUM |
| 4 | Wastage Report view | `src/components/central-inventory/WastageReport.jsx` | NEW — read-only table from wastage report API | NEW | LOW |
| 5 | Stock Ledger extension | `src/components/central-inventory/HistoryLedger.jsx` | Add adjustment/wastage movement types to `MOVEMENT_TYPES` and `deriveLedgerEntries()` | MODIFIED | MEDIUM |
| 6 | Routes | `src/App.js` | Add `/adjustment/new`, `/wastage/new`, `/wastage/report` routes | MODIFIED | LOW |
| 7 | Operations Hub buttons | `src/components/central-inventory/OperationsHub.jsx` | Add "Adjust Stock" (Central) and "Record Wastage" (all) buttons | MODIFIED | LOW |
| 8 | Reason categories config | `src/lib/reasonCategories.js` | NEW — predefined categories for adjustment + wastage | NEW | LOW |
| 9 | Banner text update | `src/components/central-inventory/ContextSelector.jsx` | Update "Phase 1 Limited Slice" text (should-have) | MODIFIED | LOW |
| 10 | Source selector fix | `src/components/central-inventory/RequestStockForm.jsx` | Improve parent store heuristic (should-have) | MODIFIED | LOW |

**Summary: 5 modified + 5 new = 10 file targets**

---

## 7. API / Payload Matrix

### 7.1 Stock Adjustment — Decrease

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /proxy/v2/inventory-transfer/decrease-adjustment` (via generic proxy) |
| **Evidence** | E2E Section E: "Decrease Adjustment PASS" with segment_id selector |
| **Payload** | `{ "source_inventory_master_id": number, "quantity": number, "unit": string, "source_selector": { "mode": "segment_id", "segment_id": number }, "reason": string }` |
| **Required** | source_inventory_master_id, quantity, unit, source_selector, reason |
| **Response** | Status confirmation |
| **Readiness** | **verified_ready** |

### 7.2 Stock Adjustment — Increase

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /proxy/v2/inventory/add-stock` (via generic proxy) |
| **Evidence** | Q-ADJ-001: Hybrid — `add-stock` for increases. E2E did not test directly but stock was seeded using this API. |
| **Payload** | `{ "source_inventory_master_id": number, "quantity": number, "unit": string, "reason": string }` (estimated — discovery needed) |
| **Required** | source_inventory_master_id, quantity, unit |
| **Readiness** | **partially_verified_more_evidence_needed** |
| **Note** | No source_selector needed for increase (adding new stock, not selecting from existing segments). Payload discovery via generic proxy during early implementation. |

### 7.3 Record Wastage

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /proxy/v2/inventory/record-wastage` (via generic proxy) |
| **Evidence** | E2E Section E: "Record Wastage PASS" with segment_id selector |
| **Payload** | `{ "source_inventory_master_id": number, "quantity": number, "unit": string, "source_selector": { "mode": "segment_id", "segment_id": number }, "reason": string }` |
| **Required** | source_inventory_master_id, quantity, unit, source_selector, reason |
| **Response** | Status confirmation |
| **Readiness** | **verified_ready** |

### 7.4 Wastage Report

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /proxy/v2/inventory/wastage-report` or `GET` (via generic proxy) |
| **Evidence** | E2E Section E: "Wastage Report PASS" with multi-restaurant scope |
| **Payload** | `{ "restaurant_ids": [number], "from_date": string, "to_date": string }` (estimated) |
| **Response** | `{ "data": [...] }` — wastage entries with item, quantity, reason, date, store |
| **Readiness** | **verified_ready_with_notes** |
| **Note** | Exact response shape needs discovery. Multi-restaurant scope confirmed. |

### 7.5 Inventory Master (existing)

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /proxy/v2/inventory/get-inventory-master` |
| **Readiness** | **verified_ready** (pre-existing from Slice 1) |

### 7.6 Source Options (existing)

| Field | Value |
|-------|-------|
| **Endpoint** | `POST /proxy/v2/inventory-transfer/source-options` |
| **Readiness** | **verified_ready** (pre-existing from Slice 4) |

---

## 8. Role / Permission Matrix

| Action | Central (backend `master`) | Master (backend `central`) | Outlet (backend `franchise`) |
|--------|---------------------------|---------------------------|------------------------------|
| Stock Adjustment (increase) | **allowed** | hidden | hidden |
| Stock Adjustment (decrease) | **allowed** | hidden | hidden |
| Record Wastage | **allowed** (own level) | **allowed** (own level) | **allowed** (own level) |
| View Wastage Report | **allowed** (all stores) | **allowed** (own + children) | **allowed** (own only) |
| Edit Transfer (should-have) | not_applicable | **allowed** (own requests, requested) | **allowed** (own requests, requested) |

Already configured in `screenVisibility.js`: `adjust-stock` = Central only, `record-wastage` = all roles.

---

## 9. Implementation Plan by Must-Have Item

### MH-1: Stock Adjustment Form

| Field | Value |
|-------|-------|
| **Requirement** | Central Store manager can increase or decrease stock for any item |
| **Current state** | No adjustment form exists. `canDo("adjust-stock")` returns true for Central only. |
| **Proposed change** | NEW `StockAdjustmentForm.jsx` at `/adjustment/new`. Type toggle (Increase/Decrease). Item selector from inventory master. For decrease: SourceSelector (segment_id). Quantity input with UOM validation. Reason dropdown (predefined categories from Q-S5-003). Submit calls `adjustStockDecrease()` or `adjustStockIncrease()`. |
| **File targets** | `StockAdjustmentForm.jsx` (NEW), `api.js` (add methods), `App.js` (add route), `OperationsHub.jsx` (add button) |
| **API** | Decrease: verified_ready. Increase: partially_verified (needs payload discovery). |
| **Validation** | Item required. Quantity > 0. UOM valid. Reason required (predefined category). For decrease: source segment required. |
| **Ledger impact** | Creates "Adjustment (Increase)" or "Adjustment (Decrease)" ledger entry |
| **Success** | Toast "Stock adjusted — [item] [+/-][qty] [unit]". Navigate back to Operations Hub. |
| **Error** | Toast with mapped API error. Keep form data. |
| **Acceptance criteria** | Central user opens form -> selects type -> selects item -> enters quantity -> selects reason -> submits -> stock updated |
| **Smoke test** | Login as Central, navigate to /adjustment/new, adjust item, verify toast. Login as Master/Outlet — button not visible. |
| **Risk** | add-stock payload needs discovery. Decrease is safe. |

### MH-2: Wastage Entry Form

| Field | Value |
|-------|-------|
| **Requirement** | Any store manager can record wastage at their own store level |
| **Current state** | No wastage form exists. `canDo("record-wastage")` returns true for all roles. |
| **Proposed change** | NEW `WastageEntryForm.jsx` at `/wastage/new`. Item selector. SourceSelector (segment_id — waste from specific segment). Quantity input. Reason dropdown (Expired, Spoiled, Damaged, Spillage, Pest/Contamination, Other). No photo. Submit calls `recordWastage()`. |
| **File targets** | `WastageEntryForm.jsx` (NEW), `api.js` (add method), `App.js` (add route), `OperationsHub.jsx` (add button) |
| **API** | Record Wastage: verified_ready (Section E PASS) |
| **Validation** | Item required. Quantity > 0. UOM valid. Reason required. Source segment required. |
| **Ledger impact** | Creates "Wastage" ledger entry. Stock reduced immediately. |
| **Success** | Toast "Wastage recorded — [item] [qty] [unit]". Navigate back. |
| **Error** | Toast with mapped API error. |
| **Acceptance criteria** | Any role opens form -> selects item -> enters quantity -> selects reason -> submits -> stock reduced |
| **Smoke test** | Login as each role, navigate to /wastage/new, record wastage, verify toast. |
| **Risk** | LOW — API verified. |

### MH-3: Adjustment/Wastage Entries in Stock Ledger

| Field | Value |
|-------|-------|
| **Requirement** | Stock Ledger shows adjustment and wastage entries alongside transfer entries |
| **Current state** | `HistoryLedger.jsx` `MOVEMENT_TYPES` has 4 types (transfer_out, transfer_in, partial_receive, reversal). `deriveLedgerEntries()` only processes transfers. |
| **Proposed change** | Add 3 new movement types to `MOVEMENT_TYPES`: `adjustment_increase`, `adjustment_decrease`, `wastage`. Extend ledger data source to include wastage report data. For MVP: wastage report API returns entries that are merged into the ledger. Adjustment entries may need to be derived from a similar API or shown as a separate data source. |
| **File targets** | `HistoryLedger.jsx` (modify MOVEMENT_TYPES + data fetching) |
| **Acceptance criteria** | After recording adjustment/wastage, Stock Ledger shows new entries with correct movement type, quantity, reason |
| **Risk** | MEDIUM — wastage report response shape needs discovery. Adjustment history API may not exist. |

### MH-4: Wastage Report View

| Field | Value |
|-------|-------|
| **Requirement** | Read-only report showing recorded wastage across stores (scoped by role hierarchy) |
| **Current state** | No wastage report view exists. |
| **Proposed change** | NEW `WastageReport.jsx` at `/wastage/report`. Table with: date, store, item, quantity, unit, reason, recorded_by. Date range filter. Role-scoped: Central sees all, Master sees own+children, Outlet sees own. |
| **File targets** | `WastageReport.jsx` (NEW), `api.js` (add `getWastageReport()`), `App.js` (add route) |
| **API** | Wastage Report: verified_ready_with_notes (multi-restaurant scope confirmed, response shape needs discovery) |
| **Acceptance criteria** | Central user sees wastage across all stores. Master sees own + children. Outlet sees own. |
| **Risk** | LOW — API verified. Response shape discovery during implementation. |

### MH-5: Predefined Reason Categories

| Field | Value |
|-------|-------|
| **Requirement** | Dropdown reason categories for adjustment and wastage forms |
| **Current state** | No predefined categories exist. |
| **Proposed change** | NEW `reasonCategories.js` config file with two lists. Adjustment: Counting Error, System Correction, Opening Balance, Quality Issue, Other. Wastage: Expired, Spoiled, Damaged, Spillage, Pest/Contamination, Other. Both forms import from this config. |
| **File targets** | `src/lib/reasonCategories.js` (NEW) |
| **Acceptance criteria** | Both forms show correct dropdown categories. "Other" allows free-text. |
| **Risk** | LOW — static config. |

### MH-6: Confirmation Dialogs

| Field | Value |
|-------|-------|
| **Requirement** | Confirmation before submitting adjustment or wastage |
| **Current state** | `ConfirmActionDialog.jsx` exists from Slice 4 — fully reusable. |
| **Proposed change** | Reuse existing ConfirmActionDialog in both new forms. Show summary: "Adjust [item] by [+/-][qty] [unit]? Reason: [reason]" or "Record wastage of [qty] [unit] [item]? Reason: [reason]". |
| **File targets** | No new files — reuse existing `ConfirmActionDialog.jsx` |
| **Acceptance criteria** | Both forms show confirmation dialog before API call. Dialog shows action summary. |
| **Risk** | LOW — existing component. |

### MH-7: Duplicate Prevention + Toast Feedback

| Field | Value |
|-------|-------|
| **Requirement** | Buttons disabled during API call. Toast on success/error. |
| **Current state** | `useWriteAction.js` hook exists from Slice 4. Toaster is mounted in AppLayout. |
| **Proposed change** | Reuse `useWriteAction` hook in both new forms. Success toast with stock action summary. Error toast with mapped API error. |
| **File targets** | No new files — reuse existing hook and Toaster |
| **Acceptance criteria** | Buttons disabled during submit. Toast shows after success or error. No double-submit possible. |
| **Risk** | LOW — existing infrastructure. |

---

## 10. Should-Have Inclusion Plan

### SH-8: Edit Transfer

| Decision | **include_if_low_risk** |
|----------|------------------------|
| **Reason** | API contract unknown. Attempt discovery via generic proxy during early implementation. If endpoint found and payload works, implement edit form. If not, defer. |
| **File target** | Modify `TransferDetail.jsx` edit handler + potentially new `EditTransferForm.jsx` |
| **Risk** | MEDIUM — API may not exist. |

### SH-9: Read-Only Banner Text Update

| Decision | **include_in_slice_5** |
|----------|----------------------|
| **Reason** | Cosmetic fix. Change "Phase 1 Limited Slice — Read-only mode" to accurate text. Trivial change in `ContextSelector.jsx`. |
| **File target** | `ContextSelector.jsx` |
| **Risk** | LOW |

### SH-10: Ops Hub Adjustment/Wastage Summary

| Decision | **include_if_low_risk** |
|----------|------------------------|
| **Reason** | Show recent adjustment/wastage activity count on Operations Hub. Depends on API providing this data. |
| **File target** | `OperationsHub.jsx` |
| **Risk** | LOW if API provides data. |

### SH-11: Source Selector Parent Heuristic Fix

| Decision | **include_in_slice_5** |
|----------|----------------------|
| **Reason** | Fix known issue #9 from Slice 4: parent store resolution uses hierarchy heuristic that may show "Parent Store" fallback. Small targeted fix in `RequestStockForm.jsx`. |
| **File target** | `RequestStockForm.jsx` |
| **Risk** | LOW |

---

## 11. Forms and Dialogs Plan

### 11.1 StockAdjustmentForm.jsx (NEW)

| Field | Details |
|-------|---------|
| **Route** | `/adjustment/new` |
| **Entry point** | Operations Hub "Adjust Stock" button (Central only) |
| **Fields** | Type toggle (Increase/Decrease), Item (dropdown from inventory master), Quantity (number), Unit (read-only from item), Source Segment (SourceSelector — decrease only), Reason (dropdown from predefined categories) |
| **Required** | Type, Item, Quantity, Reason. Source Segment required for decrease. |
| **Validation** | Quantity > 0. UOM valid. Reason selected. Source segment for decrease. |
| **API** | Decrease: `adjustStockDecrease()`. Increase: `adjustStockIncrease()`. |
| **Success** | Confirmation dialog -> API call -> toast -> navigate to Operations Hub |
| **Error** | Toast with mapped error. Keep form data. |
| **Role gating** | `canDo("adjust-stock")` — Central only. Others see PermissionDenied. |

### 11.2 WastageEntryForm.jsx (NEW)

| Field | Details |
|-------|---------|
| **Route** | `/wastage/new` |
| **Entry point** | Operations Hub "Record Wastage" button (all roles) |
| **Fields** | Item (dropdown), Quantity (number), Unit (read-only), Source Segment (SourceSelector), Reason (dropdown from predefined wastage categories) |
| **Required** | Item, Quantity, Source Segment, Reason |
| **Validation** | Quantity > 0. UOM valid. Reason selected. Source segment required. |
| **API** | `recordWastage()` |
| **Success** | Confirmation dialog -> API call -> toast -> navigate back |
| **Error** | Toast with mapped error |
| **Role gating** | `canDo("record-wastage")` — all roles at own store level |

### 11.3 WastageReport.jsx (NEW)

| Field | Details |
|-------|---------|
| **Route** | `/wastage/report` |
| **Entry point** | Operations Hub or sidebar (if added), or from Wastage Entry form |
| **Fields** | Date range filter, Store filter (hierarchy-scoped), Table: date, store, item, quantity, unit, reason |
| **API** | `getWastageReport()` |
| **Role visibility** | Central: all stores. Master: own + children. Outlet: own only. |

---

## 12. Validation Plan

| Form | Field | Rule | Error |
|------|-------|------|-------|
| StockAdjustmentForm | type | Required (Increase/Decrease) | "Select adjustment type" |
| StockAdjustmentForm | item | Required | "Select an item" |
| StockAdjustmentForm | quantity | > 0, UOM valid | "Quantity must be greater than 0" |
| StockAdjustmentForm | reason | Required (predefined category) | "Select a reason" |
| StockAdjustmentForm | source_selector (decrease) | Required | "Select source segment" |
| WastageEntryForm | item | Required | "Select an item" |
| WastageEntryForm | quantity | > 0, UOM valid | "Quantity must be greater than 0" |
| WastageEntryForm | reason | Required (predefined category) | "Select a reason" |
| WastageEntryForm | source_selector | Required | "Select source segment" |

---

## 13. Ledger / History Impact Plan

| Action | Ledger Entry? | Movement Type | Direction | Before/After | Reference |
|--------|--------------|---------------|-----------|-------------|-----------|
| Adjustment (increase) | YES | `adjustment_increase` | In | "—" (not available) | Adj reference ID if API provides |
| Adjustment (decrease) | YES | `adjustment_decrease` | Out | "—" | Adj reference ID |
| Wastage | YES | `wastage` | Out | "—" | Wastage reference ID |

**Implementation:** Add 3 new entries to `MOVEMENT_TYPES` in `HistoryLedger.jsx`. Extend data fetching to merge wastage report data into ledger. Adjustment entries depend on whether a history/report API exists for adjustments.

---

## 14. Refresh and Consistency Plan

| After Action | Refresh Strategy |
|-------------|-----------------|
| Stock Adjustment submit | Navigate to Operations Hub. Hub refetches on mount. |
| Wastage Entry submit | Navigate to Operations Hub. Hub refetches on mount. |
| Wastage Report view | Fetches fresh data on mount. Date filter triggers refetch. |
| Stock Ledger | Refetches on mount. New entries from wastage report merge on load. |

---

## 15. Error / Toast / Terminology Plan

| Action | Success Toast | Error Toast |
|--------|-------------|-------------|
| Adjustment (increase) | "Stock increased — [item] +[qty] [unit]" | Mapped API error |
| Adjustment (decrease) | "Stock decreased — [item] -[qty] [unit]" | Mapped API error |
| Wastage | "Wastage recorded — [item] [qty] [unit]" | Mapped API error |

All error messages pass through `mapApiErrorMessage()` to replace backend terminology.

---

## 16. UOM / Evidence / Defaults Plan

**UOM:** Reuse existing `validateQuantityForUnit()` from `formatters.js`. pcs=whole numbers, kg/ltr=2 decimals.

**Evidence/Photo:** Not included per Q-WASTE-002: D. Text reason only.

**Default Reason Categories (Q-S5-003: B):**
- Adjustment: Counting Error, System Correction, Opening Balance, Quality Issue, Other
- Wastage: Expired, Spoiled, Damaged, Spillage, Pest/Contamination, Other
- Configurable in next phase per owner note.

---

## 17. Acceptance Criteria

1. Central user can open Stock Adjustment form from Operations Hub and increase stock for any item.
2. Central user can decrease stock with source segment selection.
3. Master and Outlet users CANNOT see or access the Stock Adjustment form.
4. Any role can open Wastage Entry form and record wastage at their own store level.
5. Wastage immediately reduces stock.
6. Both forms require predefined reason category selection.
7. Both forms show confirmation dialog before API call.
8. Both forms prevent duplicate submission (disabled during API call).
9. Success/error toasts display correctly.
10. Stock Ledger shows new adjustment/wastage entries with correct movement types.
11. Wastage Report shows recorded wastage scoped by user's hierarchy level.
12. No backend terminology in any form, dialog, toast, or error message.
13. UOM validation enforces whole numbers for pcs, 2 decimals for kg/ltr.

---

## 18. Smoke Checklist

### Central Store (`abhishek@kalabahia.com` / `Qplazm@10`)

- [ ] Operations Hub: "Adjust Stock" button visible and navigates to /adjustment/new
- [ ] Operations Hub: "Record Wastage" button visible and navigates to /wastage/new
- [ ] Stock Adjustment: type toggle (Increase/Decrease) works
- [ ] Stock Adjustment: item dropdown loads from inventory master
- [ ] Stock Adjustment: decrease shows SourceSelector; increase does not
- [ ] Stock Adjustment: reason dropdown shows 5 predefined categories
- [ ] Stock Adjustment: quantity validation works (pcs=whole, kg/ltr=2 decimals)
- [ ] Stock Adjustment: confirmation dialog shows before submit
- [ ] Stock Adjustment: submit shows toast, navigates back
- [ ] Wastage Entry: item dropdown, source selector, reason categories work
- [ ] Wastage Entry: confirmation + submit + toast
- [ ] Wastage Report: accessible, shows entries scoped to all stores
- [ ] Stock Ledger: shows new adjustment/wastage entries

### Master Store (`owner@democentral1.com` / `Qplazm@10`)

- [ ] Operations Hub: "Adjust Stock" button NOT visible
- [ ] Operations Hub: "Record Wastage" button visible
- [ ] Wastage Entry: works at own store level
- [ ] Wastage Report: shows own + children stores only
- [ ] Stock Adjustment form /adjustment/new: permission denied

### Outlet (`owner@demofranchise1.com` / `Qplazm@10`)

- [ ] Operations Hub: "Adjust Stock" button NOT visible
- [ ] Operations Hub: "Record Wastage" button visible
- [ ] Wastage Entry: works at own store level
- [ ] Wastage Report: shows own store only
- [ ] Stock Adjustment form: permission denied

### Cross-Role

- [ ] No backend terminology leakage
- [ ] All existing Slice 1-4 features still work (regression)
- [ ] Confirmation dialogs for both forms
- [ ] Loading/disabled state during submit
- [ ] UOM validation on all quantity inputs

---

## 19. Implementation Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | `add-stock` increase API payload unknown | MEDIUM | Discover via generic proxy. Decrease API shape is reference. If fails, show increase as "coming soon". |
| 2 | Wastage Report response shape unknown | LOW | API verified PASS. Discover shape during implementation. |
| 3 | Adjustment history API may not exist | MEDIUM | Ledger may only show wastage entries initially. Adjustment entries defer if no source API. |
| 4 | Permission leakage on adjustment | MEDIUM | Central-only enforcement via `canDo("adjust-stock")`. Backend validates server-side. |
| 5 | Stock going negative from wastage | LOW | Allowed per policy (SKIP-009). Display clearly, no frontend block. |
| 6 | Edit Transfer API unknown (SH-8) | MEDIUM | Attempt discovery. If not found, defer gracefully — button remains noop. |
| 7 | Regression on Slice 1-4 | LOW | New routes and components — minimal changes to existing files. |
| 8 | Backend terminology in API errors | LOW | All errors mapped via `mapApiErrorMessage()`. |

---

## 20. Owner Approval Gate

Before implementation starts, owner must approve:

1. File target map (5 new + 5 modified = 10 files)
2. API/payload matrix (4 new API methods + 2 existing)
3. Role/permission matrix (Central-only adjustment, all-role wastage)
4. Forms/dialogs plan (2 new forms + 1 report view)
5. Ledger/history impact plan (3 new movement types)
6. Validation plan
7. Default reason categories (Q-S5-003: B)
8. Smoke checklist
9. Should-have inclusion decisions

**No unresolved blockers or questions.**

---

## 21. Recommended Next Agent

### `Central Inventory Slice 5 Implementation Agent`

All planning complete. 7 must-have + 4 should-have items planned. Zero pending decisions. Ready for implementation pending owner approval.

**Implementation order:**

| Phase | Items |
|-------|-------|
| 1 | API client methods (`api.js`) + reason categories config |
| 2 | StockAdjustmentForm + route + OperationsHub button |
| 3 | WastageEntryForm + route + OperationsHub button |
| 4 | WastageReport + route |
| 5 | Stock Ledger extension (new movement types) |
| 6 | Should-have items (banner text, source selector fix) |
| 7 | Edit Transfer API discovery (should-have, conditional) |
| 8 | Smoke testing across 3 roles |

---

*End of Slice 5 Implementation Plan*
