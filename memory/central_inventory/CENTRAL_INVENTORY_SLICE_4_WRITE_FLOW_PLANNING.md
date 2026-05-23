# Central Inventory Slice 4 Write Flow Planning

> **Date:** 22 May 2026
> **Agent:** Senior Central Inventory Slice 4 Write Flow Planning Agent
> **Status:** Code and document review only — no modifications made

---

## 1. Planning Status

### `slice_4_ready_for_implementation_planning_owner_approval_required`

All 8 owner questions answered. 12 must-have items confirmed (partial receive promoted + Report Issue added). 4 should-have items. All core transfer write APIs verified ready (52/52 E2E PASS). Real preprod API confirmed for write operations. No backend blockers.

### Owner Answers Recorded (22 May 2026)

| Question | Answer | Decision |
|----------|--------|----------|
| Q-S4-001 | **A** | Real preprod API for all write operations |
| Q-S4-002 | **B** | Both modes — user can choose `segment_id` or `filter_bucket` (configurable picker) |
| Q-S4-003 | **A** | Central → Outlet direct dispatch included |
| Q-S4-004 | **A** | Outlet can create stock requests from parent |
| Q-S4-005 | **A** | Parent can direct-dispatch without prior request |
| Q-S4-006 | **C** | Include post-dispatch destination action as "Report Issue" — **BUSINESS RULE UPDATE REQUIRED: Q-XFER-006 must be updated to allow this** |
| Q-S4-007 | **A** | Partial receive promoted to must-have |
| Q-S4-008 | **A** | Adjustment/wastage excluded — Slice 4 = transfer writes only |

**CRITICAL NOTE (Q-S4-006):** Owner chose to include post-dispatch "Report Issue" by destination despite existing business rule Q-XFER-006 stating "Destination CANNOT reject post-dispatch." The business rules document (`OWNER_ANSWERS_COMPLETE.md`) needs to be updated to reflect this override. The action will be labeled "Report Issue" (not "Reject") on the UI.

---

## 2. Inputs Reviewed

| # | Input | Path | Reviewed |
|---|-------|------|----------|
| 1 | CR Requirement Planning | `/app/memory/central_inventory/CENTRAL_INVENTORY_CR_REQUIREMENT_PLANNING.md` | YES |
| 2 | Enterprise Review Round 2 | `/app/memory/central_inventory/CENTRAL_INVENTORY_ENTERPRISE_REQUIREMENT_REVIEW_ROUND_2.md` | YES |
| 3 | Blocker Reconciliation | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_1_TO_3_BLOCKER_RECONCILIATION_AND_REPLAN.md` | YES |
| 4 | Backend Blockers After Recheck | `/app/memory/central_inventory/CENTRAL_INVENTORY_BACKEND_BLOCKERS_AFTER_API_TOOL_RECHECK.md` | YES |
| 5 | Slice 2 Implementation Report | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_2_IMPLEMENTATION_REPORT.md` | YES |
| 6 | Slice 3 Implementation Report | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_3_IMPLEMENTATION_REPORT.md` | YES |
| 7 | Slice 3 QA Handover | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_3_QA_HANDOVER.md` | YES |
| 8 | Owner Answers Complete (96 decisions) | `/app/memory/central_inventory/OWNER_ANSWERS_COMPLETE.md` | YES |
| 9 | Business Rule & UX Field Freeze | `/app/memory/central_inventory/CENTRAL_INVENTORY_BUSINESS_RULE_AND_UX_FIELD_FREEZE.md` | YES |
| 10 | API Verification Comprehensive Final (52/52) | `/app/memory/central_inventory/api_evidence/API_VERIFICATION_COMPREHENSIVE_FINAL.md` | YES |
| 11 | E2E Final Test Script | `/app/memory/central_inventory/api_evidence/e2e_final_test.py` | YES (270 lines — payload shapes extracted) |
| 12 | Frontend: transferActions.js | `/app/frontend/src/lib/transferActions.js` | YES — action matrix already exists |
| 13 | Frontend: TransferDetail.jsx | `/app/frontend/src/components/central-inventory/TransferDetail.jsx` | YES — disabled buttons already rendered |
| 14 | Frontend: api.js | `/app/frontend/src/services/api.js` | YES — write API functions not yet added |
| 15 | Frontend: PendingQueues.jsx | `/app/frontend/src/components/central-inventory/PendingQueues.jsx` | YES |

**Total: 15 inputs reviewed**

---

## 3. Current Project Status

| Slice | Status | QA |
|-------|--------|-----|
| Slice 1 | Complete | Operational |
| Slice 2 | Complete | 12/12 PASS (Backend 10/10, Frontend 12/12) |
| Slice 3 | Complete | 23/23 PASS (Must-have 10/10, Should-have 5/5, Cross-check 5/5, Regression 3/3) |

**Current state:** All screens are read-only. Transfer Detail shows contextual action buttons (Approve, Reject, Dispatch, Receive, Cancel, Edit) per role + status matrix — but all are **disabled** with "Write API blocked" labels. The `transferActions.js` module already computes correct visibility. Slice 4 needs to **enable** these buttons and wire them to real API calls.

---

## 4. API Readiness Summary

### Write API Readiness Matrix

| # | Workflow | Endpoint | Method | Request Sample | Response Sample | Tool-Tested | UNIT_CONVERSION Resolved | Terminology Clear | Error Responses Known | Final Status |
|---|----------|----------|--------|---------------|----------------|------------|------------------------|-------------------|---------------------|-------------|
| 1 | Direct Dispatch | `/inventory-transfer/initiate` | POST | YES (e2e_final_test.py lines 71-92) | YES — returns `transfer_id` | YES (A1-A6: 12/12) | YES | YES | YES (422 validation) | **verified_ready** |
| 2 | Request Stock | `/inventory-transfer/request` | POST | YES (e2e lines 122-132) | YES — returns `transfer_id` | YES (B1-B2: 4/4) | YES | YES | YES (403 role restriction) | **verified_ready** |
| 3 | Approve Transfer | `/inventory-transfer/approve/{id}` | POST | YES (e2e lines 125, 134) | YES | YES (B1-B2: 2/2) | N/A | YES | YES (404 not found) | **verified_ready** |
| 4 | Reject Transfer | `/inventory-transfer/reject/{id}` | POST | YES (e2e lines 144-145) | YES | YES (C1: 1/1, C4: 1/1) | N/A | YES | YES | **verified_ready** |
| 5 | Dispatch Approved | `/inventory-transfer/dispatch/{id}` | POST | YES (e2e lines 126, 135) | YES | YES (B1-B2: 2/2) | YES | YES | YES | **verified_ready** |
| 6 | Receive Transfer | `/inventory-transfer/receive/{id}` | POST | YES (e2e lines 74, 80, 103, 127) | YES | YES (A1-A6 + B1-B2: 8/8) | N/A | YES | YES | **verified_ready** |
| 7 | Partial Receive | `/inventory-transfer/receive/{id}` | POST | YES (e2e lines 167-169) | YES | YES (C3: 1/1) | N/A | YES | YES | **verified_ready** |
| 8 | Cancel Transfer | `/inventory-transfer/cancel/{id}` | POST | YES (e2e lines 153-154) | YES — stock restored | YES (C2: 1/1) | N/A | YES | YES | **verified_ready** |
| 9 | Source Options | `/inventory-transfer/source-options` | POST | YES (e2e lines 27-31) | YES — returns `segments[]` | YES | N/A | N/A | YES | **verified_ready** |
| 10 | Get Inventory Master | `/inventory/get-inventory-master` | GET | N/A | YES — returns items list | YES | N/A | N/A | YES | **verified_ready** |

**Summary: 10/10 write APIs verified_ready. Zero backend blockers for Slice 4 transfer write flows.**

### Key Payload Shapes (from E2E test script)

**Direct Dispatch (initiate):**
```json
{
  "from_restaurant_id": 1,
  "to_restaurant_id": 781,
  "items": [{
    "source_inventory_master_id": 16980,
    "quantity": 2,
    "unit": "ltr",
    "source_selector": {"mode": "segment_id", "segment_id": 12345}
  }]
}
```

**Request Stock:**
```json
{
  "items": [{
    "stock_title": "Cooking Oil",
    "unit_id": 3,
    "quantity": 0.3,
    "unit": "ltr",
    "source_selector": {"mode": "segment_id", "segment_id": 12345}
  }]
}
```

**Approve/Dispatch:** `POST /approve/{id}` or `/dispatch/{id}` with empty JSON body `{}`

**Reject/Cancel:**
```json
{
  "resolution_type": "return_to_source",
  "resolution_meta": {"reason": "Out of stock"}
}
```

**Partial Receive:**
```json
{
  "resolution_type": "damaged",
  "resolution_meta": {"reason": "Transit damage"},
  "received_lines": [{
    "line_id": 123,
    "accepted_qty": 1.4,
    "rejected_qty": 0.6
  }]
}
```

**Full Receive:** `POST /receive/{id}` with empty JSON body `{}`

---

## 5. Write Workflow Candidate Review

| # | Workflow | API Readiness | Business Readiness | Recommendation |
|---|----------|--------------|-------------------|---------------|
| 1 | Direct Dispatch (Central/Master → child) | verified_ready | Owner-confirmed (Conflict-001: parent direct dispatch allowed) | **recommended_slice_4_must_have** |
| 2 | Request Stock (child → parent) | verified_ready | Owner-confirmed (Outlet→Master, Master→Central) | **recommended_slice_4_must_have** |
| 3 | Approve Transfer | verified_ready | Owner-confirmed (Q-XFER-002 clarified) | **recommended_slice_4_must_have** |
| 4 | Reject Transfer (pre-dispatch) | verified_ready | Owner-confirmed (C1 test) | **recommended_slice_4_must_have** |
| 5 | Dispatch Approved Transfer | verified_ready | Owner-confirmed | **recommended_slice_4_must_have** |
| 6 | Receive Transfer (full) | verified_ready | Owner-confirmed | **recommended_slice_4_must_have** |
| 7 | Partial Receive with resolution | verified_ready | Owner-confirmed (Q-XFER-009) | **recommended_slice_4_should_have** |
| 8 | Cancel Transfer (post-dispatch) | verified_ready | Owner-confirmed (C2 test) | **recommended_slice_4_should_have** |
| 9 | Post-dispatch Reject by destination | verified_ready | E2E C4 PASS but owner says destination CANNOT reject post-dispatch (Q-XFER-006: C) | **owner_decision_required** |
| 10 | Edit Transfer (pre-dispatch) | Verified in initial report | Owner-confirmed (Q-XFER-003: resets to requested) | **recommended_slice_4_should_have** |
| 11 | Stock Adjustment (decrease) | verified_ready (Section E) | Owner-confirmed but Central-only (Q-ADJ-002) | **future_slice** |
| 12 | Wastage Entry | verified_ready (Section E) | Owner-confirmed store-level (SKIP-007) | **future_slice** |
| 13 | Stock Return | verified_ready (Section E) | Complex flow (Conflict-002 resolution) | **future_slice** |
| 14 | Lateral Transfer (Master↔Master) | verified_ready (Section E) | Needs Central approval + operational setting | **future_slice** |
| 15 | Partial Dispatch | Owner wants it (SKIP-001: B) | Backend needs work (dispatches all lines at once) | **blocked_backend** |

---

## 6. Recommended Slice 4 Scope

### Must Have (12 items — updated after owner answers)

| # | Item | Justification |
|---|------|---------------|
| 1 | **Approve transfer action** on Transfer Detail | Simplest write — empty payload POST. Enables request→approve lifecycle. |
| 2 | **Reject transfer action** with reason dialog | Pre-dispatch reject with `resolution_type` + reason. Enables request rejection. |
| 3 | **Dispatch approved transfer** on Transfer Detail | POST to dispatch/{id}. Enables request→approve→dispatch lifecycle. |
| 4 | **Receive transfer (full)** on Transfer Detail | POST to receive/{id} with empty body. Completes the lifecycle. |
| 5 | **Partial receive** with line-level resolution | Per-line accepted/rejected/damaged quantities. `received_lines[]` payload. Promoted from should-have per owner Q-S4-007: A. |
| 6 | **Cancel transfer** with reason dialog | Post-dispatch/post-approve cancel with `resolution_type` + reason. |
| 7 | **"Report Issue" action** for destination on dispatched transfers | Post-dispatch destination reject labeled as "Report Issue". Owner override of Q-XFER-006 — business rules to be updated. Uses `reject/{id}` API. |
| 8 | **Direct Dispatch form** (new screen/modal) | Create transfer via `initiate` endpoint. Central/Master can push stock to children. Includes Central→Outlet direct (Q-S4-003: A). |
| 9 | **Request Stock form** (child → parent) | Outlet/Master requests stock. Uses `request` endpoint. Promoted from should-have per owner Q-S4-004: A. |
| 10 | **Source selector** (configurable: `segment_id` + `filter_bucket` modes) | User can choose mode (Q-S4-002: B). Both modes available. Call source-options API. |
| 11 | **Confirmation dialogs** for all destructive actions | Owner mandate (SEC-002: A — confirmation for ALL destructive actions). |
| 12 | **Duplicate submission prevention + post-action data refresh** | Button disable during API call (UX-002: A). Refresh detail/queues/history after success. |

### Should Have (4 items — updated)

| # | Item | Justification |
|---|------|---------------|
| 13 | **Edit transfer** (pre-dispatch, resets to requested) | Already in action matrix. Needs edit form. |
| 14 | **Success/error toast notifications** | Clear feedback after every write action. |
| 15 | **Quantity validation with UOM awareness** | Whole numbers for pcs, 2 decimals for kg/ltr (ITM-002: C). |
| 16 | **API error message terminology mapping** | Backend may return "franchise" in errors — map through terminology adapter before display. |

### Future / Not Slice 4

| # | Item | Reason |
|---|------|--------|
| 16 | Stock adjustment | Separate permission model (Central-only). Different UX. |
| 17 | Wastage entry | Store-level operation. Different UX. |
| 18 | Stock return | Complex flow (return to original sender only). |
| 19 | Lateral transfer (Master↔Master) | Needs Central approval + operational settings toggle. |
| 20 | Partial dispatch | Backend doesn't support it yet (SKIP-001: B needs backend work). |
| 21 | Inward audit | Destination-only flow. Phase 2 Ops. |
| 22 | Reconciliation request | New workflow not yet designed for UI. |

### Blocked

| # | Item | Blocker |
|---|------|---------|
| 23 | Partial dispatch | Backend dispatches all lines at once (SKIP-001: B needs backend change) |
| 24 | Soft stock reservation on approval | Backend has no reservation mechanism (STK-002: A needs backend) |
| 25 | Over-receive | Backend enforces strict equality (STK-003: B needs backend) |

---

## 7. Source / Destination Selector UX Plan

### Source Selector (for Dispatch)

**Owner decided (Q-S4-002: B): Both modes — user can choose.** The source selector should offer both `segment_id` and `filter_bucket` modes as a configurable picker.

**Important note from E2E testing:** `filter_bucket` mode failed in all tests where stock had batch/expiry data. `segment_id` mode passed 100%. The UI should default to `segment_id` and warn users that `filter_bucket` may not work with batched stock.

**Recommended UX flow:**
1. User selects item from inventory master list
2. Frontend calls `source-options` API with `from_restaurant_id` + `source_inventory_master_id`
3. API returns `segments[]` array with: `segment_id`, `cal_quantity`, `batch`, `expiry_date`
4. User sees a selector with two modes:
   - **Segment mode** (default): Pick specific segment from list
   - **Bucket mode**: Select filter bucket (`without_batch_and_expiry` etc.)
5. Selected `source_selector` object is included in dispatch payload

### Destination Selector (for Dispatch/Request)

| User Role | Can Send To | Can Request From |
|-----------|------------|-----------------|
| Central (master) | Own children: Master Stores, Outlets (direct) | Cannot request (is top) |
| Master (central) | Own children: Outlets | Parent: Central |
| Outlet (franchise) | Cannot dispatch | Parent: Master (or Central if Central dispatched directly) |

**Recommended UX:**
- Central: dropdown populated from `hierarchy-summary` (Master Stores + Outlets)
- Master: dropdown populated from own children (Outlets only)
- Outlet: auto-derived (parent store) — no picker needed for request

---

## 8. Role / Status Write Action Matrix

### Actions Enabled in Slice 4

Legend: **E** = Enabled, **H** = Hidden, **—** = Not applicable

#### Central Store (backend `master`)

| Status | Approve | Reject | Dispatch | Receive | Cancel | Report Issue | Edit |
|--------|---------|--------|----------|---------|--------|-------------|------|
| requested (as source) | **E** | **E** | H | H | H | H | H |
| approved (as source) | H | H | **E** | H | **E** | H | H |
| dispatched (as source) | H | H | H | H | **E** | H | H |
| dispatched (as destination) | H | H | H | **E** | H | **E** | H |
| received | H | H | H | H | H | H | H |
| partially_received | H | H | H | H | H | H | H |
| cancelled | H | H | H | H | H | H | H |
| rejected | H | H | H | H | H | H | H |

#### Master Store (backend `central`)

| Status | Approve | Reject | Dispatch | Receive | Cancel | Report Issue | Edit |
|--------|---------|--------|----------|---------|--------|-------------|------|
| requested (as source/parent) | **E** | **E** | H | H | H | H | H |
| requested (as requester) | H | H | H | H | H | H | **E** |
| approved (as source) | H | H | **E** | H | **E** | H | H |
| dispatched (as source) | H | H | H | H | **E** | H | H |
| dispatched (as destination) | H | H | H | **E** | H | **E** | H |
| Terminal statuses | H | H | H | H | H | H | H |

#### Outlet (backend `franchise`)

| Status | Approve | Reject | Dispatch | Receive | Cancel | Report Issue | Edit |
|--------|---------|--------|----------|---------|--------|-------------|------|
| requested (as requester) | H | H | H | H | H | H | **E** |
| dispatched (as destination) | H | H | H | **E** | H | **E** | H |
| All other | H | H | H | H | H | H | H |

**Note on "Report Issue":** This is a post-dispatch action by the destination store. It uses the `reject/{id}` API endpoint. It is labeled "Report Issue" (not "Reject") per owner decision Q-S4-006: C. **Business rule Q-XFER-006 needs to be updated** to reflect this override.

---

## 9. Form and Validation Plan

### 9.1 Direct Dispatch Form (SCR-07)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Destination store | Dropdown (hierarchy-filtered) | YES | Must be a valid child store |
| Items | Repeatable row group | YES (at least 1) | — |
| → Item | Dropdown (inventory master) | YES | Must exist in source store |
| → Quantity | Number input | YES | > 0, decimals per UOM (ITM-002) |
| → Unit | Auto-derived from item | YES | Read-only, from item data |
| → Source segment | Segment picker (source-options API) | YES | Must have sufficient qty |
| Notes | Textarea | NO | Max 500 chars |

### 9.2 Request Stock Form (SCR-04)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Source (auto) | Display-only (parent store) | N/A | Auto-derived from user role |
| Items | Repeatable row group | YES (at least 1) | — |
| → Item | Dropdown/search (stock_title) | YES | Text match |
| → Quantity | Number input | YES | > 0 |
| → Unit | Dropdown (unit_id) | YES | Must match item |
| → Source selector | Segment picker from parent's stock | YES | segment_id mode |
| Notes | Textarea | NO | Max 500 chars |

### 9.3 Approve/Dispatch Dialogs

| Element | Content |
|---------|---------|
| Title | "Approve Transfer #123?" / "Dispatch Transfer #123?" |
| Body | Summary: from → to, items count, total qty |
| Confirm button | "Approve" / "Dispatch" (primary) |
| Cancel button | "Cancel" (ghost) |
| Loading state | Button shows spinner, all buttons disabled |

### 9.4 Reject/Cancel Dialog

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Resolution type | Dropdown: return_to_source, damaged, other | YES | Must select |
| Reason | Textarea | YES | Min 10 chars, max 500 chars |
| Confirm button | "Reject Transfer" / "Cancel Transfer" (destructive) |

### 9.5 Receive Dialog

| Element | Content |
|---------|---------|
| Title | "Receive Transfer #123?" |
| Body | Line items summary with dispatched quantities |
| Full Receive | "Receive All" button — empty body POST |
| Partial Receive | Toggle to line-level form (must-have per Q-S4-007: A) |

### 9.6 Partial Receive Form (must-have per Q-S4-007: A)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Per line: Accepted qty | Number input | YES | 0 ≤ accepted ≤ dispatched |
| Per line: Rejected qty | Number input | YES | accepted + rejected = dispatched |
| Resolution type | Dropdown per line | YES if rejected > 0 | damaged, return_to_source |
| Reason | Textarea | YES if rejected > 0 | Min 10 chars |

---

## 10. API / Payload Matrix

| # | Workflow | Endpoint | Method | Payload Fields | Response Fields | Validation Notes | Readiness | Blocker |
|---|----------|----------|--------|---------------|----------------|-----------------|-----------|---------|
| 1 | Direct Dispatch | `initiate` | POST | `from_restaurant_id`, `to_restaurant_id`, `items[]` (each: `source_inventory_master_id`, `quantity`, `unit`, `source_selector`) | `transfer_id` or `id` | `source_selector` MUST use segment_id mode | verified_ready | None |
| 2 | Request Stock | `request` | POST | `items[]` (each: `stock_title`, `unit_id`, `quantity`, `unit`, `source_selector`) | `transfer_id` or `id` | Parent auto-derived by backend | verified_ready | None |
| 3 | Approve | `approve/{id}` | POST | `{}` (empty) | Status update | Only source/parent can approve | verified_ready | None |
| 4 | Reject | `reject/{id}` | POST | `resolution_type`, `resolution_meta.reason` | Status update | Reason required | verified_ready | None |
| 5 | Dispatch | `dispatch/{id}` | POST | `{}` (empty) | Status update | Only source can dispatch approved transfer | verified_ready | None |
| 6 | Full Receive | `receive/{id}` | POST | `{}` (empty) | Status update | Only destination can receive | verified_ready | None |
| 7 | Partial Receive | `receive/{id}` | POST | `resolution_type`, `resolution_meta`, `received_lines[]` (each: `line_id`, `accepted_qty`, `rejected_qty`) | Status update | `line_id` from transfer details | verified_ready | None |
| 8 | Cancel | `cancel/{id}` | POST | `resolution_type`, `resolution_meta.reason` | Status update + stock restore | Source can cancel dispatched/approved | verified_ready | None |
| 9 | Source Options | `source-options` | POST | `from_restaurant_id`, `source_inventory_master_id` | `segments[]` with `segment_id`, `cal_quantity`, `batch`, `expiry_date` | Returns available segments | verified_ready | None |
| 10 | Inventory Master | `get-inventory-master` | GET | N/A | `data[]` with `id`, `stock_title`, `unit`, `unit_id` | Item list for dispatch/request forms | verified_ready | None |

---

## 11. UI State Plan

| Action | Default | Submitting | Success | API Error | Network Error | Permission Denied |
|--------|---------|------------|---------|-----------|--------------|------------------|
| Approve | Button enabled | Spinner + disabled | Toast "Transfer approved" → refresh detail | Toast with API error message | Toast "Network error — check transfer status before retrying" (EDGE-002) | Toast "Permission denied" |
| Reject | Button enabled | Spinner + disabled | Toast "Transfer rejected" → refresh | Toast with error | Network warning | Permission toast |
| Dispatch | Button enabled | Spinner + disabled | Toast "Transfer dispatched" → refresh | Toast with error (may include INSUFFICIENT_STOCK) | Network warning | Permission toast |
| Receive | Button enabled | Spinner + disabled | Toast "Transfer received" → refresh | Toast with error | Network warning | Permission toast |
| Cancel | Button enabled | Spinner + disabled | Toast "Transfer cancelled — stock restored" → refresh | Toast with error | Network warning | Permission toast |
| Direct Dispatch form | Submit enabled | Spinner + all fields disabled | Toast "Dispatch created" → navigate to detail | Inline field errors + toast | Network warning | Permission toast |
| Request Stock form | Submit enabled | Spinner + all fields disabled | Toast "Request submitted" → navigate to detail | Inline field errors + toast | Network warning | Permission toast |

**Duplicate prevention:** Button click immediately sets `submitting=true`. All action buttons disabled while `submitting=true`. Re-enabled only on response or timeout.

---

## 12. Data Refresh Plan

| After Action | Refresh Strategy |
|-------------|-----------------|
| Approve/Reject/Dispatch/Receive/Cancel on Transfer Detail | Refetch transfer detail (`getTransferDetails(id)`) |
| Approve/Reject | Also invalidate Pending Queues (approval count changes) |
| Dispatch | Also invalidate Ready to Dispatch tab |
| Receive | Also invalidate Pending Queues (receive count changes) |
| Cancel | Also invalidate Pending Queues + Ready to Dispatch |
| Direct Dispatch form submit | Navigate to new transfer's detail page |
| Request Stock form submit | Navigate to new transfer's detail page |
| Any write on History & Ledger | Show "Data may be outdated — refresh to see latest" note |

**Implementation:** Use callback pattern — after successful API call, call `fetchDetail()` to refetch. For list screens, use React state invalidation on next mount.

---

## 13. Backend Blockers

### No backend blockers for Slice 4 transfer write flows.

All 10 APIs needed for Slice 4 are verified_ready per the 52/52 E2E report. UNIT_CONVERSION is resolved. Source-options returns segment data. All lifecycle states tested.

**Items that need backend work but are NOT in Slice 4:**
- Partial dispatch (SKIP-001: B) — backend dispatches all lines at once
- Soft stock reservation on approval (STK-002: A) — no reservation mechanism
- Over-receive (STK-003: B) — backend enforces strict equality

Backend handoff document NOT created (no blockers for Slice 4 scope).

---

## 14. Owner Questions — ALL ANSWERED

All 8 questions answered on 22 May 2026.

| # | Question | Answer | Decision |
|---|----------|--------|----------|
| Q-S4-001 | Real preprod API or seed proxy? | **A** | Real preprod API for all writes — 52/52 E2E PASS proves stability |
| Q-S4-002 | Source selector mode? | **B** | Both modes configurable — user can choose segment_id or filter_bucket |
| Q-S4-003 | Central → Outlet direct dispatch? | **A** | Included — Central can dispatch to any Outlet |
| Q-S4-004 | Outlet can create stock requests? | **A** | Included — Outlet requests from parent |
| Q-S4-005 | Direct dispatch without request? | **A** | Included — parent can push without prior request |
| Q-S4-006 | Post-dispatch reject by destination? | **C** | Include as "Report Issue" — **business rule Q-XFER-006 needs update** |
| Q-S4-007 | Partial receive scope? | **A** | Promoted to must-have |
| Q-S4-008 | Adjustment/wastage excluded? | **A** | Excluded — Slice 4 = transfer writes only |

**No pending owner questions. Ready for implementation planning.**

---

## 15. Acceptance Criteria

1. Central user can approve a requested transfer from Transfer Detail — status changes to "approved".
2. Central user can reject a requested transfer with reason — status changes to "rejected".
3. Central user can dispatch an approved transfer — status changes to "dispatched".
4. Destination user can receive a dispatched transfer — status changes to "received".
5. Source user can cancel a dispatched or approved transfer with reason — status changes to "cancelled", stock restored.
6. Central/Master user can create a direct dispatch via form — transfer created and navigated to detail.
7. Source selector shows available segments from source-options API for dispatch items.
8. All destructive actions (reject, cancel) show confirmation dialog with action summary.
9. All action buttons are disabled during API call — no duplicate submissions.
10. After successful write, Transfer Detail refreshes to show updated status/timeline.
11. After successful write, Pending Queues/Ready to Dispatch counts are invalidated.
12. API errors show clear error toast with message.
13. Network errors show "check transfer status before retrying" warning.
14. No backend terms (master/central/franchise) appear in any form labels or error messages.
15. Actions are only visible per the role/status matrix (no action leakage).

---

## 16. Smoke Checklist Draft

### Central Store (`abhishek@kalabahia.com` / `Qplazm@10`)

- [ ] Navigate to Transfer Detail of a "requested" transfer
- [ ] Click "Approve" → confirmation dialog → confirm → status changes to "approved"
- [ ] Navigate to a "requested" transfer → "Reject" → reason dialog → submit → status "rejected"
- [ ] Navigate to an "approved" transfer → "Dispatch" → confirmation → status "dispatched"
- [ ] Navigate to a "dispatched" transfer (as destination) → "Receive" → status "received"
- [ ] Navigate to a "dispatched" transfer (as source) → "Cancel" → reason dialog → status "cancelled"
- [ ] Open Direct Dispatch form → select destination → add item → select segment → submit → transfer created
- [ ] Verify no action buttons on terminal-status transfers (received, cancelled, rejected)
- [ ] Verify double-click prevention (button disabled during submit)

### Master Store (`owner@democentral1.com` / `Qplazm@10`)

- [ ] Approve a child outlet's request
- [ ] Dispatch an approved transfer to outlet
- [ ] Receive a transfer from Central
- [ ] Create direct dispatch to own outlet

### Outlet (`owner@demofranchise1.com` / `Qplazm@10`)

- [ ] Receive a dispatched transfer
- [ ] Create a stock request (if Q-S4-004 = A)
- [ ] Verify no approve/dispatch/cancel buttons visible
- [ ] Verify no Direct Dispatch form accessible

### Cross-Role Checks

- [ ] No raw backend terms in any form, dialog, toast, or error message
- [ ] All confirmation dialogs work for destructive actions
- [ ] History & Ledger reflects new transfers after creation
- [ ] Pending Queues counts update after approve/reject/receive/cancel

---

## 17. Risks / Ambiguities

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | **UNIT_CONVERSION regression** | LOW (resolved in E2E) | Monitor first write calls closely. If fails, check unit table seeding. |
| 2 | **Source selector segment availability** | MEDIUM | If source-options returns empty, show clear "No stock available" message. Prevent submission. |
| 3 | **Role permission leakage** | HIGH | Reuse existing `transferActions.js` matrix. Test all 3 roles. Backend also validates server-side. |
| 4 | **Duplicate submission** | MEDIUM | Disable button immediately on click. Backend has ALREADY_PROCESSED guards (per EDGE-001). |
| 5 | **Partial receive line_id mismatch** | MEDIUM | Always fetch fresh transfer details before building partial receive form. Use `line.id` from details response. |
| 6 | **Stock consistency after writes** | MEDIUM | Do not show calculated stock balances. Let backend be source of truth. Refetch hierarchy-detail for stock display. |
| 7 | **Terminology in error messages** | LOW | API may return "Only franchise or central can request". Map error messages through terminology adapter before displaying. |
| 8 | **API timeout during dispatch** | MEDIUM | Show EDGE-002 warning: "Action may have been processed — check transfer status before retrying." |
| 9 | **Real API vs seed proxy decision** | HIGH (blocks implementation) | Must be resolved before implementation (Q-S4-001). |
| 10 | **Post-dispatch reject confusion** | LOW | Owner says no (Q-XFER-006). API supports it. Must follow owner rule. Confirm via Q-S4-006. |

---

## 18. Owner Approval Gate

All 8 owner questions answered. Final approval needed on:

- [x] **API approach:** Real preprod API (Q-S4-001: A) ✓
- [x] **Source selector UX:** Both modes configurable (Q-S4-002: B) ✓
- [x] **Central → Outlet direct dispatch:** Included (Q-S4-003: A) ✓
- [x] **Outlet stock request:** Included (Q-S4-004: A) ✓
- [x] **Direct dispatch without request:** Included (Q-S4-005: A) ✓
- [x] **Post-dispatch "Report Issue":** Included, business rule update needed (Q-S4-006: C) ✓
- [x] **Partial receive:** Must-have (Q-S4-007: A) ✓
- [x] **Adjustment/wastage:** Excluded from Slice 4 (Q-S4-008: A) ✓

**Remaining for owner:** Approve final Slice 4 scope (12 must-have + 4 should-have) to trigger implementation planning.

**Action required:** Update business rule Q-XFER-006 in `OWNER_ANSWERS_COMPLETE.md` to reflect "Report Issue" override.

---

## 19. Recommended Next Agent

### `Central Inventory Slice 4 Implementation Planning Agent`

All questions answered. Ready for implementation planning.

Tasks:
1. Create file-level implementation plan (components to create/modify)
2. Add write API functions to `api.js`
3. Update `transferActions.js` to add "Report Issue" action for dispatched-as-destination
4. Create confirmation dialog component (reusable)
5. Create Direct Dispatch form component
6. Create Request Stock form component
7. Create source-selector component (configurable segment_id + filter_bucket)
8. Create partial receive form component
9. Wire all action buttons in TransferDetail.jsx to real API calls
10. Enable action buttons (remove disabled state)
11. Add post-action refresh logic
12. Add toast notifications
13. Define test plan
14. Produce implementation-ready handover

---

*End of Slice 4 Write Flow Planning*
