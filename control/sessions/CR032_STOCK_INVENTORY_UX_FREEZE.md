# CR-032 — Stock Inventory UX Freeze

> **Date:** 2026-06-13
> **Status:** FROZEN — Owner approved
> **Scope:** Stock Inventory screen (`/inventory`) + Stock Detail (`/inventory/:id`)
> **Pattern:** Full-width expandable rows (Pattern B)
> **Backend optimization:** G-022 — aggregated endpoint with segments + consumption needed before implementation

---

## Layout: KPIs + Filters + Table with Expandable Segment Detail

### Structure
```
┌──────────────────────────────────────────────────────────────────────┐
│ Stock Inventory                                                      │
│ german fluid                          [My Store ○] [Refresh] [CSV]  │
│                                                                      │
│ [All (48)] [Finished Goods (4)] [Raw Materials (44)]                │
│                                                                      │
│ ┌──────────┐ ┌──────────────┐ ┌──────────┐                         │
│ │ Total    │ │ Low Stock    │ │Categories│                         │
│ │   48     │ │    2    🔴   │ │    4     │                         │
│ └──────────┘ └──────────────┘ └──────────┘                         │
│                                                                      │
│ [🔍 Search...]           [All Categories ▾]  [Low Stock First ▾]    │
│                                                                      │
│ ┌── TABLE ───────────────────────────────────────────────────────┐  │
│ │ Ingredient    │ Category │ Qty     │MinAlert│Status│Expiry│Pend│DoC│
│ │ coffee beans  │ coffee   │ 0 pkt   │500 gm  │ Low  │ —    │ — │ — │
│ │ Ajwain        │ Khari    │ 0 kg    │0 kg    │Empty │ —    │ — │ — │
│ │ Baking Powder │ Cookie   │ 3.21 kg │500 gm  │ OK   │View  │ — │76d│
│ │ ▼ EXPANDED ─────────────────────────────────────────────────── │
│ │ │ FEFO SEGMENTS          │ CONSUMPTION        │ QUICK ACTIONS │  │
│ │ │                        │                    │               │  │
│ │ │ Batch     Exp    Qty   │ Daily: 42 gm/day  │ [Wastage]     │  │
│ │ │ BP-LOT-001 Jul-07 206gm│ 7-day: 294 gm     │ [Dispatch]    │  │
│ │ │ VA-BP-001 Sep-12 1000gm│ Cover: 76 days 🟢  │ [Adjust]      │  │
│ │ │ CT-VA-BP  Sep-30 500gm │ ▁▂▃▄▅ trend       │               │  │
│ │ │ ...2 more              │                    │ [Full Detail→]│  │
│ │ └────────────────────────┴────────────────────┴───────────────┘  │
│ │ Baking Soda   │ Cookie   │ 3.32 kg │500 gm  │ OK   │View  │ — │79d│
│ │ Cashew        │ Cookie   │ 2 kg    │0 kg    │ OK   │ —    │ — │ — │
│ └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Header (bug fixes applied)

| Element | Before | After |
|---------|--------|-------|
| Title | "Stock Inventory — Central Store — Store #806" | **"Stock Inventory"** with subtitle **"german fluid"** (store name from login context) |
| Back button | "← Back" visible | **Removed** (main nav screen, not a drill-down) |
| My Store toggle | Exists | Keep — CR-016 hierarchy toggle (re-QA separately) |
| Refresh | "just now" timestamp | Keep as-is |
| CSV export | Exists | Keep as-is |

---

## FG/Raw Split Tabs (CR-029)

```
[All (48)] [Finished Goods (4)] [Raw Materials (44)]
```

Keep as-is. Working correctly.

---

## KPI Cards (3)

| KPI | Source | Display |
|-----|--------|---------|
| Total Items | `stocks.length` (filtered by tab) | Large number |
| Low Stock | Items where `is_low_stock = true` | Large number, red background |
| Categories | Unique `category_name` count | Large number |

---

## Table Columns

| Column | Source | Display |
|--------|--------|---------|
| Ingredient | `stock_title` | Bold text, click row to expand |
| Category | `category_name` | Text |
| Quantity | `display_qty` + `display_unit` | Monospace. Red text if 0. |
| Min Alert | `min_qty_alert` + `min_unit_alert` | Text |
| Status | See logic below | Badge |
| Expiry Risk | From segments (if available) | "View detail" link or "—" |
| Pending | From pending queues | Count or "—" |
| Days of Cover | `cal_quantity / daily_consumption` | "76d" (green) or "—" |

### Status Badge Logic (updated)

```
if (is_low_stock)                              → "Low" (red badge)
else if (cal_quantity == 0 && min_qty_alert == 0) → "Empty" (gray badge)
else if (cal_quantity == 0)                     → "Out" (red badge)
else                                           → "OK" (green badge)
```

### Days of Cover Fix (O-9)

```javascript
// Before: could show "-0d"
// After:
const daysOfCover = Math.max(0, Math.round(cal_quantity / dailyConsumption));
display = daysOfCover === 0 ? "—" : `${daysOfCover}d`;
// Color: green if >14d, amber if 3-14d, red if <3d
```

---

## Expandable Row Detail (on click)

Loads `getStockDetail(inventoryMasterId)` on expand. Three sections side by side.

### Left: FEFO Segments

| Column | Source | Display |
|--------|--------|---------|
| Batch | `segment.batch` | Text, "—" if empty |
| Expiry | `segment.expiry_date` | Date, amber "Expiring Soon" badge if < 14 days |
| Qty | `segment.cal_quantity` + display conversion | "206 gm" |
| Unit Cost | `segment.unit_cost` | "₹0.30" |

- Show top 5 segments (FEFO order — earliest expiry first)
- If more: "+ X more" link
- Expired segments: red strikethrough text

### Middle: Consumption

| Metric | Source | Display |
|--------|--------|---------|
| Daily Rate | `consumption_summary.total_consumed_cal / date_range_days` | "42 gm/day" |
| 7-Day Total | `consumption_summary.total_consumed_cal` | "294 gm" |
| Days of Cover | `cal_quantity / daily_rate` | "76 days" with green/amber/red color |
| Trend | Derived from consumption data | Mini sparkline (7 bars) |

### Right: Quick Actions

| Button | Action | Route |
|--------|--------|-------|
| **Record Wastage** | Navigate with item pre-selected | `/wastage/new?item={id}` |
| **Dispatch** | Navigate with item pre-selected | `/dispatch/new?item={id}` |
| **Adjust Stock** | Navigate with item pre-selected | `/adjustment/new?item={id}` |
| **View Full Detail →** | Navigate to full detail page | `/inventory/{id}` |

"View Full Detail" goes to the existing `StockDetailPanel.jsx` for deep dive (full consumption history, all segments, reconciliation).

---

## Backend Optimization Required: G-022

### Current (N+1 problem)
```
Page load: GET /inventory/stock-inventory → 48 items (no segments)
Per expand: GET /inventory/stock-inventory/{id} → 1 item with segments + consumption
```

### Requested (single call)
```
GET /inventory/stock-inventory?include_segments=true&include_consumption=true
```

**Response should include per item:**
```json
{
  "id": 17635,
  "stock_title": "Baking Powder",
  "cal_quantity": 3206,
  "segments_preview": [
    { "batch": "BP-LOT-001", "expiry_date": "2026-07-07", "cal_quantity": 206, "unit_cost": 0.3 },
    { "batch": "VA-BP-001", "expiry_date": "2026-09-12", "cal_quantity": 1000, "unit_cost": 0.3 }
  ],
  "segments_total": 5,
  "consumption_daily_rate": 42,
  "consumption_7d_total": 294,
  "days_of_cover": 76
}
```

- `segments_preview`: Top 3-5 FEFO segments (enough for inline display)
- `segments_total`: Total segment count (for "+ X more" display)
- `consumption_daily_rate`: Pre-computed daily consumption
- `days_of_cover`: Pre-computed

**This eliminates N+1.** Single API call loads everything needed for table + all expandable rows.

**Until G-022 is ready:** Use current per-expand call (`getStockDetail`). Works fine, just slower for rapid expanding.

---

## Stock Detail Page (`/inventory/:id`) — Keep As-Is

The full `StockDetailPanel.jsx` page remains for deep dive:
- Complete segment list (not just top 5)
- Full consumption history with line-by-line events
- Quantity reconciliation (aggregate vs segment totals)
- Accessed via "View Full Detail →" in expanded row

No changes to this page.

---

## API Calls

| Call | When | Cache TTL |
|------|------|:---------:|
| `getStockInventory()` | Page load | LONG (60s) |
| `getPendingQueues()` | Page load (for Pending column) | SHORT (30s) |
| `getStockDetail(id)` | On row expand (per item) | MEDIUM (45s) |
| **Future: `getStockInventory({ includeSegments, includeConsumption })`** | **Page load (replaces per-expand calls)** | **LONG (60s)** |

---

## Issues Fixed

| ID | Issue | Fix |
|----|-------|-----|
| **O-9** | "-0d" in Days of Cover | `Math.max(0, ...)`, show "—" for 0 |
| **O-10** | "← Back" button on main nav screen | Removed |
| **O-11** | "Store #806" instead of name | Show `restaurantName` from login context |
| **O-12** | CR-016 hierarchy toggle re-QA | Tracked separately, toggle kept in UI |

---

## What This Replaces

| Before (current) | After (frozen) |
|-------------------|----------------|
| Click row → navigate to `/inventory/:id` | Click row → expand inline (segments + consumption + actions) |
| Must leave page to see batch info | FEFO segments visible inline |
| Must leave page for quick actions | Wastage/Dispatch/Adjust buttons inline |
| "← Back" button | Removed |
| "Store #806" | "german fluid" (store name) |
| "-0d" display | Fixed to "—" or proper days |
| "OK" for empty items | "Empty" gray badge |
| 1 API call per page | 1 API call per expand (G-022 will optimize to single call) |

---

## Mock References

| Mock | Description |
|------|-------------|
| `stock_inv_option_b_expand` | Expandable row with FEFO segments + consumption + quick actions |

---

## Backend Request: G-022

Filed in gap register. Spec:
- Extend `GET /inventory/stock-inventory` with `include_segments=true&include_consumption=true`
- Return top 5 FEFO segments + consumption daily rate + days of cover per item
- Eliminates N+1 API calls for expandable row pattern

---

*This document is FROZEN. Implementation proceeds against this spec. Changes require owner re-approval.*
