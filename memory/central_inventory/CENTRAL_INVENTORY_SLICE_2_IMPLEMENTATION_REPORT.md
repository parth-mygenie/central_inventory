# Central Inventory Slice 2 — Implementation Report

> **Date:** 19 May 2026
> **Status:** COMPLETE — 12/12 items implemented

---

## 1. Implementation Status

All 12 approved Slice 2 items have been implemented and tested.

---

## 2. Files Changed

### New Files Created (4)
| # | File | Purpose |
|---|------|---------|
| 1 | `src/lib/formatters.js` | Timestamp formatting utilities using date-fns |
| 2 | `src/lib/transferActions.js` | Role + status action matrix logic |
| 3 | `src/components/central-inventory/StatusTimeline.jsx` | Visual transfer lifecycle timeline |
| 4 | `src/components/common/DateRangePicker.jsx` | Date range picker with presets |

### Modified Files (7)
| # | File | Changes |
|---|------|---------|
| 1 | `PendingQueues.jsx` | Added Ready to Dispatch tab, items count column, formatted timestamps |
| 2 | `TransferDetail.jsx` | Added status timeline, line-level accept/reject, resolution display, contextual actions, formatted timestamps |
| 3 | `OperationsHub.jsx` | Removed KPI placeholder, added Ready to Dispatch count card, context selector in-place update |
| 4 | `ContextSelector.jsx` | Changed to in-place hub update with "Viewing as" indicator and Reset button |
| 5 | `HierarchySummary.jsx` | Added date range picker, enforced downward-only tab visibility |
| 6 | `StoreDetail.jsx` | Applied formatted timestamps to transactions table |
| 7 | `server.py` | Added `items_count` field to transfer history response (testing agent fix) |

**Total: 4 new + 7 modified = 11 files**

---

## 3. Scope Implemented — 12/12 Checklist

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Ready to Dispatch tab | DONE | 4th tab in Pending Queues. Uses transfer history filtered for `approved` status. Count badge shows. Only dispatch-capable roles see it. |
| 2 | Status timeline | DONE | Shows Requested → Approved → Dispatched → Received progression. Handles branch paths: Rejected, Cancelled, Partially Received. |
| 3 | Line-level accept/reject | DONE | Conditional columns (Accepted, Rejected, Resolution) appear when line-level data exists. Transfer #110 shows all fields. |
| 4 | Timestamp formatting | DONE | `formatTimestamp()` utility using date-fns. Applied to: PendingQueues, TransferDetail, StoreDetail, StatusTimeline. No raw ISO strings. |
| 5 | Resolution reason display | DONE | Resolution Details card with type, reason, and receive totals. Visible on Transfer #110 and #111. |
| 6 | Date range picker | DONE | DateRangePicker component on Hierarchy Summary. Presets: Today, Yesterday, This Week, This Month, Last 7/30 Days. Dates passed to API. |
| 7 | Contextual action buttons | DONE | `transferActions.js` matrix. Actions vary by role + status + source/destination position. Terminal statuses show no buttons. |
| 8 | Items count column | DONE | "Items" column in Pending Queues tables. Format: "3 items" / "1 item". Fallback: "—". |
| 9 | Store name fix | DONE | Validated: Central shows "My Genie", Master shows "DemoCentral1", Outlet shows "DemoFranchise1". |
| 10 | Downward-only hierarchy | DONE | Central: both tabs. Master: Outlets tab only (Master Stores hidden). Outlet: limited. Client-side enforcement. |
| 11 | Context selector in-place | DONE | "View as store" label. Clicking shows "Viewing as [name]" indicator. Reset button returns to own. Data filters client-side. |
| 12 | Remove KPI placeholder | DONE | Removed. No empty gap. Quick actions + pending cards fill space. |

---

## 4. Items Not Implemented

None. All 12 items implemented.

---

## 5. Role/Status Action Behavior Summary

### Central Store (backend `master`)
| Status | Actions Shown |
|--------|--------------|
| requested (as source) | Approve, Reject |
| approved (as source) | Dispatch, Cancel |
| dispatched (as source) | Cancel |
| dispatched (as destination) | Receive |
| received/partially_received/cancelled/rejected | None |

### Master Store (backend `central`)
| Status | Actions Shown |
|--------|--------------|
| requested (as source/parent) | Approve, Reject |
| requested (as requester) | Edit |
| approved (as source) | Dispatch, Cancel |
| dispatched (as source) | Cancel |
| dispatched (as destination) | Receive |
| received/partially_received/cancelled/rejected | None |

### Outlet (backend `franchise`)
| Status | Actions Shown |
|--------|--------------|
| requested (as requester) | Edit |
| dispatched (as destination) | Receive |
| All other statuses | None |

---

## 6. Hierarchy Visibility Behavior Summary

| Role | Tabs Visible | Stores Shown |
|------|-------------|-------------|
| Central | Master Stores + Outlets | All 2 Master Stores, all 4 Outlets |
| Master | Outlets only | Only own child Outlets (2) |
| Outlet | Outlets only | Self only (limited view) |

Enforced client-side via `isMiddleLevel` / `isTopLevel` checks in HierarchySummary.jsx.

---

## 7. Context Selector Behavior Summary

| Role | Behavior |
|------|----------|
| Central | "View as store" dropdown. Selecting shows "Viewing as [name]" + Reset. Hub data filters for selected store. |
| Master | Same as Central but limited to own child outlets |
| Outlet | "Context locked" — no switching |

Data filtering is client-side: pending queues filtered by selected store's restaurant ID.

---

## 8. KPI Placeholder Removal Confirmation

KPI placeholder (dashed card with AlertTriangle icon and "KPI pending backend/owner definition" text) has been completely removed from OperationsHub.jsx. No empty gap remains — the quick actions section fills the space naturally.

---

## 9. Build Result

```
webpack compiled successfully
```

No build errors. All files compile cleanly. Using Yarn (project's package manager).

---

## 10. Known Risks

| # | Risk | Severity | Notes |
|---|------|----------|-------|
| 1 | Ready to Dispatch uses transfer history endpoint | LOW | Fetches all history then filters for "approved" — acceptable for seed data volume. Real API may need dedicated endpoint. |
| 2 | Context switching is client-side filter only | MEDIUM | Backend always returns data for logged-in user's restaurant. Context "switching" filters existing data, not re-fetching scoped data. |
| 3 | Date range picker sends dates to API but seed data ignores them | LOW | Date parameters are passed correctly. Will work automatically when connected to real API. |
| 4 | Downward-only hierarchy is client-side filtered | LOW | Backend still returns full visibility per role. Frontend hides tabs/stores. Backend change would be ideal for true enforcement. |
| 5 | Seed data timestamps shift on server restart | LOW | `datetime.now()` recalculates on each restart. Dates in timeline may shift. |

---

## 11. Smoke Checklist

See: `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_2_QA_HANDOVER.md`

---

*End of Implementation Report*
