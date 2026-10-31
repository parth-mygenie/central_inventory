# CR-030 — Vendor Management UX Freeze

> **Date:** 2026-06-13
> **Status:** FROZEN — Owner approved
> **Scope:** Vendor Management screen (`/vendor-management`)

---

## Layout: Master-Detail (Single Screen, Zero Popups)

### Structure
```
┌─────────────────────────────────────────────────────────────────┐
│ [Existing App Sidebar]  │  VENDOR MANAGEMENT CONTENT AREA       │
│                         │                                       │
│  DASHBOARD              │  ┌──────────┬────────────────────────┐│
│  INWARD ▾               │  │ VENDORS  │  VENDOR DETAIL         ││
│    Vendor Management ◄──│  │          │                        ││
│    Raw Material Master  │  │ [Search] │  ┌─ Edit Form ───────┐ ││
│    Purchase             │  │ [+Add]   │  │ Name    | Contact │ ││
│  PRODUCTION ▾           │  │          │  │ Phone   | Email   │ ││
│  OUTWARD ▾              │  │ ┌──────┐ │  │ Address | GST     │ ││
│  REPORTS ▾              │  │ │VendA │◄│  │ [Save] [Delete]   │ ││
│  SETTINGS ▾             │  │ │VendB │ │  └───────────────────┘ ││
│                         │  │ │VendC │ │                        ││
│                         │  │ │VendD │ │  ┌─ Purchase Intel ──┐ ││
│                         │  │ └──────┘ │  │ KPIs | Bar Chart  │ ││
│                         │  │          │  │ Recent Purchases   │ ││
│                         │  │          │  └───────────────────┘ ││
│                         │  └──────────┴────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Left Panel (35%) — Vendor List

| Element | Spec |
|---------|------|
| Search bar | Filter by name, phone, email |
| "+ Add Vendor" button | Clears right panel form for new entry |
| Vendor cards | Name (bold), phone, Active/Inactive badge |
| Selected state | Blue left border on active vendor |
| Scrollable | Vertical scroll, independent of right panel |

### Right Panel (65%) — Top: Edit Form

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| Vendor Name | text | YES | Unique per restaurant |
| Contact Person | text | No | |
| Phone | text | No | |
| Email | email | No | |
| Address | textarea | No | |
| GST Number | text | No | |

| Button | Behavior |
|--------|----------|
| Save | Creates (if new) or updates (if editing). Toast on success/failure. |
| Delete | Confirmation inline: "Are you sure? This cannot be undone." Then delete + select next vendor. |

### Right Panel (65%) — Bottom: Purchase Intelligence

#### KPI Row (3 cards)

| KPI | Source | Display |
|-----|--------|---------|
| Last Purchase | Most recent segment with this `vendor_id` | "3 days ago" / "Never" |
| Total Purchases | Count of segments with this `vendor_id` | "47" |
| Avg Order Value | Sum of (unit_cost × qty) / count | "₹12,500" |

#### Monthly Purchase Bar Chart
- Last 6 months of purchase volume for this vendor
- Current month highlighted in amber
- Y-axis: ₹ amount
- Source: Aggregate segments by `vendor_id` + `created_at` month

#### Recent Purchases Table (last 5)

| Column | Source |
|--------|--------|
| Date | Segment `created_at` |
| Item | `stock_title` from inventory master |
| Qty | Segment `cal_quantity` + `display_unit` |
| Rate | Segment `unit_cost` |
| Amount | `unit_cost × cal_quantity` |

---

## Behavior Rules

| Action | Result |
|--------|--------|
| Page load | Load vendors. Select first vendor. Show its form + intelligence. |
| Click vendor in list | Load that vendor's form + intelligence in right panel. |
| Click "+ Add Vendor" | Clear form. Hide intelligence section (no data yet). Show "New Vendor" title. |
| Save new vendor | Add to list, select it, show empty intelligence ("No purchases yet"). |
| Save existing vendor | Update in list, show success toast. |
| Delete vendor | Remove from list, select next vendor (or show empty state). |
| Search | Filter left panel list. Right panel unchanged. |

## Empty States

| State | Display |
|-------|---------|
| No vendors at all | Full-width: "No vendors yet. Add your first supplier to start recording stock purchases." [+ Add Vendor] |
| Vendor selected, no purchases | Intelligence section: "No purchase history for this vendor yet." |
| New vendor form | Title: "New Vendor". Intelligence section hidden. |

## Data Source for Intelligence

**Dedicated purchase history API confirmed: `vendor-item-list`** (G-017 CLOSED 2026-06-13)

### API Endpoint
```
GET /inventory/vendor-item-list?restaurant_ids[]={rid}&from_date=YYYY-MM-DD&to_date=YYYY-MM-DD
```

### Response shape (per record)
```json
{
  "ID": 11312,
  "restaurant_id": 806,
  "ingredient_id": 17640,
  "Restaurant_Name": "german fluid",
  "restaurant_type_flag": "master",
  "Ingredient_Name": "Milk",
  "Purchase_Date": "2026-06-13",
  "Vendor_Name": "Premium Organics Ltd",
  "Quantity": "2 ltr",
  "stock_quantity_raw": 2,
  "Amount": 80,
  "line_total": 80,
  "unit_price": 0.04,
  "Payment_Type": "Cash"
}
```

### Aggregation logic
1. On page load → call `vendor-item-list` with `restaurant_ids[]={loginRid}` and `from_date=1 year ago` / `to_date=today`
2. Cache full response (TTL: LONG 60s)
3. On vendor select → filter records where `Vendor_Name === selectedVendor.vendor_name`
4. Compute KPIs: count, total spend, avg order, last purchase date, monthly breakdown
5. For Purchase screen intelligence → group by `Ingredient_Name` + `Vendor_Name` to find best rates per item

---

## What This Replaces

| Before (current) | After (frozen) |
|-------------------|----------------|
| Table-only list | Master-detail single screen |
| Add Vendor → popup dialog | Inline form in right panel |
| Edit → popup dialog | Same inline form |
| No purchase intelligence | KPIs + chart + recent purchases table |
| "Inactive" based on created_at | "Inactive" based on last purchase from segments |

---

## Mock Reference

| Mock | URL |
|------|-----|
| Vendor Management (frozen) | `vendor_content_area_v2` |
| Purchase Price Intelligence (related — separate CR) | `purchase_price_intelligence` |

---

*This document is FROZEN. Implementation proceeds against this spec. Changes require owner re-approval.*
