# CR-031 — Run Production UX Freeze

> **Date:** 2026-06-13
> **Status:** FROZEN — Owner approved
> **Scope:** Run Production screen (`/production/new`)
> **Pattern:** Full-width expandable cards (Pattern B — like Raw Material Master)

---

## Layout: Recipe Cards → Expandable Form → Confirmation

### Structure
```
┌──────────────────────────────────────────────────────────────────────┐
│ Run Production                                                       │
│ Select a sub-recipe, specify batch details, and execute.             │
│                                                                      │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │
│ │ Sesame  ◄───│ │ Oats        │ │ Ragi        │ │ Whole Wheat │    │
│ │ 9 ing       │ │ 10 ing      │ │ 8 ing       │ │ 12 ing      │    │
│ │ FG: 6 🔴    │ │ FG: 24 🟡   │ │ FG: 37 🟢   │ │ FG: 1657 🟢 │    │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │
│                                                                      │
│ ┌── FORM (expanded for selected recipe) ─────────────────────────┐  │
│ │ Batches: [30    ]    Total Output: [30 piece]                  │  │
│ │ Batch Label: [SESAME-20260613-001]  Expiry: [2026-12-31]      │  │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ ┌── COVERAGE ESTIMATE (blue) ────────────────────────────────────┐  │
│ │ 30 Sesame Cookies covers ~5 days across 3 stores               │  │
│ │ Based on avg daily consumption of 6 pcs/day. Current FG: 6.    │  │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ ┌── INGREDIENT TABLE ────────────────────────────────────────────┐  │
│ │ Ingredient    │ Health │ Required │ Available │ Est Cost│Status│  │
│ │ Wheat Flour   │ ████   │ 6000 gm  │ 8825 gm  │ ₹330   │  ✓  │  │
│ │ Sesame Till   │ ██░░   │ 600 gm   │ 3970 gm  │ ₹114   │  ✓  │  │
│ │ Jaggery       │ ███░   │ 3000 gm  │ 3850 gm  │ ₹420   │  ✓  │  │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ ┌── COST SUMMARY ────────────────────────────────────────────────┐  │
│ │ Estimated Material Cost: ₹285.00 (₹9.50/piece)                │  │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ ┌── CONFIRMATION (green border) ─────────────────────────────────┐  │
│ │ Review Before Running                                          │  │
│ │ Recipe: Sesame Cookie  Qty: 30 pieces  Batch: SESAME-001      │  │
│ │ Expiry: 2026-12-31    Est Cost: ₹285.00                      │  │
│ │                                                                │  │
│ │ [Back to Edit]                    [Confirm & Run Production]   │  │
│ └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Section 1: Recipe Selector Cards

### Card Display
```
┌─────────────────┐
│ Sesame Cookie    │
│ 1 pc/batch       │
│ 9 ingredients    │
│       6          │  ← large FG stock number
│    FG Stock      │
└─────────────────┘
```

### Sorting
Sorted by demand: **lowest FG stock first** (most urgent to produce)

### Color Coding

| Condition | Color | Border |
|-----------|-------|--------|
| `is_low_stock` or FG = 0 | Red text | Red left border |
| FG > 0 and < 2× min_alert | Amber text | Amber left border |
| Adequate stock | Green text | Default border |

### Selection
Click card → blue border + form expands below

---

## Section 2: Production Form

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| Batches (multiplier) | Number input | Empty | "How many batches to produce" |
| Total Output | Read-only display | Computed | `base_qty × multiplier` + unit |
| Batch Label | Text input | Auto-generated | `{SHORT_NAME}-{YYYYMMDD}-001` |
| Expiry Date | Date picker | Empty | Min: tomorrow |

---

## Section 3: Coverage Estimate

Shown when multiplier > 0 and consumption data available.

```
[BarChart icon] 30 Sesame Cookies covers ~5 days across 3 stores
               Based on avg daily consumption of 6 pcs/day. Current FG: 6.
```

| Field | Source |
|-------|--------|
| Coverage days | `(current_stock + total_qty) / daily_consumption` |
| Daily consumption | `consumptionMap[fgId]` from `getDailyConsumptionReport()` |
| Store count | `hierarchyStores.length` |

---

## Section 4: Ingredient Requirements Table

Full-width table. Shown when recipe selected AND multiplier > 0.

| Column | Source | Display |
|--------|--------|---------|
| Ingredient | Resolved from inventory master (fix P-6) | Name, never `Item #ID` |
| Health | `available / min_qty_alert × 100` | Color bar (green >50%, amber >20%, red ≤20%) + percentage |
| Required | `ingredient_qty × multiplier` | "6000 gm" |
| Available | `stockMap[id].display_qty display_unit` | "8825 gm" |
| Est Cost | FEFO: allocate needed qty across segments by unit_cost | "₹330.00" |
| Status | `available >= required` | ✓ (green) or ✗ (red/amber) |

### Insufficient Stock Handling

| Setting | Behavior |
|---------|----------|
| `allow_negative_stock = false` | Red banner: "Cannot proceed — X ingredients insufficient". Submit button disabled. |
| `allow_negative_stock = true` | Amber banner: "Warning: X ingredients insufficient. Production will result in negative inventory." Submit allowed. |

---

## Section 5: Cost Summary

```
┌─────────────────────────────────────────────────┐
│ [₹] Estimated Material Cost    ₹285.00          │
│                                (₹9.50/piece)    │
└─────────────────────────────────────────────────┘
```

Source: Sum of per-ingredient FEFO cost estimates from Section 4.

---

## Section 6: Confirmation (fixes P-5)

**This section replaces one-click submission.** Production is irreversible — consumes raw materials.

### Confirmation Card (green border)
```
Review Before Running

Recipe:     Sesame Cookie
Quantity:   30 pieces (30 batches × 1 pc)
Batch:      SESAME-20260613-001
Expiry:     2026-12-31
Est Cost:   ₹285.00 (₹9.50/piece)

Insufficient: None ← or "2 ingredients below required qty"

[Back to Edit]              [Confirm & Run Production]
```

### Flow
1. Fill form → scroll down → see confirmation card pre-populated
2. Click "Confirm & Run Production" → API call → show post-production result
3. "Back to Edit" scrolls back to form

---

## Post-Production Result (existing, no change needed)

After successful run:
- Success card with reference code, qty produced, unit cost, total cost
- Action buttons: View Audit, View in Stock, Run Another
- NBA: Dispatch suggestions to lowest-stock stores (existing P3-6)
- NBA dispatch buttons link to `/dispatch/new` (fix P-8: pass `?to={storeId}` in future)

---

## Role Gate

| Role | Access |
|------|--------|
| Central (master) | Full access |
| Master (central) | Full access |
| Outlet (franchise) | Blocked: "Production is only available for Central and Master stores" |

---

## API Calls

| Call | When | Cache TTL |
|------|------|:---------:|
| `getSubRecipeList()` + `getStockInventory()` | Page load (recipe cards + FG stock) | LONG (60s) |
| `getDailyConsumptionReport()` | Page load (coverage estimate) | LONG (60s) |
| `getHierarchyDetail()` per child | Page load (store count for coverage) | MEDIUM (45s) |
| `getStockDetail(id)` per ingredient | On recipe select (segment costs) | MEDIUM (45s) |
| `runProduction()` | On confirm | No cache (write) |

---

## Mock Reference

| Mock | Description |
|------|-------------|
| `run_production_final` | Full flow: cards → form → ingredients → cost → confirmation |

---

*This document is FROZEN. Implementation proceeds against this spec. Changes require owner re-approval.*
