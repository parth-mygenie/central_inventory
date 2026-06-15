# CR-030 — Raw Material Master UX Freeze

> **Date:** 2026-06-13
> **Status:** FROZEN — Owner approved
> **Scope:** Raw Material Master screen (`/raw-materials`)
> **Assumption:** Purchase unit = Consumption unit (same) until G-020 delivers custom unit conversion

---

## Layout: Full-Width Table + Expandable Row Detail

### Structure
```
┌──────────────────────────────────────────────────────────────────────┐
│ Raw Material Master                                                  │
│ [Ingredients] [Categories]                                           │
│                                                                      │
│ [🔍 Search...              ] [Category ▾] [Status ▾]  [+ Add Item]  │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Name          Category  Qty      Unit  Min Alert Status Recipes  │ │
│ │ ──────────────────────────────────────────────────────────────── │ │
│ │ Almonds       Cookie    2 kg     kg    0 kg      OK     0       │ │
│ │ ▼ Baking Powder Cookie  3.21 kg  kg    500 gm    OK     0    ◀──SELECTED│
│ │ ┌────────────────────────────────────────────────────────────┐  │ │
│ │ │ EDIT FORM                    │ INTELLIGENCE                │  │ │
│ │ │ Name: [Baking Powder    ]    │ ┌Avg Rate─┐ ┌Consump─┐ ┌DoS┐│  │ │
│ │ │ Category: [Cookie       ▾]   │ │₹130/kg  │ │42gm/d  │ │76d││  │ │
│ │ │ Unit: [kg               ▾]   │ └─────────┘ └────────┘ └───┘│  │ │
│ │ │ Min Alert: [500] [gm   ▾]   │                              │  │ │
│ │ │                              │ VENDOR PRICE COMPARISON      │  │ │
│ │ │ [Save] [Cancel]             │ Budget ₹100/kg ✓ best        │  │ │
│ │ │                              │ Premium ₹150/kg              │  │ │
│ │ │                              │ bakery ₹240/kg               │  │ │
│ │ │                              │                              │  │ │
│ │ │                              │ Pushed to: 3 of 5 stores     │  │ │
│ │ └──────────────────────────────┴──────────────────────────────┘  │ │
│ │ Baking Soda   Cookie    3.32 kg  kg    500 gm    OK     0       │ │
│ │ Carrot        Cookie    0 kg     kg    0 kg      OK     0       │ │
│ │ ...                                                              │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Table Columns

| Column | Source | Display |
|--------|--------|---------|
| Name | `stock_title` | Bold text |
| Category | `category_name` | Text |
| Qty | `display_qty` + `display_unit` | "3.21 kg" (monospace) |
| Unit | `unit` | "kg" — this is both purchase AND consumption unit (G-020 assumption) |
| Min Alert | `min_qty_alert` + `min_unit_alert` | "500 gm" |
| Status | `is_low_stock` | Badge: "OK" (green) / "Low" (red) / "Empty" (gray, when cal_quantity=0 AND min_qty_alert=0) |
| Recipes | Cross-ref from `getRecipeList()` | Count: "3" |
| Actions | Click row to expand | Chevron ▶/▼ |

### Status Badge Logic (updated from current)
```
if (is_low_stock)           → "Low" (red badge)
else if (cal_quantity == 0) → "Empty" (gray badge)  ← NEW
else                        → "OK" (green badge)
```

---

## Expandable Row Detail (on click)

### Left Half: Edit Form

| Field | Type | Source | Editable? |
|-------|------|--------|:---------:|
| Name | text input | `stock_title` | YES (with rename warning) |
| Category | dropdown | `category_id` → category list | YES |
| Unit | dropdown | `unit` (kg/ltr/piece/pkt) | YES |
| Min Stock Alert | number + unit dropdown | `min_qty_alert` + `min_unit_alert` | YES |

**Buttons:** Save, Cancel

**Note:** When G-020 lands, this form will add:
- Consumption Unit dropdown (currently same as Unit)
- Conversion Factor input ("1 kg = __ gm")

### Right Half: Intelligence Panel

**Data source:** `vendor-item-list` API (1 call, cached, filtered per ingredient)

#### KPI Row (3 cards)

| KPI | Source | Computation |
|-----|--------|-------------|
| **Avg Purchase Rate** | vendor-item-list filtered by `Ingredient_Name` | `sum(Amount) / sum(stock_quantity_raw)` across all purchases. Show "₹X/unit" with trend arrow vs previous month. |
| **Consumption Rate** | `stock-inventory/{id}` → `consumption_summary.total_consumed_cal` / date range days | "X gm/day" or "X pcs/day" |
| **Days of Stock** | `cal_quantity / daily_consumption_rate` | "76 days" or "—" if no consumption data |

#### Vendor Price Comparison

| Element | Source |
|---------|--------|
| Horizontal bars per vendor | Group vendor-item-list by `Vendor_Name` where `Ingredient_Name` matches |
| Bar length | Proportional to `Amount / stock_quantity_raw` (per-unit rate) |
| Color | Green = cheapest, Amber = mid, Red = most expensive |
| "✓ best" label | On the cheapest vendor |

**Example for Baking Powder:**
```
Budget Ingredients Co   ₹100/kg  ████████████ ✓ best
Premium Organics Ltd    ₹150/kg  ██████████████████
bakery raw wala         ₹240/kg  ████████████████████████████
```

#### Pushed to Stores
| Element | Source |
|---------|--------|
| "Pushed to X of Y stores" | `getHierarchyList()` cross-reference |
| Store names list | Children with this ingredient in their inventory |

---

## Filters & Controls (above table)

| Control | Behavior |
|---------|----------|
| Search | Filter by `stock_title` or `category_name` |
| Category dropdown | Filter by `category_name`. Options populated from unique categories in data. "All Categories" default. |
| Status dropdown | "All" / "OK" / "Low" / "Empty" |
| "+ Add Item" button | Opens Add Ingredient form (see below) |

---

## Add Ingredient Flow

Clicking "+ Add Item" opens an **inline form at the top of the table** (not a popup):

```
┌──────────────────────────────────────────────────────────────────┐
│ ✚ New Ingredient                                                  │
│                                                                    │
│ Name: [             ] Category: [Select ▾] Unit: [kg ▾]          │
│ Min Alert: [    ] Alert Unit: [gm ▾]                              │
│                                                [Cancel] [Add]     │
└──────────────────────────────────────────────────────────────────┘
```

**On success:** Toast "Ingredient added". New item appears in table. Form clears.
**On error:** Toast with error message (NOT silent — fix for I-7).

---

## Categories Tab (unchanged)

Current CRUD works well. No changes needed:
- List with Name column + Edit/Delete actions
- Add Category dialog (keep as dialog — simple single-field form)
- No expandable row needed (too simple for that pattern)

---

## API Calls on Page Load

| Call | Purpose | Cache TTL |
|------|---------|:---------:|
| `getStockInventory()` | Ingredient list with quantities | LONG (60s) |
| `getStockItemCategories()` | Category list for filter + form | LONG (60s) |
| `getRecipeList()` | Recipe cross-reference counts | LONG (60s) |
| `getVendorItemList(rid, from, to)` | Purchase intelligence (all ingredients) | LONG (60s) |

**On row expand (1 additional call):**
| Call | Purpose | Cache TTL |
|------|---------|:---------:|
| `getStockDetail(id)` | Segment costs + consumption summary for KPIs | MEDIUM (45s) |

---

## What This Replaces

| Before (current) | After (frozen) |
|-------------------|----------------|
| Edit → popup dialog | Expandable row with inline form |
| Add → popup dialog | Inline form at top of table |
| No intelligence | KPIs + vendor price comparison + pushed-to-stores |
| Silent add failure | Toast on error |
| "OK" for 0-stock items | "Empty" badge |
| No category filter | Category + Status dropdowns |
| No vendor comparison | Per-ingredient vendor price bars |

---

## Pending G-020 (flagged, not blocked)

When POS delivers G-020 (custom unit conversion):
- Add "Consumption Unit" dropdown to edit form
- Add "Conversion Factor" input
- Table shows both units: "5 cartons (60 pcs)"
- **Current assumption: purchase unit = consumption unit**

---

## Mock Reference

| Mock | Description |
|------|-------------|
| `rawmat_final_with_costs` | Full layout with expandable row, intelligence panel, vendor comparison |

---

*This document is FROZEN. Implementation proceeds against this spec. Changes require owner re-approval.*
