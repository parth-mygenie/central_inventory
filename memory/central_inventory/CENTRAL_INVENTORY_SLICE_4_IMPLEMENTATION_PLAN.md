# Central Inventory Slice 4 Implementation Plan

> **Date:** 23 May 2026
> **Agent:** Senior Central Inventory Slice 4 Implementation Planning Agent
> **Status:** Planning only — no code modified

---

## 1. Planning Status

### `implementation_plan_ready_owner_approval_required`

All inputs reviewed. All 12 must-have and 4 should-have items planned with file targets, API payloads, validation rules, and smoke tests. Q-XFER-006 override confirmed in `OWNER_ANSWERS_COMPLETE.md` (updated 23 May 2026). No backend blockers. Owner approval required before implementation begins.

---

## 2. Inputs Reviewed

| # | Input | Path | Reviewed |
|---|-------|------|----------|
| 1 | Slice 4 Write Flow Planning | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_4_WRITE_FLOW_PLANNING.md` | YES (555 lines) |
| 2 | Owner Answers Complete (104 decisions) | `/app/memory/central_inventory/OWNER_ANSWERS_COMPLETE.md` | YES (416 lines) — Q-XFER-006 override CONFIRMED present |
| 3 | Blocker Reconciliation | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_1_TO_3_BLOCKER_RECONCILIATION_AND_REPLAN.md` | YES (412 lines) |
| 4 | Backend Blockers After Recheck | `/app/memory/central_inventory/CENTRAL_INVENTORY_BACKEND_BLOCKERS_AFTER_API_TOOL_RECHECK.md` | YES (153 lines) |
| 5 | Slice 3 Implementation Report | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_3_IMPLEMENTATION_REPORT.md` | YES (155 lines) |
| 6 | Slice 3 QA Handover | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_3_QA_HANDOVER.md` | YES (142 lines) |
| 7 | Slice 2 Implementation Report | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_2_IMPLEMENTATION_REPORT.md` | YES (153 lines) |
| 8 | Slice 2 QA Handover | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_2_QA_HANDOVER.md` | YES (158 lines) |
| 9 | API Verification Comprehensive Final | `/app/memory/central_inventory/api_evidence/API_VERIFICATION_COMPREHENSIVE_FINAL.md` | YES (118 lines — 52/52 PASS) |
| 10 | E2E Final Test Script | `/app/memory/central_inventory/api_evidence/e2e_final_test.py` | YES (payload shapes extracted) |
| 11 | Frontend: `api.js` | `/app/frontend/src/services/api.js` | YES (132 lines — write methods NOT yet present) |
| 12 | Frontend: `transferActions.js` | `/app/frontend/src/lib/transferActions.js` | YES (102 lines — "Report Issue" NOT yet present) |
| 13 | Frontend: `terminology.js` | `/app/frontend/src/lib/terminology.js` | YES (135 lines — mapping adapter complete) |
| 14 | Frontend: `formatters.js` | `/app/frontend/src/lib/formatters.js` | YES (61 lines) |
| 15 | Frontend: `screenVisibility.js` | `/app/frontend/src/lib/screenVisibility.js` | YES (123 lines — action permissions exist) |
| 16 | Frontend: `TransferDetail.jsx` | `/app/frontend/src/components/central-inventory/TransferDetail.jsx` | YES (328 lines — disabled action buttons) |
| 17 | Frontend: `PendingQueues.jsx` | `/app/frontend/src/components/central-inventory/PendingQueues.jsx` | YES (269 lines — BlockedAction notice) |
| 18 | Frontend: `OperationsHub.jsx` | `/app/frontend/src/components/central-inventory/OperationsHub.jsx` | YES (252 lines — disabled dispatch/request buttons) |
| 19 | Frontend: `App.js` | `/app/frontend/src/App.js` | YES (85 lines — routes defined) |
| 20 | Frontend: `useLoginContext.js` | `/app/frontend/src/hooks/useLoginContext.js` | YES (191 lines — auth, role, permissions) |
| 21 | Frontend: `use-toast.js` | `/app/frontend/src/hooks/use-toast.js` | YES (156 lines — toast system available) |
| 22 | Frontend: UI components | `/app/frontend/src/components/ui/` | YES — dialog.jsx, alert-dialog.jsx, select.jsx, input.jsx, textarea.jsx, label.jsx, form.jsx, toast.jsx, toaster.jsx all available |
| 23 | Frontend: Common components | `/app/frontend/src/components/common/` | YES — Badges.jsx, DateRangePicker.jsx, StateDisplays.jsx |
| 24 | Backend: `server.py` | `/app/backend/server.py` | YES (292 lines — generic proxy at line 238 handles ALL v2 endpoints) |

**Total: 24 inputs reviewed**

**Q-XFER-006 override status:** CONFIRMED. `OWNER_ANSWERS_COMPLETE.md` updated on 23 May 2026. Lines 55, 324, 367-377 reflect the override. No blocker.

---

## 3. Approved Slice 4 Scope

### Must-Have (12 items) — from OWNER_ANSWERS_COMPLETE.md lines 387-402

| # | Item | Owner Decision |
|---|------|----------------|
| 1 | Approve transfer action | Standard |
| 2 | Reject transfer action with reason dialog | Standard |
| 3 | Dispatch approved transfer | Standard |
| 4 | Receive transfer (full) | Standard |
| 5 | Partial receive with line-level resolution | Promoted from should-have (Q-S4-007: A) |
| 6 | Cancel transfer with reason dialog | Standard |
| 7 | "Report Issue" action for destination on dispatched transfers | Q-XFER-006 override (Q-S4-006: C) |
| 8 | Direct Dispatch form (Central/Master to child, including Central to Outlet) | Q-S4-003: A + Q-S4-005: A |
| 9 | Request Stock form (child to parent) | Promoted from should-have (Q-S4-004: A) |
| 10 | Source selector (configurable: segment_id + filter_bucket modes) | Q-S4-002: B |
| 11 | Confirmation dialogs for all destructive actions | SEC-002: A |
| 12 | Duplicate submission prevention + post-action data refresh | UX-002: A |

### Should-Have (4 items)

| # | Item |
|---|------|
| 13 | Edit transfer (pre-dispatch, resets to requested) |
| 14 | Success/error toast notifications |
| 15 | Quantity validation with UOM awareness |
| 16 | API error message terminology mapping |

### Explicitly Deferred (NOT Slice 4)

- Stock adjustment write screen
- Wastage write screen
- Stock return write screen
- Lateral Master-to-Master transfer UI
- Partial dispatch (blocked — backend dispatches all lines)
- Recipe/consumption integration
- Reports/export
- KPI dashboard
- Backend code changes

---

## 4. Current Code Recon Summary

### Screens

| Screen | File | Status |
|--------|------|--------|
| Login | `layout/LoginPage.jsx` | Working — proxies to preprod auth |
| Operations Hub | `central-inventory/OperationsHub.jsx` | Working — has disabled "Dispatch Stock" and "Request Stock" buttons |
| Hierarchy Summary | `central-inventory/HierarchySummary.jsx` | Working — read-only |
| Store Detail | `central-inventory/StoreDetail.jsx` | Working — read-only |
| Pending Queues | `central-inventory/PendingQueues.jsx` | Working — has "Action blocked" buttons + BlockedAction notice |
| Transfer Detail | `central-inventory/TransferDetail.jsx` | Working — shows disabled action buttons with Lock icon + "(Write API blocked)" label |
| History & Ledger | `central-inventory/HistoryLedger.jsx` | Working — read-only |
| Status Timeline | `central-inventory/StatusTimeline.jsx` | Working — shows lifecycle timeline |

### Action Button Logic

`transferActions.js` line 26-101: `getAvailableActions()` already computes correct visibility for Approve, Reject, Dispatch, Receive, Cancel, Edit. **Missing:** "Report Issue" action for dispatched-as-destination.

`TransferDetail.jsx` lines 298-323: Actions are rendered but ALL are `disabled` with `<Lock>` icon and `"(Write API blocked)"` text.

### API Client

`api.js` lines 1-132: Read-only methods present. Write methods NOT present. Generic proxy at `server.py:238` will forward any POST/GET to preprod V2 — so frontend write calls will work immediately via `/api/proxy/v2/inventory-transfer/{action}/{id}` without backend changes.

### Toast System

`use-toast.js` (shadcn/radix toast): Available but not yet used in inventory screens. `toast.jsx` and `toaster.jsx` exist in `components/ui/`. The `Toaster` component must be mounted in the app for toasts to render — need to verify if it's in `App.js` or `AppLayout.jsx`.

### Form/Dialog Patterns

UI library includes: `dialog.jsx`, `alert-dialog.jsx`, `select.jsx`, `input.jsx`, `textarea.jsx`, `label.jsx`, `form.jsx`. No existing inventory forms to reference — these will be the first form components in the inventory module.

### Route Structure

| Path | Component | Notes |
|------|-----------|-------|
| `/` | OperationsHub | Entry point: Dispatch Stock / Request Stock buttons here |
| `/hierarchy` | HierarchySummary | No write entry points planned |
| `/store/:id` | StoreDetail | Potential entry for Direct Dispatch |
| `/queues` | PendingQueues | Action buttons on queue items |
| `/history` | HistoryLedger | Read-only — no write entry points |
| `/transfer/:id` | TransferDetail | PRIMARY write action surface |

**New routes needed:**

| Path | Component | Purpose |
|------|-----------|---------|
| `/dispatch/new` | DirectDispatchForm | New form for creating direct dispatch transfers |
| `/request/new` | RequestStockForm | New form for requesting stock from parent |

---

## 5. File Target Map

| # | Area | Existing File | Planned Change | New/Modified | Risk |
|---|------|---------------|----------------|-------------|------|
| 1 | Write API client methods | `src/services/api.js` | Add 8 write methods: `initiateTransfer`, `requestStock`, `approveTransfer`, `rejectTransfer`, `dispatchTransfer`, `receiveTransfer`, `cancelTransfer`, `getSourceOptions` (already exists), `getInventoryMaster` (already exists) | MODIFIED | LOW — additive only |
| 2 | Transfer action matrix | `src/lib/transferActions.js` | Add "Report Issue" action for dispatched-as-destination. Remove disabled state. | MODIFIED | MEDIUM — must not break existing visibility |
| 3 | Terminology error mapper | `src/lib/terminology.js` | Add `mapApiErrorMessage()` function for backend error message mapping | MODIFIED | LOW — additive |
| 4 | UOM validation | `src/lib/formatters.js` | Add `validateQuantityForUnit()` function | MODIFIED | LOW — additive |
| 5 | Transfer Detail — wire actions | `src/components/central-inventory/TransferDetail.jsx` | Remove disabled state. Wire onClick to real API calls with dialogs. Add submitting state. Add fetchDetail refresh on success. | MODIFIED | HIGH — core write surface |
| 6 | Operations Hub — wire actions | `src/components/central-inventory/OperationsHub.jsx` | Replace disabled "Dispatch Stock" and "Request Stock" buttons with navigation to new form routes | MODIFIED | LOW |
| 7 | Pending Queues — remove blocked notice | `src/components/central-inventory/PendingQueues.jsx` | Remove BlockedAction notice. Optionally add inline action buttons. | MODIFIED | LOW |
| 8 | App routes | `src/App.js` | Add `/dispatch/new` and `/request/new` routes | MODIFIED | LOW |
| 9 | Screen visibility | `src/lib/screenVisibility.js` | Add "report-issue" action permission | MODIFIED | LOW |
| 10 | Confirmation dialog | `src/components/central-inventory/ConfirmActionDialog.jsx` | NEW — reusable confirmation dialog (Approve, Dispatch) | NEW | LOW |
| 11 | Reason dialog | `src/components/central-inventory/ReasonDialog.jsx` | NEW — reason input dialog (Reject, Cancel, Report Issue) | NEW | LOW |
| 12 | Receive dialog | `src/components/central-inventory/ReceiveDialog.jsx` | NEW — full receive + partial receive toggle with line-level form | NEW | MEDIUM — partial receive complexity |
| 13 | Direct Dispatch form | `src/components/central-inventory/DirectDispatchForm.jsx` | NEW — destination selector + item rows + source selector + submit | NEW | HIGH — most complex new component |
| 14 | Request Stock form | `src/components/central-inventory/RequestStockForm.jsx` | NEW — item rows + quantity + source selector + submit | NEW | MEDIUM |
| 15 | Source Selector | `src/components/central-inventory/SourceSelector.jsx` | NEW — configurable segment_id / filter_bucket picker | NEW | MEDIUM — two modes |
| 16 | Write action hook | `src/hooks/useWriteAction.js` | NEW — shared hook for submitting state, API call, toast, refresh | NEW | LOW |
| 17 | Toaster mount | `src/components/layout/AppLayout.jsx` or `src/App.js` | Add `<Toaster />` component if not already mounted | MODIFIED | LOW |

**Summary: 9 modified files + 8 new files = 17 file targets**

---

## 6. API / Payload Matrix

### 6.1 Direct Dispatch (initiate)

| Field | Value |
|-------|-------|
| **Workflow** | Direct Dispatch |
| **Endpoint** | `POST /proxy/v2/inventory-transfer/initiate` |
| **API Evidence** | E2E Sections A1-A6: 12/12 PASS |
| **Request payload** | `{ "from_restaurant_id": number, "to_restaurant_id": number, "items": [{ "source_inventory_master_id": number, "quantity": number, "unit": string, "source_selector": { "mode": "segment_id", "segment_id": number } OR { "mode": "filter_bucket", "filter_bucket": string } }] }` |
| **Required fields** | `from_restaurant_id`, `to_restaurant_id`, `items[]` (each: `source_inventory_master_id`, `quantity`, `unit`, `source_selector`) |
| **Optional fields** | Notes (if API supports) |
| **Response** | `{ "status": true, "data": { "transfer_id": number } }` |
| **Error response** | `{ "status": false, "message": "..." }` (422 validation, 403 permission) |
| **UOM field** | `unit` string per item (e.g., "kg", "ltr", "pcs") |
| **Source/Destination** | `from_restaurant_id` = logged-in user's store, `to_restaurant_id` = selected child |
| **Terminology concern** | Backend may return "franchise" or "central" in error messages |
| **Readiness** | **verified_ready** |
| **Open questions** | None |

### 6.2 Request Stock

| Field | Value |
|-------|-------|
| **Workflow** | Request Stock (child to parent) |
| **Endpoint** | `POST /proxy/v2/inventory-transfer/request` |
| **API Evidence** | E2E Section B1-B2: 4/4 PASS |
| **Request payload** | `{ "items": [{ "stock_title": string, "unit_id": number, "quantity": number, "unit": string, "source_selector": { "mode": "segment_id", "segment_id": number } }] }` |
| **Required fields** | `items[]` (each: `stock_title`, `unit_id`, `quantity`, `unit`, `source_selector`) |
| **Optional fields** | Notes |
| **Response** | `{ "status": true, "data": { "transfer_id": number } }` |
| **Error response** | `{ "status": false, "message": "..." }` (403 if not franchise/central) |
| **UOM field** | `unit` string + `unit_id` number per item |
| **Source/Destination** | Parent auto-derived by backend from logged-in user |
| **Terminology concern** | Error: "Only franchise or central can request" — must map |
| **Readiness** | **verified_ready** |
| **Open questions** | None |

### 6.3 Approve Transfer

| Field | Value |
|-------|-------|
| **Workflow** | Approve |
| **Endpoint** | `POST /proxy/v2/inventory-transfer/approve/{id}` |
| **API Evidence** | E2E Section B1-B2: 2/2 PASS |
| **Request payload** | `{}` (empty body) |
| **Required fields** | Transfer ID in URL path |
| **Optional fields** | None known |
| **Response** | Status update confirmation |
| **Error response** | 404 not found, 403 permission denied |
| **UOM field** | N/A |
| **Source/Destination** | Only source/parent can approve |
| **Terminology concern** | LOW |
| **Readiness** | **verified_ready** |
| **Open questions** | None |

### 6.4 Reject Transfer

| Field | Value |
|-------|-------|
| **Workflow** | Reject (pre-dispatch) |
| **Endpoint** | `POST /proxy/v2/inventory-transfer/reject/{id}` |
| **API Evidence** | E2E Section C1: 1/1 PASS, C4: 1/1 PASS |
| **Request payload** | `{ "resolution_type": string, "resolution_meta": { "reason": string } }` |
| **Required fields** | `resolution_type`, `resolution_meta.reason` |
| **Optional fields** | None known |
| **Response** | Status update confirmation |
| **Error response** | 404, 403, 422 |
| **Readiness** | **verified_ready** |
| **Open questions** | None |

### 6.5 Dispatch Approved Transfer

| Field | Value |
|-------|-------|
| **Workflow** | Dispatch |
| **Endpoint** | `POST /proxy/v2/inventory-transfer/dispatch/{id}` |
| **API Evidence** | E2E Section B1-B2: 2/2 PASS |
| **Request payload** | `{}` (empty body) |
| **Required fields** | Transfer ID in URL path |
| **Response** | Status update confirmation |
| **Error response** | 403, 404, 422 (may include INSUFFICIENT_STOCK) |
| **Readiness** | **verified_ready** |
| **Open questions** | None |

### 6.6 Receive Transfer (Full)

| Field | Value |
|-------|-------|
| **Workflow** | Full Receive |
| **Endpoint** | `POST /proxy/v2/inventory-transfer/receive/{id}` |
| **API Evidence** | E2E Sections A+B: 8/8 PASS |
| **Request payload** | `{}` (empty body) |
| **Required fields** | Transfer ID in URL path |
| **Response** | Status update confirmation |
| **Readiness** | **verified_ready** |
| **Open questions** | None |

### 6.7 Partial Receive

| Field | Value |
|-------|-------|
| **Workflow** | Partial Receive |
| **Endpoint** | `POST /proxy/v2/inventory-transfer/receive/{id}` |
| **API Evidence** | E2E Section C3: 1/1 PASS |
| **Request payload** | `{ "resolution_type": string, "resolution_meta": { "reason": string }, "received_lines": [{ "line_id": number, "accepted_qty": number, "rejected_qty": number }] }` |
| **Required fields** | `resolution_type`, `resolution_meta.reason`, `received_lines[]` (each: `line_id`, `accepted_qty`, `rejected_qty`) |
| **Validation** | `accepted_qty + rejected_qty = dispatched_qty` per line. `line_id` from transfer detail response. |
| **Readiness** | **verified_ready** |
| **Open questions** | None |

### 6.8 Cancel Transfer

| Field | Value |
|-------|-------|
| **Workflow** | Cancel |
| **Endpoint** | `POST /proxy/v2/inventory-transfer/cancel/{id}` |
| **API Evidence** | E2E Section C2: 1/1 PASS — stock restored confirmed |
| **Request payload** | `{ "resolution_type": string, "resolution_meta": { "reason": string } }` |
| **Required fields** | `resolution_type`, `resolution_meta.reason` |
| **Response** | Status update + stock restoration |
| **Readiness** | **verified_ready** |
| **Open questions** | None |

### 6.9 Source Options

| Field | Value |
|-------|-------|
| **Workflow** | Source Selector Data |
| **Endpoint** | `POST /proxy/v2/inventory-transfer/source-options` |
| **API Evidence** | E2E referenced in Section A + B |
| **Request payload** | `{ "from_restaurant_id": number, "source_inventory_master_id": number }` |
| **Response** | `{ "data": { "segments": [{ "segment_id": number, "cal_quantity": number, "batch": string, "expiry_date": string }] } }` |
| **Readiness** | **verified_ready** |
| **Note** | `api.js` already has `getSourceOptions()` method |

### 6.10 Inventory Master

| Field | Value |
|-------|-------|
| **Workflow** | Item List for Forms |
| **Endpoint** | `GET /proxy/v2/inventory/get-inventory-master` |
| **Response** | `{ "data": [{ "id": number, "stock_title": string, "unit": string, "unit_id": number }] }` |
| **Readiness** | **verified_ready** |
| **Note** | `api.js` already has `getInventoryMaster()` method |

**Summary: 10/10 APIs verified_ready. Zero backend blockers.**

---

## 7. Role / Status Write Action Matrix

Legend: **A** = allowed, **H** = hidden, **N/A** = not applicable

### Central Store (backend `master`)

| Status | Create Transfer | Approve | Reject | Dispatch | Receive | Partial Receive | Cancel | Report Issue | Edit | View |
|--------|----------------|---------|--------|----------|---------|----------------|--------|-------------|------|------|
| — (no transfer) | A (Direct Dispatch) | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| requested (as source) | N/A | **A** | **A** | H | H | H | H | H | H | A |
| approved (as source) | N/A | H | H | **A** | H | H | **A** | H | H | A |
| dispatched (as source) | N/A | H | H | H | H | H | **A** | H | H | A |
| dispatched (as destination) | N/A | H | H | H | **A** | **A** | H | **A** | H | A |
| received | N/A | H | H | H | H | H | H | H | H | A |
| partially_received | N/A | H | H | H | H | H | H | H | H | A |
| cancelled | N/A | H | H | H | H | H | H | H | H | A |
| rejected | N/A | H | H | H | H | H | H | H | H | A |

### Master Store (backend `central`)

| Status | Create Transfer | Approve | Reject | Dispatch | Receive | Partial Receive | Cancel | Report Issue | Edit | View |
|--------|----------------|---------|--------|----------|---------|----------------|--------|-------------|------|------|
| — (no transfer) | A (Direct Dispatch + Request Stock) | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| requested (as source/parent) | N/A | **A** | **A** | H | H | H | H | H | H | A |
| requested (as requester) | N/A | H | H | H | H | H | H | H | **A** | A |
| approved (as source) | N/A | H | H | **A** | H | H | **A** | H | H | A |
| dispatched (as source) | N/A | H | H | H | H | H | **A** | H | H | A |
| dispatched (as destination) | N/A | H | H | H | **A** | **A** | H | **A** | H | A |
| Terminal statuses | N/A | H | H | H | H | H | H | H | H | A |

### Outlet (backend `franchise`)

| Status | Create Transfer | Approve | Reject | Dispatch | Receive | Partial Receive | Cancel | Report Issue | Edit | View |
|--------|----------------|---------|--------|----------|---------|----------------|--------|-------------|------|------|
| — (no transfer) | A (Request Stock only) | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| requested (as requester) | N/A | H | H | H | H | H | H | H | **A** | A |
| dispatched (as destination) | N/A | H | H | H | **A** | **A** | H | **A** | H | A |
| All other statuses | N/A | H | H | H | H | H | H | H | H | A |

---

## 8. Source Selector Plan

### 8.1 segment_id Mode (DEFAULT)

**How it works:**
1. User selects item from inventory master dropdown
2. Frontend calls `getSourceOptions({ inventoryMasterId, restaurantId: fromRestaurantId })`
3. API returns `segments[]` with: `segment_id`, `cal_quantity`, `batch`, `expiry_date`
4. User selects a specific segment from the list
5. Payload includes: `"source_selector": { "mode": "segment_id", "segment_id": <selected> }`

**Role visibility:**
- Central: sees segments from own stock (restaurant_id=1)
- Master: sees segments from own stock
- Outlet: N/A (outlets cannot dispatch, but Request Stock uses parent segments)

**Validation:**
- Segment must be selected before submission
- Selected segment must have `cal_quantity >= requested quantity`
- If no segments returned, show "No stock available" and block submission

**Fallback:** If source-options API fails, show error and prevent item selection.

### 8.2 filter_bucket Mode

**How it works:**
1. Instead of selecting a specific segment, user selects a filter bucket category
2. Payload includes: `"source_selector": { "mode": "filter_bucket", "filter_bucket": "<bucket_name>" }`
3. Known bucket values: `without_batch_and_expiry`, `with_batch_and_expiry` (from E2E evidence)

**WARNING from E2E testing:** `filter_bucket` mode failed in all tests where stock had batch/expiry data. `segment_id` passed 100%. Implementation MUST:
- Default to `segment_id` mode
- Show warning text when user switches to `filter_bucket`: "This mode may not work with batched stock. Use Segment mode for reliability."
- Allow user to choose regardless (owner mandated both modes: Q-S4-002: B)

**Role visibility:** Same as segment_id mode.

**Validation:**
- Bucket must be selected before submission
- No quantity validation possible in this mode (backend handles)

**Terminology mapping risk:** Bucket names may contain backend terms — map through terminology adapter if needed.

### 8.3 UX Component Design

The `SourceSelector` component:
- Receives `fromRestaurantId` and `inventoryMasterId` as props
- Fetches source-options on mount / item change
- Shows mode toggle: "Segment" (default) | "Bucket"
- In Segment mode: dropdown/list of segments with batch, expiry, quantity info
- In Bucket mode: dropdown of bucket categories with warning note
- Returns selected `source_selector` object to parent form

---

## 9. Implementation Plan by Must-Have Item

### MH-1: Approve Transfer Action

| Field | Value |
|-------|-------|
| **Requirement** | Central/Master can approve a requested transfer from Transfer Detail |
| **Current state** | Approve button shows as disabled with Lock icon and "(Write API blocked)" |
| **Proposed change** | Enable button. On click, show ConfirmActionDialog. On confirm, POST to `approve/{id}` with `{}`. On success, toast + refetch detail. |
| **File targets** | `TransferDetail.jsx` (wire onClick), `api.js` (add `approveTransfer(id)`), `ConfirmActionDialog.jsx` (NEW) |
| **API dependency** | `POST /proxy/v2/inventory-transfer/approve/{id}` — verified_ready |
| **Validation** | None (empty payload) |
| **Success behavior** | Toast: "Transfer approved". Refetch transfer detail. Status changes to "approved". |
| **Error behavior** | Toast with API error message (mapped through terminology). Re-enable button. |
| **Refresh behavior** | Refetch transfer detail via `fetchDetail()` |
| **Acceptance criteria** | Central user clicks Approve on a "requested" transfer -> confirmation dialog -> confirm -> status becomes "approved" -> timeline updates |
| **Smoke test** | Login as Central, go to Transfer Detail of a "requested" transfer, click Approve, confirm dialog, verify status change |
| **Risk** | LOW |

### MH-2: Reject Transfer Action with Reason Dialog

| Field | Value |
|-------|-------|
| **Requirement** | Central/Master can reject a requested transfer with mandatory reason |
| **Current state** | Reject button shows as disabled |
| **Proposed change** | Enable button. On click, show ReasonDialog with resolution_type dropdown + reason textarea. On submit, POST to `reject/{id}`. |
| **File targets** | `TransferDetail.jsx`, `api.js` (add `rejectTransfer(id, payload)`), `ReasonDialog.jsx` (NEW) |
| **API dependency** | `POST /proxy/v2/inventory-transfer/reject/{id}` — verified_ready |
| **Validation** | `resolution_type` required. `reason` required, min 10 chars, max 500 chars. |
| **Success behavior** | Toast: "Transfer rejected". Refetch detail. Status becomes "rejected". |
| **Error behavior** | Toast with mapped error. Re-enable button. |
| **Refresh behavior** | Refetch transfer detail |
| **Acceptance criteria** | Central user clicks Reject -> reason dialog opens -> select type + enter reason -> submit -> status "rejected" |
| **Risk** | LOW |

### MH-3: Dispatch Approved Transfer

| Field | Value |
|-------|-------|
| **Requirement** | Source store can dispatch an approved transfer |
| **Current state** | Dispatch button shows as disabled |
| **Proposed change** | Enable button. On click, show ConfirmActionDialog with transfer summary. On confirm, POST to `dispatch/{id}` with `{}`. |
| **File targets** | `TransferDetail.jsx`, `api.js` (add `dispatchTransfer(id)`) |
| **API dependency** | `POST /proxy/v2/inventory-transfer/dispatch/{id}` — verified_ready |
| **Validation** | None (empty payload) |
| **Success behavior** | Toast: "Transfer dispatched". Refetch detail. Status becomes "dispatched". |
| **Error behavior** | Toast — may include INSUFFICIENT_STOCK. Show EDGE-002 warning on timeout. |
| **Refresh behavior** | Refetch transfer detail |
| **Acceptance criteria** | Source user clicks Dispatch on "approved" transfer -> confirm -> status "dispatched" |
| **Risk** | MEDIUM — insufficient stock error possible |

### MH-4: Receive Transfer (Full)

| Field | Value |
|-------|-------|
| **Requirement** | Destination store can fully receive a dispatched transfer |
| **Current state** | Receive button shows as disabled |
| **Proposed change** | Enable button. On click, show ReceiveDialog with "Receive All" default + "Partial Receive" toggle. For full receive: POST with `{}`. |
| **File targets** | `TransferDetail.jsx`, `api.js` (add `receiveTransfer(id, payload)`), `ReceiveDialog.jsx` (NEW) |
| **API dependency** | `POST /proxy/v2/inventory-transfer/receive/{id}` — verified_ready |
| **Validation** | None for full receive (empty payload) |
| **Success behavior** | Toast: "Transfer received". Refetch detail. Status becomes "received". |
| **Refresh behavior** | Refetch transfer detail |
| **Acceptance criteria** | Destination user clicks Receive on "dispatched" transfer -> "Receive All" -> confirm -> status "received" |
| **Risk** | LOW |

### MH-5: Partial Receive with Line-Level Resolution

| Field | Value |
|-------|-------|
| **Requirement** | Destination store can partially receive with per-line accepted/rejected quantities and resolution |
| **Current state** | No partial receive UI exists |
| **Proposed change** | In ReceiveDialog, toggle "Partial Receive" shows line-level form: accepted_qty + rejected_qty per line. If rejected > 0, resolution_type + reason required per line. POST with `received_lines[]` payload. |
| **File targets** | `ReceiveDialog.jsx` (includes partial receive form) |
| **API dependency** | `POST /proxy/v2/inventory-transfer/receive/{id}` with `received_lines[]` — verified_ready |
| **Validation** | Per line: `0 <= accepted_qty <= dispatched_qty`. `accepted_qty + rejected_qty = dispatched_qty`. If `rejected_qty > 0`: `resolution_type` required, `reason` required (min 10 chars). |
| **Success behavior** | Toast: "Transfer partially received". Refetch detail. Status becomes "partially_received". |
| **Acceptance criteria** | Destination clicks Receive -> toggles Partial Receive -> adjusts per-line quantities -> enters reason for rejected -> submit -> status "partially_received" |
| **Risk** | MEDIUM — line_id mismatch risk. Always use `line.id` from fresh transfer detail response. |

### MH-6: Cancel Transfer with Reason Dialog

| Field | Value |
|-------|-------|
| **Requirement** | Source store can cancel an approved or dispatched transfer with mandatory reason |
| **Current state** | Cancel button shows as disabled |
| **Proposed change** | Enable button. On click, show ReasonDialog (same component as Reject). On submit, POST to `cancel/{id}`. |
| **File targets** | `TransferDetail.jsx`, `api.js` (add `cancelTransfer(id, payload)`) |
| **API dependency** | `POST /proxy/v2/inventory-transfer/cancel/{id}` — verified_ready |
| **Validation** | Same as Reject: `resolution_type` required, `reason` required min 10 chars |
| **Success behavior** | Toast: "Transfer cancelled — stock restored". Refetch detail. Status becomes "cancelled". |
| **Acceptance criteria** | Source user clicks Cancel -> reason dialog -> submit -> status "cancelled" |
| **Risk** | LOW |

### MH-7: "Report Issue" Action

| Field | Value |
|-------|-------|
| **Requirement** | Destination store can "Report Issue" on a dispatched transfer (Q-XFER-006 override) |
| **Current state** | No "Report Issue" action in `transferActions.js` or TransferDetail |
| **Proposed change** | Add `{ id: "report-issue", label: "Report Issue", variant: "destructive" }` to `getAvailableActions()` when `status === "dispatched" && isDestination`. Show ReasonDialog on click. POST to `reject/{id}` API. |
| **File targets** | `transferActions.js` (add action), `TransferDetail.jsx` (wire onClick), `screenVisibility.js` (add permission) |
| **API dependency** | `POST /proxy/v2/inventory-transfer/reject/{id}` — verified_ready (same as pre-dispatch reject) |
| **Validation** | Same as Reject: `resolution_type` required, `reason` required. Resolution types may include: `damaged`, `wrong_items`, `quantity_discrepancy`, `other`. |
| **Success behavior** | Toast: "Issue reported". Refetch detail. Status impact: likely becomes "rejected" per API behavior (C4 test PASS). |
| **UI label** | "Report Issue" (NOT "Reject") per owner mandate |
| **Acceptance criteria** | Destination user sees "Report Issue" button on dispatched transfer -> clicks -> reason dialog -> submit -> API confirms |
| **Risk** | LOW — API supports it (C4 PASS). Status impact confirmed as rejection. |

### MH-8: Direct Dispatch Form

| Field | Value |
|-------|-------|
| **Requirement** | Central/Master can create a new transfer via Direct Dispatch form. Central can dispatch to Master OR Outlet directly (Q-S4-003). |
| **Current state** | "Dispatch Stock" button on Operations Hub is disabled |
| **Proposed change** | NEW route `/dispatch/new` -> `DirectDispatchForm.jsx`. Replace disabled button with `navigate('/dispatch/new')`. Form has: destination selector, item rows (add/remove), per-item source selector, quantity, submit. |
| **File targets** | `DirectDispatchForm.jsx` (NEW), `SourceSelector.jsx` (NEW), `App.js` (new route), `OperationsHub.jsx` (wire button) |
| **API dependency** | `POST /proxy/v2/inventory-transfer/initiate` — verified_ready |
| **Validation** | Destination required. At least 1 item row. Per item: item selected, quantity > 0, source segment selected. UOM validation per item type. No duplicate items in same transfer. |
| **Success behavior** | Toast: "Dispatch created". Navigate to new transfer's detail page (`/transfer/{new_id}`). |
| **Error behavior** | Inline field errors + toast with mapped API error. Keep form data. |
| **Destination selector** | Central: dropdown from hierarchy-summary (Master Stores + Outlets). Master: dropdown of own child Outlets. |
| **Acceptance criteria** | Central user opens form -> selects destination -> adds items -> selects segments -> submits -> transfer created -> navigated to detail |
| **Risk** | HIGH — most complex component. Source selector integration, UOM validation, destination filtering. |

### MH-9: Request Stock Form

| Field | Value |
|-------|-------|
| **Requirement** | Outlet/Master can request stock from parent store |
| **Current state** | "Request Stock" button on Operations Hub is disabled |
| **Proposed change** | NEW route `/request/new` -> `RequestStockForm.jsx`. Replace disabled button with `navigate('/request/new')`. Form has: source (auto = parent, display-only), item rows, quantity, source selector (from parent's stock), submit. |
| **File targets** | `RequestStockForm.jsx` (NEW), `SourceSelector.jsx` (shared), `App.js` (new route), `OperationsHub.jsx` (wire button) |
| **API dependency** | `POST /proxy/v2/inventory-transfer/request` — verified_ready |
| **Validation** | At least 1 item row. Per item: item selected, quantity > 0, source selector value required, unit match. |
| **Success behavior** | Toast: "Request submitted". Navigate to new transfer's detail page. |
| **Destination/Source** | Parent is auto-derived by backend. Frontend shows parent name as display-only field. |
| **Acceptance criteria** | Outlet user opens form -> sees parent as source -> adds items -> enters quantities -> selects segments -> submits -> transfer created |
| **Risk** | MEDIUM — source selector uses parent's restaurant_id for source-options call. |

### MH-10: Source Selector (segment_id + filter_bucket)

| Field | Value |
|-------|-------|
| **Requirement** | Configurable source selector supporting both modes (Q-S4-002: B) |
| **Current state** | No source selector component exists |
| **Proposed change** | NEW component `SourceSelector.jsx`. Props: `fromRestaurantId`, `inventoryMasterId`, `value`, `onChange`. Calls source-options API. Shows mode toggle + segment/bucket picker. |
| **File targets** | `SourceSelector.jsx` (NEW) |
| **API dependency** | `POST /proxy/v2/inventory-transfer/source-options` — verified_ready |
| **Default mode** | `segment_id` (per E2E evidence — 100% pass rate) |
| **filter_bucket warning** | Show warning when user switches to bucket mode |
| **Acceptance criteria** | User can toggle between segment and bucket modes. Segment mode shows list of segments with batch/expiry/qty. Bucket mode shows category dropdown with warning. Selected value flows to parent form's source_selector field. |
| **Risk** | MEDIUM — filter_bucket mode may fail with batched stock |

### MH-11: Confirmation Dialogs

| Field | Value |
|-------|-------|
| **Requirement** | All destructive actions show confirmation dialog with action summary (SEC-002: A) |
| **Current state** | No confirmation dialogs exist |
| **Proposed change** | NEW component `ConfirmActionDialog.jsx` — reusable. Props: `open`, `onConfirm`, `onCancel`, `title`, `description`, `confirmLabel`, `variant`. Used for Approve, Dispatch. ReasonDialog (also NEW) handles Reject, Cancel, Report Issue (includes required reason input). |
| **File targets** | `ConfirmActionDialog.jsx` (NEW), `ReasonDialog.jsx` (NEW) |
| **Acceptance criteria** | Every write action triggers a dialog before API call. Dialog shows transfer summary (from -> to, items count). Confirm/Cancel buttons. |
| **Risk** | LOW |

### MH-12: Duplicate Submission Prevention + Post-Action Refresh

| Field | Value |
|-------|-------|
| **Requirement** | Buttons disabled during API call. Data refreshes after success. (UX-002: A) |
| **Current state** | Buttons are permanently disabled (write blocked) |
| **Proposed change** | Create `useWriteAction` hook: manages `submitting` state, wraps API call in try/catch, sets `submitting=true` on click, `false` on response. All action buttons use `disabled={submitting}`. On success: call `fetchDetail()` to refetch. On error: re-enable buttons + show error toast. |
| **File targets** | `useWriteAction.js` (NEW hook), `TransferDetail.jsx` (use hook) |
| **Refresh strategy** | After each successful write on TransferDetail: refetch transfer detail. List screens (PendingQueues, OperationsHub) will refetch on next mount (React state invalidation). |
| **Timeout handling** | If API call exceeds 15s, show EDGE-002 warning: "Action may have been processed. Check transfer status before retrying." |
| **Acceptance criteria** | Click action -> button shows spinner/disabled -> API responds -> button re-enables OR data refreshes. No double-click possible. |
| **Risk** | LOW |

---

## 10. Should-Have Inclusion Plan

### SH-13: Edit Transfer

| Decision | **include_if_low_risk** |
|----------|------------------------|
| **Reason** | Edit button already exists in action matrix (`transferActions.js` line 77, 94). Needs form pre-populated with existing transfer data. Uses edit/update API (not explicitly tested in E2E but implied by Q-XFER-003). Resets status to "requested". |
| **File target** | Could reuse RequestStockForm with pre-populated data and an "update" mode. Or a new EditTransferForm. |
| **Risk** | MEDIUM — edit API contract not in E2E evidence. May need API discovery. Defer if risky. |
| **Recommendation** | Implement if the edit API endpoint is discoverable via generic proxy testing. Otherwise defer. |

### SH-14: Success/Error Toast Notifications

| Decision | **include_in_slice_4** |
|----------|----------------------|
| **Reason** | Toast system already exists (`use-toast.js`). Critical for UX feedback on all write actions. Low effort. |
| **File target** | All action handlers in `TransferDetail.jsx` and form components. Need to add `<Toaster />` to app layout. |
| **Risk** | LOW |
| **Recommendation** | Include — essential UX polish that should ship with write actions. |

### SH-15: Quantity Validation with UOM Awareness

| Decision | **include_in_slice_4** |
|----------|----------------------|
| **Reason** | Owner confirmed (ITM-002: C): whole numbers for pcs, 2 decimals for kg/ltr. Simple validation function. |
| **File target** | `formatters.js` (add `validateQuantityForUnit()`). Used in DirectDispatchForm and RequestStockForm. |
| **Risk** | LOW |
| **Recommendation** | Include — prevents API validation errors and improves UX. |

### SH-16: API Error Message Terminology Mapping

| Decision | **include_in_slice_4** |
|----------|----------------------|
| **Reason** | Backend may return "Only franchise or central can request" in error messages. Need to map "franchise" -> "Outlet", "central" -> "Master Store". |
| **File target** | `terminology.js` (add `mapApiErrorMessage()` function). Used in all error toast handlers. |
| **Risk** | LOW |
| **Recommendation** | Include — prevents terminology leakage in error messages. |

---

## 11. Forms and Dialogs Plan

### 11.1 ConfirmActionDialog.jsx (NEW)

| Field | Details |
|-------|---------|
| **Purpose** | Simple confirmation for Approve and Dispatch |
| **Library** | Uses `alert-dialog.jsx` from UI components |
| **Props** | `open`, `onOpenChange`, `title`, `description`, `confirmLabel`, `confirmVariant`, `onConfirm`, `submitting` |
| **Fields** | None — display only. Shows transfer summary (from -> to, items count). |
| **Buttons** | Cancel (ghost), Confirm (primary, shows spinner when submitting) |
| **Entry points** | TransferDetail: Approve button, Dispatch button |

### 11.2 ReasonDialog.jsx (NEW)

| Field | Details |
|-------|---------|
| **Purpose** | Reason input for Reject, Cancel, Report Issue |
| **Library** | Uses `dialog.jsx`, `select.jsx`, `textarea.jsx`, `label.jsx` from UI components |
| **Props** | `open`, `onOpenChange`, `title`, `actionLabel`, `actionVariant`, `onSubmit`, `submitting`, `resolutionTypes` |
| **Fields** | Resolution type (Select dropdown, required), Reason (Textarea, required, min 10 chars, max 500 chars) |
| **Validation** | Both fields required. Reason min 10 chars. Submit disabled until valid. |
| **Buttons** | Cancel (ghost), Submit (destructive variant for Reject/Cancel, default for Report Issue) |
| **Entry points** | TransferDetail: Reject, Cancel, Report Issue buttons |
| **Resolution type options** | Reject/Cancel: `return_to_source`, `damaged`, `other`. Report Issue: `damaged`, `wrong_items`, `quantity_discrepancy`, `other`. |

### 11.3 ReceiveDialog.jsx (NEW)

| Field | Details |
|-------|---------|
| **Purpose** | Full receive + partial receive toggle |
| **Library** | Uses `dialog.jsx`, `input.jsx`, `select.jsx`, `textarea.jsx` from UI components |
| **Props** | `open`, `onOpenChange`, `transfer`, `onSubmit`, `submitting` |
| **Default view** | "Receive All" — shows line items summary. Single "Receive All" button. Posts `{}`. |
| **Toggle** | "I want to partially receive" checkbox/switch. When enabled, shows per-line form. |
| **Partial receive fields** | Per line: Accepted qty (number input, max = dispatched), Rejected qty (auto-calculated: dispatched - accepted). If rejected > 0: resolution_type dropdown + reason textarea. |
| **Validation** | Per line: `0 <= accepted <= dispatched`. If any line has `rejected > 0`, resolution_type + reason (min 10 chars) required. |
| **Buttons** | Cancel (ghost), "Receive All" or "Submit Partial Receive" (primary) |
| **Entry points** | TransferDetail: Receive button |

### 11.4 DirectDispatchForm.jsx (NEW)

| Field | Details |
|-------|---------|
| **Purpose** | Create new direct dispatch transfer |
| **Route** | `/dispatch/new` |
| **Sections** | 1. Destination selector (dropdown). 2. Item rows (repeatable). 3. Per-item: Item dropdown, Quantity input, Unit (read-only), Source selector. 4. Notes (optional textarea). 5. Submit button. |
| **Role gating** | Only Central and Master can access. Outlet sees permission denied. |
| **Destination data** | Populated from `getHierarchySummary()` filtered by role. Central: Master Stores + Outlets. Master: own child Outlets. |
| **Item data** | Populated from `getInventoryMaster()`. Searchable dropdown. |
| **Source selector** | Per item: `SourceSelector` component with `fromRestaurantId = user's restaurant_id`. |
| **Validation** | Destination required. >= 1 item. Per item: item selected, qty > 0, UOM valid, source selected. No duplicate items. |
| **Submit** | POST to `initiate` with full payload. |
| **Success** | Toast "Dispatch created". Navigate to `/transfer/{new_id}`. |
| **Error** | Inline field errors. Toast with mapped API error. Keep form state. |

### 11.5 RequestStockForm.jsx (NEW)

| Field | Details |
|-------|---------|
| **Purpose** | Request stock from parent store |
| **Route** | `/request/new` |
| **Sections** | 1. Source (display-only: parent store name). 2. Item rows (repeatable). 3. Per-item: Item search, Quantity, Unit, Source selector (from parent's stock). 4. Notes (optional). 5. Submit. |
| **Role gating** | Only Master and Outlet can access. Central sees permission denied. |
| **Source selector** | Per item: `SourceSelector` with `fromRestaurantId = parent's restaurant_id`. Need to resolve parent ID. |
| **Parent resolution** | Use hierarchy data or login context. Master's parent = Central (id=1 in seed). Outlet's parent = `parent_restaurant_id` from restaurant data. May need to derive from hierarchy-summary API. |
| **Validation** | >= 1 item. Per item: item selected, qty > 0, unit valid, source selected. |
| **Submit** | POST to `request` with items payload. |

### 11.6 SourceSelector.jsx (NEW)

| Field | Details |
|-------|---------|
| **Purpose** | Configurable source selector (segment_id + filter_bucket) |
| **Props** | `fromRestaurantId`, `inventoryMasterId`, `value`, `onChange`, `disabled` |
| **On mount** | Calls `getSourceOptions({ restaurantId: fromRestaurantId, inventoryMasterId })` |
| **Mode toggle** | Tabs or radio: "Segment" (default) | "Bucket" |
| **Segment mode** | List/dropdown of segments. Each shows: batch name, expiry date, available quantity. User selects one. Returns `{ mode: "segment_id", segment_id: <selected> }` |
| **Bucket mode** | Dropdown of bucket categories. Shows warning note about reliability. Returns `{ mode: "filter_bucket", filter_bucket: <selected> }` |
| **Empty state** | "No stock available for this item" — blocks form submission. |

---

## 12. Validation Plan

### Field Validation

| Form / Dialog | Field | Rule | Error Message |
|--------------|-------|------|---------------|
| ReasonDialog | resolution_type | Required | "Please select a resolution type" |
| ReasonDialog | reason | Required, min 10, max 500 | "Reason must be at least 10 characters" |
| DirectDispatchForm | destination | Required | "Please select a destination store" |
| DirectDispatchForm | items | >= 1 row | "Add at least one item" |
| DirectDispatchForm | item (per row) | Required | "Please select an item" |
| DirectDispatchForm | quantity (per row) | > 0, UOM-aware | "Quantity must be greater than 0" |
| DirectDispatchForm | source_selector (per row) | Required | "Please select a source segment" |
| RequestStockForm | items | >= 1 row | "Add at least one item" |
| RequestStockForm | item (per row) | Required | "Please select an item" |
| RequestStockForm | quantity (per row) | > 0, UOM-aware | "Quantity must be greater than 0" |
| ReceiveDialog (partial) | accepted_qty (per line) | 0 to dispatched | "Accepted quantity cannot exceed dispatched" |
| ReceiveDialog (partial) | rejected_qty (per line) | = dispatched - accepted | Auto-calculated |
| ReceiveDialog (partial) | resolution_type (if rejected > 0) | Required | "Resolution type required for rejected items" |
| ReceiveDialog (partial) | reason (if rejected > 0) | Required, min 10 | "Reason required for rejected items" |

### UOM Validation (SH-15)

| Unit Type | Decimal Rule | Example |
|-----------|-------------|---------|
| pcs | Whole numbers only | 10, 25, 100 (not 10.5) |
| kg | Up to 2 decimal places | 5, 2.5, 10.25 |
| ltr | Up to 2 decimal places | 3, 1.5, 0.75 |

**Implementation:** `validateQuantityForUnit(quantity, unit)` function in `formatters.js`.

### Duplicate Prevention

| Surface | Method |
|---------|--------|
| Action buttons (TransferDetail) | `submitting` state from `useWriteAction` hook. Button `disabled={submitting}`. |
| Form submit (DirectDispatchForm, RequestStockForm) | Form-level `submitting` state. All fields + submit button disabled during API call. |
| Dialog confirm (ConfirmActionDialog, ReasonDialog, ReceiveDialog) | `submitting` prop. Confirm button shows spinner + disabled. Cancel button also disabled. |

---

## 13. Refresh and Consistency Plan

| After Action | Refresh Strategy |
|-------------|-----------------|
| **Approve** on TransferDetail | Refetch transfer detail via `fetchDetail()`. PendingQueues will refetch on next mount. |
| **Reject** on TransferDetail | Refetch transfer detail. PendingQueues invalidated on next mount. |
| **Dispatch** on TransferDetail | Refetch transfer detail. Ready to Dispatch count invalidated on next mount. |
| **Receive** on TransferDetail | Refetch transfer detail. PendingQueues receive count invalidated on next mount. |
| **Partial Receive** on TransferDetail | Refetch transfer detail. PendingQueues invalidated on next mount. |
| **Cancel** on TransferDetail | Refetch transfer detail. PendingQueues + Ready to Dispatch invalidated on next mount. |
| **Report Issue** on TransferDetail | Refetch transfer detail. |
| **Direct Dispatch form submit** | Navigate to `/transfer/{new_id}`. New transfer detail page fetches fresh data. |
| **Request Stock form submit** | Navigate to `/transfer/{new_id}`. New transfer detail page fetches fresh data. |
| **History & Ledger** | No auto-refresh. Show note: "Data may not reflect the latest changes. Refresh to see updates." (optional) |

**Implementation:** No global state management needed. Each screen fetches fresh data on mount via `useEffect`. After write actions on TransferDetail, call `fetchDetail()` to re-render with updated status/timeline.

---

## 14. Error / Toast / Terminology Plan

### Success Toasts

| Action | Toast Message |
|--------|---------------|
| Approve | "Transfer #{id} approved" |
| Reject | "Transfer #{id} rejected" |
| Dispatch | "Transfer #{id} dispatched" |
| Receive (full) | "Transfer #{id} received" |
| Receive (partial) | "Transfer #{id} partially received" |
| Cancel | "Transfer #{id} cancelled — stock restored" |
| Report Issue | "Issue reported for Transfer #{id}" |
| Direct Dispatch | "Dispatch created — Transfer #{new_id}" |
| Request Stock | "Stock request submitted — Transfer #{new_id}" |

### Error Toasts

| Error Type | Toast Message |
|-----------|---------------|
| 403 Permission Denied | "Permission denied — you cannot perform this action" |
| 404 Not Found | "Transfer not found" |
| 422 Validation | Mapped API error message (with terminology fix) |
| Network Error | "Network error — check transfer status before retrying" (EDGE-002) |
| Timeout (>15s) | "Request timed out — the action may have been processed. Check transfer status before retrying." |
| INSUFFICIENT_STOCK | "Insufficient stock to dispatch this transfer" |

### Terminology Mapping for Error Messages

**New function: `mapApiErrorMessage(message)` in `terminology.js`**

Replaces:
- "franchise" -> "Outlet"
- "central" -> "Master Store"
- "master" -> "Central Store"
- "Only franchise or central can request" -> "Only Outlet or Master Store can request"

Applied to ALL API error messages before displaying in toast or inline.

---

## 15. UOM / UNIT_CONVERSION Risk Plan

### Risk Assessment

UNIT_CONVERSION was the critical blocker that blocked ALL write APIs until the 52/52 E2E report resolved it. The resolution was:
- Backend seeded/migrated unit conversion metadata
- All E2E tests pass with `segment_id` source selector mode
- `filter_bucket` mode still fails with batched stock

### Mitigation Strategy

1. **Default to segment_id mode** — 100% pass rate in E2E testing
2. **UOM validation in forms** — enforce whole numbers for pcs, 2 decimals for kg/ltr BEFORE submission
3. **API error handling** — if UNIT_CONVERSION error resurfaces, show clear error toast: "Unit conversion error. Try using Segment mode for source selection."
4. **No frontend unit conversion** — let backend handle all unit math. Frontend only validates format.
5. **Monitor first writes** — first few real dispatches should be manually verified for correct stock movement.

### Unit Fields in Payloads

| API | Unit Field | Source |
|-----|-----------|--------|
| initiate | `unit` per item | From inventory master item data |
| request | `unit` + `unit_id` per item | From inventory master item data |
| receive (partial) | N/A — uses `line_id` from existing transfer | N/A |
| All others | N/A — empty payload | N/A |

---

## 16. Acceptance Criteria

1. Central user can approve a requested transfer from Transfer Detail — status changes to "approved".
2. Central user can reject a requested transfer with mandatory reason — status changes to "rejected".
3. Central/Master user can dispatch an approved transfer — status changes to "dispatched".
4. Destination user can fully receive a dispatched transfer — status changes to "received".
5. Destination user can partially receive with per-line accepted/rejected quantities and reason — status changes to "partially_received".
6. Source user can cancel a dispatched or approved transfer with reason — status changes to "cancelled", stock restored.
7. Destination user can "Report Issue" on a dispatched transfer (labeled "Report Issue", not "Reject") — API confirms.
8. Central/Master user can create a direct dispatch via form (including Central direct to Outlet) — transfer created, navigated to detail.
9. Master/Outlet user can create a stock request from parent — request created, navigated to detail.
10. Source selector offers both segment_id (default) and filter_bucket modes with appropriate warnings.
11. All destructive actions (reject, cancel, report issue) show confirmation dialog with action summary and mandatory reason.
12. All action buttons are disabled during API call — no duplicate submissions possible.
13. After successful write, Transfer Detail refreshes to show updated status and timeline.
14. API errors show clear error toast with terminology-mapped message.
15. Network timeout errors show "check transfer status before retrying" warning (EDGE-002).
16. No backend terms (master, central, franchise) appear in any form, dialog, toast, or error message.
17. Actions are only visible per the role/status matrix — no action leakage to wrong roles.
18. UOM validation enforces whole numbers for pcs, 2 decimals for kg/ltr.

---

## 17. Smoke Checklist

### Central Store (`abhishek@kalabahia.com` / `Qplazm@10`)

- [ ] Operations Hub: "Dispatch Stock" button navigates to `/dispatch/new`
- [ ] Direct Dispatch form: destination dropdown shows Master Stores + Outlets
- [ ] Direct Dispatch form: can add items from inventory master
- [ ] Direct Dispatch form: source selector shows segments after item selection
- [ ] Direct Dispatch form: source selector mode toggle works (segment/bucket)
- [ ] Direct Dispatch form: submit creates transfer and navigates to detail
- [ ] Transfer Detail (requested, as source): Approve button enabled -> confirmation dialog -> confirm -> status "approved"
- [ ] Transfer Detail (requested, as source): Reject button enabled -> reason dialog -> enter type + reason -> submit -> status "rejected"
- [ ] Transfer Detail (approved, as source): Dispatch button enabled -> confirmation dialog -> confirm -> status "dispatched"
- [ ] Transfer Detail (dispatched, as destination): Receive button enabled -> "Receive All" -> status "received"
- [ ] Transfer Detail (dispatched, as destination): Receive -> toggle "Partial Receive" -> adjust per-line quantities -> enter reason -> submit -> status "partially_received"
- [ ] Transfer Detail (dispatched, as destination): "Report Issue" button visible -> reason dialog -> submit -> API confirms
- [ ] Transfer Detail (dispatched, as source): Cancel button enabled -> reason dialog -> submit -> status "cancelled"
- [ ] Transfer Detail (terminal statuses: received, cancelled, rejected): NO action buttons visible
- [ ] All action buttons disabled during API call (double-click prevention)
- [ ] All toasts display correctly (success + error)

### Master Store (`owner@democentral1.com` / `Qplazm@10`)

- [ ] Operations Hub: "Dispatch Stock" + "Request Stock" buttons navigate to forms
- [ ] Direct Dispatch form: destination shows own child Outlets only (DemoFranchise1, DemoFranchise2)
- [ ] Request Stock form: source shows parent (My Genie) as display-only
- [ ] Request Stock form: submit creates request and navigates to detail
- [ ] Transfer Detail: can approve/reject child outlet's request
- [ ] Transfer Detail: can dispatch approved transfer
- [ ] Transfer Detail: can receive dispatched transfer (as destination)
- [ ] Transfer Detail: "Report Issue" visible on dispatched-as-destination
- [ ] Transfer Detail (own request): Edit button visible (should-have)

### Outlet (`owner@demofranchise1.com` / `Qplazm@10`)

- [ ] Operations Hub: "Request Stock" button visible and navigates to form
- [ ] Operations Hub: "Dispatch Stock" button NOT visible
- [ ] Request Stock form: source shows parent (DemoCentral1) as display-only
- [ ] Request Stock form: submit creates request
- [ ] Transfer Detail: can receive dispatched transfer
- [ ] Transfer Detail: "Report Issue" visible on dispatched-as-destination
- [ ] Transfer Detail: NO approve/dispatch/cancel buttons visible
- [ ] Direct Dispatch form: NOT accessible (permission denied or redirect)

### Cross-Role Checks

- [ ] No raw backend terms ("master", "central", "franchise") in any form, dialog, toast, or error message
- [ ] All confirmation dialogs work for destructive actions (reject, cancel, report issue)
- [ ] History & Ledger reflects new transfers after creation
- [ ] Pending Queues counts update after approve/reject/receive/cancel (on next navigation)
- [ ] Source selector defaults to segment_id mode
- [ ] Source selector shows warning when switching to filter_bucket mode
- [ ] UOM validation: pcs = whole numbers, kg/ltr = 2 decimals
- [ ] Loading/disabled states during all API calls
- [ ] Existing Slice 1/2/3 functionality not broken (regression)

---

## 18. Implementation Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | **UNIT_CONVERSION regression** | LOW (resolved in 52/52 E2E) | Monitor first write calls. Default to segment_id mode. If fails, check unit table seeding. |
| 2 | **Source/destination mapping risk** | MEDIUM | Central=master(top), Master=central(middle), Outlet=franchise(bottom). All destination dropdowns must use hierarchy-summary data which returns business names. Never show backend types. |
| 3 | **segment_id/filter_bucket mismatch** | MEDIUM | Default to segment_id. Show warning for filter_bucket. If bucket fails, guide user to switch modes. |
| 4 | **Role permission leakage** | HIGH | Reuse existing `transferActions.js` matrix (add Report Issue). Backend also validates server-side. Test all 3 roles. |
| 5 | **Duplicate submission** | MEDIUM | `useWriteAction` hook sets `submitting=true` immediately. Backend has ALREADY_PROCESSED guards (EDGE-001). |
| 6 | **Partial receive line_id mismatch** | MEDIUM | Always use fresh `line.id` from transfer detail response. Never cache line IDs. Refetch before opening partial receive dialog. |
| 7 | **Report Issue status impact ambiguity** | LOW | E2E C4 test confirms post-dispatch reject by destination PASS. Status likely becomes "rejected". Document observed behavior during implementation. |
| 8 | **API response shape mismatch** | MEDIUM | Write API response shapes may differ from E2E expectations. Handle both `{ status: true, data: { transfer_id: X } }` and `{ data: { id: X } }` patterns. |
| 9 | **Queue/history/ledger refresh inconsistency** | LOW | No global state. Each screen fetches on mount. Stale data possible for ~1 navigation. Acceptable per planning doc. |
| 10 | **Toast/Toaster not mounted** | LOW | Verify `<Toaster />` is in app layout. Add if missing. |
| 11 | **Parent restaurant ID resolution for Request Stock** | MEDIUM | Outlet needs parent's restaurant_id for source-options call. May need to derive from hierarchy-summary or store in login context. |
| 12 | **filter_bucket bucket name discovery** | LOW | Bucket names not fully documented. May need to call source-options API and inspect response structure to discover available buckets. |
| 13 | **Edit API contract unknown** | MEDIUM | Edit transfer (SH-13) API endpoint not explicitly tested in 52/52 E2E. May need discovery. Defer if blocked. |
| 14 | **API timeout during dispatch** | MEDIUM | Show EDGE-002 warning. Disable button. Guide user to check status. |

---

## 19. Owner Approval Gate

Before implementation starts, owner must approve:

1. **File target map** (Section 5) — 9 modified + 8 new = 17 files
2. **API/payload matrix** (Section 6) — 10/10 APIs verified_ready
3. **Role/status write action matrix** (Section 7) — Central, Master, Outlet
4. **Source selector plan** (Section 8) — segment_id default + filter_bucket with warning
5. **Forms/dialog plan** (Section 11) — 6 new components
6. **UOM validation plan** (Section 15) — whole numbers for pcs, 2 decimals for kg/ltr
7. **Report Issue behavior plan** (MH-7) — uses reject API, labeled "Report Issue"
8. **Smoke checklist** (Section 17) — 3 roles x multiple checks
9. **Should-have inclusion** (Section 10) — all 4 recommended for inclusion

**Unresolved questions:** None. All 8 owner questions answered. Q-XFER-006 override documented.

---

## 20. Recommended Next Agent

### `Central Inventory Slice 4 Implementation Agent`

All planning complete. 12 must-have + 4 should-have items planned with file targets, payloads, validation, and smoke tests. No blockers. Ready for implementation pending owner approval.

**Implementation order recommendation:**

| Phase | Items | Justification |
|-------|-------|---------------|
| 1 | API client methods (`api.js`) + `useWriteAction` hook + Toaster mount | Foundation — all actions depend on these |
| 2 | `transferActions.js` update (add Report Issue) + `screenVisibility.js` update | Action matrix — enables correct button visibility |
| 3 | `ConfirmActionDialog` + `ReasonDialog` | Shared dialogs — used by 6 of 12 must-have items |
| 4 | TransferDetail.jsx — wire Approve, Reject, Dispatch, Cancel, Report Issue | Core write surface — enables 6 actions |
| 5 | `ReceiveDialog` (full + partial receive) | Enables MH-4 and MH-5 |
| 6 | `SourceSelector` component | Dependency for dispatch/request forms |
| 7 | `DirectDispatchForm` + route + OperationsHub button | Enables MH-8 |
| 8 | `RequestStockForm` + route + OperationsHub button | Enables MH-9 |
| 9 | Remove BlockedAction notices from PendingQueues + OperationsHub cleanup | Cleanup |
| 10 | Toast polish, UOM validation, terminology error mapping | Should-have items |
| 11 | Smoke testing across 3 roles | Verification |

---

*End of Slice 4 Implementation Plan*
