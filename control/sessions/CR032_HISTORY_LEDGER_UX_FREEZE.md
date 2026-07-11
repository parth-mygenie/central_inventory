# CR-032 — History & Ledger UX Freeze

> **Date:** 2026-06-13
> **Status:** FROZEN — Owner approved
> **Scope:** History & Ledger screen (`/history`)
> **Pattern:** Keep current layout — bug fix only

---

## Layout: Keep Current (2 Tabs — Transfer History + Stock Ledger)

The current design is feature-rich and works well. No pattern change needed.

```
┌──────────────────────────────────────────────────────────────────────┐
│ History & Ledger                                   [Export CSV] [🔄] │
│                                                                      │
│ [Transfer History 13] [Stock Ledger 14]                              │
│                                                                      │
│ [📅 Select dates] [🔍 Search ID or store] [All] [In] [Out]          │
│ Status: Requested Partially Approved Approved Dispatched Received... │
│                                                                      │
│ ┌── TRANSFER HISTORY TABLE ──────────────────────────────────────┐  │
│ │PO/Ref          │Date         │Source      │Dest      │Status   │  │
│ │TRF-806-2026-0016│13 Jun 6:04AM│german fluid│Cost Test │Received │  │
│ │                 │             │            │Outlet    │         │  │
│ │Type            │Items        │Direction   │Updated   │Action   │  │
│ │Direct Dispatch │3 items ← FIX│↗ Out       │6:04 AM   │👁 View  │  │
│ └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Bug Fix: "0 items" for All Transfers (O-15) — HIGH

### Current (wrong)
```
TRF-806-2026-0016  german fluid  Cost Test Outlet  Received  Direct Dispatch  0 items  ↗ Out
TRF-806-2026-0014  german fluid  CK Alpha          Received  Direct Dispatch  0 items  ↗ Out
TRF-806-2026-0012  german fluid  Outlet Direct One  Part Rcvd  Request        0 items  ↗ Out
```

### After fix
```
TRF-806-2026-0016  german fluid  Cost Test Outlet  Received  Direct Dispatch  3 items  ↗ Out
TRF-806-2026-0014  german fluid  CK Alpha          Received  Direct Dispatch  2 items  ↗ Out
TRF-806-2026-0012  german fluid  Outlet Direct One  Part Rcvd  Request        3 items  ↗ Out
```

### Root Cause Investigation

The `formatItemsCount()` in `lib/formatters.js` is called with the transfer object. The transfer history API (`POST /inventory-transfer/history`) likely returns transfer headers WITHOUT a `lines[]` array or `items_count` field.

**Check in this order:**
1. Does the history API response include `items_count` or `line_count`? → Use it
2. Does it include `lines[]` array? → Use `lines.length`
3. Neither? → The count must come from `getTransferDetails()` per transfer (N+1, but necessary)

**Likely fix:**
```javascript
// In HistoryLedger.jsx — when rendering Items column
const itemsCount = transfer.items_count
  || transfer.line_count
  || transfer.lines?.length
  || transfer.data?.lines?.length
  || 0;

// Display
formatItemsCount(itemsCount);  // "3 items" or "1 item"
```

**Same root cause as O-14** (Pending Queues "0 items"). Fix in `formatItemsCount` or in how the data is passed to it will fix both screens.

---

## Tab 1: Transfer History — Keep As-Is

### Table Columns (no changes)

| Column | Source | Display |
|--------|--------|---------|
| PO/Ref | `reference_code` | Monospace bold "TRF-806-2026-XXXX" |
| Date | `created_at` | "13 Jun 2026, 6:04 AM" |
| Source | `from_restaurant_name` | Name + type badge (Central Store / Master Store / Outlet) |
| Destination | `to_restaurant_name` | Name + type badge |
| Status | `status` | Color badge (Received, Approved, Rejected, Withdrawn, Partially Received, etc.) |
| Type | `type` | Badge (Direct Dispatch, Request, Modification) |
| Items | **FIX: correct count** | "3 items" (was "0 items") |
| Direction | Computed from actor perspective | "↗ Out" / "↙ In" |
| Updated | `updated_at` | Timestamp |
| Action | Link | "👁 View" → navigates to `/transfer/:id` |

### Filters (no changes)

| Filter | Behavior |
|--------|----------|
| Date range picker | From/To dates |
| Search | By transfer ID or store name |
| All / Incoming / Outgoing | Direction filter |
| Status pills | Requested, Partially Approved, Approved, Dispatched, Received, Partially Received, Dispute Pending, Cancelled, Rejected, Withdrawn |

### Features kept as-is

| Feature | Status |
|---------|--------|
| Export CSV | ✅ Keep |
| Refresh | ✅ Keep |
| Status badges with colors | ✅ Keep |
| Type badges | ✅ Keep |
| Direction arrows | ✅ Keep |
| View → Transfer Detail page | ✅ Keep |
| PO reference codes (real `reference_code` from API) | ✅ Keep |

---

## Tab 2: Stock Ledger — Keep As-Is

### Table Columns (no changes)

| Column | Source | Display |
|--------|--------|---------|
| Date | Derived from transfer timestamps | Full datetime |
| Store | Store involved in this movement | Name + type badge |
| Item | `stock_title` from transfer line | Item name |
| Movement | Derived type | Badge: Transfer In, Transfer Out, Partial Receive, Reversal, Adj Increase, Adj Decrease, Wastage |
| Dir | Direction arrow | ↙ In / ↗ Out |
| Qty | Line quantity | Number + unit |
| Unit | Display unit | Text |
| Before | Not available from API | "—" (G-002 gap) |
| After | Not available from API | "—" (G-002 gap) |
| Reference | `reference_code` | "TRF-806-2026-XXXX" |
| Counterparty | Other store in the transfer | Name + type badge |
| Reason | Transfer reason if provided | Text or "—" |

### Type filter pills

| Type | Color |
|------|-------|
| Transfer Out | Red |
| Transfer In | Green |
| Partial Receive | Teal |
| Reversal (Restored) | Amber |
| Adjustment (Increase) | Blue |
| Adjustment (Decrease) | Orange |
| Wastage | Rose |

### Known Limitation: Before/After = "—"

G-002 (Backend gap): POS API doesn't return before/after quantities in transfer data. Columns show "—" for all rows. This is a known accepted limitation — not a bug to fix.

---

## API Calls (no changes)

| Call | When | Cache TTL |
|------|------|:---------:|
| `getTransferHistory({ fromDate, toDate, status, limit, page })` | Tab load + filter change | SHORT (30s) |
| `getTransferDetails(id)` | Per transfer (for Stock Ledger derivation + items count if needed) | MEDIUM (45s) |
| `getFranchiseHistory({ fromDate, toDate })` | Stock Ledger derivation | SHORT (30s) |

---

## Issues Fixed

| ID | Issue | Fix |
|----|-------|-----|
| **O-15** | "0 items" for all transfers in Transfer History | Fix items count from correct field — shared fix with O-14 (Pending Queues) |

## Known Gaps (not fixable in frontend)

| Gap | Issue | Status |
|-----|-------|--------|
| G-002 | Before/After qty always "—" | OPEN — backend doesn't provide |
| G-004 | History API missing restaurant_type for store badges | OPEN — workaround via `useRestaurantMap` |

---

## Mock Reference

No new mock needed — current layout kept. Bug fix is data-only, no visual change.

---

*This document is FROZEN. Implementation proceeds against this spec. Changes require owner re-approval.*
