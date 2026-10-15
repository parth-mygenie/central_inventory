# CR-032 — Pending Queues UX Freeze

> **Date:** 2026-06-13
> **Status:** FROZEN — Owner approved
> **Scope:** Pending Queues screen (`/queues`)
> **Pattern:** Keep current card-based layout — bug fixes only

---

## Layout: Keep Current (Card-Based Approval Inbox)

The current design from CR-023 is strong. No pattern change needed.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Pending Queues                                    Updated just now 🔄│
│                                                                      │
│ [Approvals 2] [Ready to Dispatch 6] [Receives] [My Requests]       │
│                                                                      │
│ 2 transfers awaiting approval                    [Oldest first ▾]    │
│                                                                      │
│ ┌── APPROVAL CARD ───────────────────────────────────────────────┐  │
│ │ TRF-806-2026-0003                                              │  │
│ │ Outlet Direct One → german fluid    ← FIX: requester first     │  │
│ │ Outlet Direct One requesting from you  ← FIX: correct label    │  │
│ │                                    [Partial — 2 of 3] [15h ago]│  │
│ │                                                                │  │
│ │ ITEM REQUESTED        QTY REQUESTED  YOUR STOCK  AFTER APPROVAL│  │
│ │ Sesame Cookies piece  10 (has 6)     6 piece     -4 piece 🔴   │  │
│ │ Ragi Cookies piece    15             37 piece    22 piece      │  │
│ │ Oats Cookies piece    12             24 piece    12 piece      │  │
│ │                                                                │  │
│ │ store health: ● 24 out  24 adequate                            │  │
│ │ 3 items · Requested by Outlet Direct One                       │  │
│ │ ⚠ Insufficient: Sesame (6 of 10 requested)                    │  │
│ │                                                                │  │
│ │ [Reject] [View Details] [Partial Approve] [Approve All]        │  │
│ └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Bug Fix 1: Requester Name Swap (O-13) — HIGH

### Current (wrong)
```
TRF-806-2026-0003
german fluid → Outlet Direct One
german fluid requesting from you
```

### After fix
```
TRF-806-2026-0003
Outlet Direct One → german fluid
Outlet Direct One requesting from you
```

### Root Cause

For **request-type** transfers:
- `from_restaurant` = the FULFILLER (Central Store, you)
- `to_restaurant` = the REQUESTER (Outlet)

The card header currently shows `from → to` which displays "german fluid → Outlet Direct One" — technically the stock flow direction, but confusing because it reads as "german fluid is requesting."

### Fix Logic

```javascript
// In PendingQueues.jsx — Approval card header
const isRequest = transfer.type === "request" || transfer.type === "modification_request";

if (isRequest) {
  // Requester is to_restaurant (the outlet asking for stock)
  headerTitle = `${toRestaurantName} → ${fromRestaurantName}`;
  subtitle = `${toRestaurantName} requesting from you`;
  requestedByLabel = `Requested by ${toRestaurantName}`;
} else {
  // Direct dispatch: from is sender (you)
  headerTitle = `${fromRestaurantName} → ${toRestaurantName}`;
  subtitle = `Dispatching to ${toRestaurantName}`;
}
```

### Must test both perspectives:
- Login as Central (806) → Approvals → request from Outlet shows "Outlet Direct One requesting from you" ✓
- Login as Outlet (809) → My Requests → shows "You requested from german fluid" ✓

---

## Bug Fix 2: "0 items" Count (O-14) — HIGH

### Current (wrong)
```
Ready to Dispatch tab:
TRF-806-2026-0012  german fluid → Outlet Direct One  0 items  Partially Received
TRF-806-2026-0008  german fluid → Outlet Direct One  0 items  Approved
```

### After fix
```
TRF-806-2026-0012  german fluid → Outlet Direct One  3 items  Partially Received
TRF-806-2026-0008  german fluid → Outlet Direct One  2 items  Approved
```

### Root Cause Investigation Needed

The items count likely comes from `formatItemsCount()` in `lib/formatters.js`. Possible causes:
1. History/queue API returns transfer headers WITHOUT `lines[]` array
2. `formatItemsCount` is called with wrong argument (e.g., `transfer.items` instead of `transfer.lines`)
3. The `items_count` field doesn't exist on the transfer object

### Fix approach:
```javascript
// Check what data is available:
const count = transfer.items_count        // if API provides it
  || transfer.lines?.length               // if lines array exists
  || transfer.line_count                  // alternative field name
  || 0;

display = count > 0 ? `${count} item${count > 1 ? 's' : ''}` : "—";
```

**Note:** This same bug likely affects History & Ledger (O-15) — shared root cause, one fix.

---

## What's Kept As-Is (already working well)

| Feature | Status |
|---------|--------|
| 4 tabs (Approvals, Ready to Dispatch, Receives, My Requests) | ✅ Keep |
| Card-based approval inbox with line items | ✅ Keep |
| Fulfillment verdict ("Partial — 2 of 3", "Can fulfill") | ✅ Keep |
| YOUR STOCK / AFTER APPROVAL projections per line | ✅ Keep |
| Store health strip ("24 out 24 adequate") | ✅ Keep |
| Age badges with color escalation (15h ago) | ✅ Keep |
| Insufficient stock warning (red highlight) | ✅ Keep |
| Reject / View Details / Partial Approve / Approve All buttons | ✅ Keep |
| Sort by "Oldest first" | ✅ Keep |
| PO reference codes (TRF-806-2026-XXXX) | ✅ Keep |
| Refresh + timestamp | ✅ Keep |

---

## API Calls (no changes)

| Call | When | Cache TTL |
|------|------|:---------:|
| `getPendingQueues()` | Page load | SHORT (30s) |
| `getStockInventory()` | Page load (own stock for projections) | LONG (60s) |
| `getTransferDetails(id)` | Per approval card (line items) | MEDIUM (45s) |
| `getHierarchyDetail(storeId)` | Per requester (health strip) | MEDIUM (45s) |

---

## Issues Fixed

| ID | Issue | Fix |
|----|-------|-----|
| **O-13** | Requester name shows self ("german fluid") instead of requester ("Outlet Direct One") | Swap from/to display for request-type transfers |
| **O-14** | "0 items" on Ready to Dispatch rows | Fix items count from correct field (lines.length or items_count) |

---

## Mock Reference

No new mock needed — current layout kept. Screenshots of current state serve as reference with bug annotations.

---

*This document is FROZEN. Implementation proceeds against this spec. Changes require owner re-approval.*
