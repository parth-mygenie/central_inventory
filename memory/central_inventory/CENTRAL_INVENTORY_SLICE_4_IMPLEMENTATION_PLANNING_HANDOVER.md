# Central Inventory Slice 4 — Implementation Planning Handover

> **Date:** 23 May 2026
> **From:** Senior Central Inventory Slice 4 Implementation Planning Agent
> **To:** Central Inventory Slice 4 Implementation Agent

---

## 1. Planning Document

**Path:** `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_4_IMPLEMENTATION_PLAN.md`

**Status:** `implementation_plan_ready_owner_approval_required`

---

## 2. Approved Scope

| Category | Count |
|----------|-------|
| Must-have items | 12 |
| Should-have items | 4 |
| Total file targets | 17 (9 modified + 8 new) |
| APIs verified_ready | 10/10 |
| Backend blockers | 0 |
| Open questions | 0 |

---

## 3. File Targets Summary

### Modified Files (9)

| # | File | Change Summary |
|---|------|----------------|
| 1 | `src/services/api.js` | Add 8 write methods |
| 2 | `src/lib/transferActions.js` | Add "Report Issue" action |
| 3 | `src/lib/terminology.js` | Add `mapApiErrorMessage()` |
| 4 | `src/lib/formatters.js` | Add `validateQuantityForUnit()` |
| 5 | `src/lib/screenVisibility.js` | Add "report-issue" permission |
| 6 | `src/components/central-inventory/TransferDetail.jsx` | Wire action buttons to real APIs |
| 7 | `src/components/central-inventory/OperationsHub.jsx` | Replace disabled buttons with navigation |
| 8 | `src/components/central-inventory/PendingQueues.jsx` | Remove BlockedAction notice |
| 9 | `src/App.js` | Add `/dispatch/new` and `/request/new` routes |

### New Files (8)

| # | File | Purpose |
|---|------|---------|
| 1 | `src/components/central-inventory/ConfirmActionDialog.jsx` | Approve/Dispatch confirmation |
| 2 | `src/components/central-inventory/ReasonDialog.jsx` | Reject/Cancel/Report Issue with reason |
| 3 | `src/components/central-inventory/ReceiveDialog.jsx` | Full + partial receive |
| 4 | `src/components/central-inventory/DirectDispatchForm.jsx` | Create direct dispatch transfer |
| 5 | `src/components/central-inventory/RequestStockForm.jsx` | Request stock from parent |
| 6 | `src/components/central-inventory/SourceSelector.jsx` | Configurable segment_id + filter_bucket |
| 7 | `src/hooks/useWriteAction.js` | Shared write action state management |
| 8 | `src/components/layout/AppLayout.jsx` (or App.js) | Mount `<Toaster />` |

---

## 4. API Readiness Summary

| # | Workflow | Endpoint | Payload Type | Readiness |
|---|----------|----------|-------------|-----------|
| 1 | Direct Dispatch | `POST initiate` | Items array + source_selector | verified_ready |
| 2 | Request Stock | `POST request` | Items array + source_selector | verified_ready |
| 3 | Approve | `POST approve/{id}` | Empty `{}` | verified_ready |
| 4 | Reject | `POST reject/{id}` | resolution_type + reason | verified_ready |
| 5 | Dispatch | `POST dispatch/{id}` | Empty `{}` | verified_ready |
| 6 | Receive (full) | `POST receive/{id}` | Empty `{}` | verified_ready |
| 7 | Receive (partial) | `POST receive/{id}` | received_lines[] | verified_ready |
| 8 | Cancel | `POST cancel/{id}` | resolution_type + reason | verified_ready |
| 9 | Source Options | `POST source-options` | restaurant_id + item_id | verified_ready |
| 10 | Inventory Master | `GET get-inventory-master` | N/A | verified_ready |

**Important:** Backend `server.py` has a generic proxy at line 238 that forwards ALL V2 requests. No backend code changes needed.

---

## 5. Role/Status Matrix Summary

| Action | Central | Master | Outlet |
|--------|---------|--------|--------|
| Direct Dispatch | YES | YES (own children only) | NO |
| Request Stock | NO | YES (from parent) | YES (from parent) |
| Approve | YES (as source) | YES (as source/parent) | NO |
| Reject | YES (as source) | YES (as source/parent) | NO |
| Dispatch | YES (as source) | YES (as source) | NO |
| Receive | YES (as destination) | YES (as destination) | YES (as destination) |
| Partial Receive | YES (as destination) | YES (as destination) | YES (as destination) |
| Cancel | YES (as source) | YES (as source) | NO |
| Report Issue | YES (as destination, dispatched) | YES (as destination, dispatched) | YES (as destination, dispatched) |
| Edit | NO | YES (own request, requested status) | YES (own request, requested status) |

---

## 6. Source Selector Plan

- **Default mode:** `segment_id` (100% pass rate in E2E)
- **Alternate mode:** `filter_bucket` (available but with warning — fails with batched stock)
- **Data source:** `source-options` API with `from_restaurant_id` + `source_inventory_master_id`
- **Component:** `SourceSelector.jsx` — reused in both DirectDispatchForm and RequestStockForm

---

## 7. Key Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Role permission leakage | HIGH | Reuse `transferActions.js` matrix. Backend validates server-side. |
| 2 | Source/destination mapping confusion | MEDIUM | Never show backend types. Use hierarchy-summary names. |
| 3 | Partial receive line_id mismatch | MEDIUM | Always use fresh `line.id` from detail response. |
| 4 | filter_bucket mode failure | MEDIUM | Default to segment_id. Warning on bucket mode. |
| 5 | Parent restaurant ID for Request Stock | MEDIUM | Derive from hierarchy or login context. |

---

## 8. Owner Approval Required

Owner must approve the implementation plan before implementation begins:

- [ ] File target map (17 files)
- [ ] API/payload matrix (10/10 verified_ready)
- [ ] Role/status write action matrix
- [ ] Source selector plan (segment_id default + filter_bucket)
- [ ] Forms/dialog plan (6 new components)
- [ ] Report Issue behavior (uses reject API, labeled "Report Issue")
- [ ] Smoke checklist (3 roles)

---

## 9. Recommended Next Agent

### `Central Inventory Slice 4 Implementation Agent`

**Implementation order (11 phases):**

1. API client methods + useWriteAction hook + Toaster mount
2. transferActions.js + screenVisibility.js updates
3. ConfirmActionDialog + ReasonDialog
4. TransferDetail.jsx — wire 6 action buttons
5. ReceiveDialog (full + partial)
6. SourceSelector component
7. DirectDispatchForm + route
8. RequestStockForm + route
9. PendingQueues + OperationsHub cleanup
10. Toast polish, UOM validation, terminology mapping
11. Smoke testing across 3 roles

**Credentials for testing:**
- Central Store: `abhishek@kalabahia.com` / `Qplazm@10`
- Master Store: `owner@democentral1.com` / `Qplazm@10`
- Outlet: `owner@demofranchise1.com` / `Qplazm@10`

---

*End of Implementation Planning Handover*
