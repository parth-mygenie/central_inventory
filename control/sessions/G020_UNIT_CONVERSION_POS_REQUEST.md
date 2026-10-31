# G-020: Custom Unit Conversion Support in Inventory Master

> **Filed:** 2026-06-13
> **Priority:** P1
> **Status:** OPEN — Backend (POS) work required
> **Requested by:** Owner
> **Blocks:** Raw Material Master UX freeze (CR-030), accurate multi-unit inventory tracking

---

## Problem Statement

The POS inventory master currently supports only 4 hardcoded units (`kg`, `ltr`, `piece`, `pkt`) with fixed conversion factors (1 kg = 1000 gm, 1 ltr = 1000 ml, piece/pkt = 1:1). 

Real-world procurement uses custom units like **carton, bag, box, case, dozen, bundle, can, bottle, sachet** where the conversion to selling/consumption units is non-standard. For example:

| Purchase Unit | Conversion | Selling/Consumption Unit |
|--------------|:----------:|--------------------------|
| 1 carton of eggs | = 12 pieces | pieces |
| 1 bag of flour | = 25 kg | kg → gm |
| 1 case of oil | = 6 bottles (1 ltr each) | ltr → ml |
| 1 box of baking powder | = 500 gm | gm |
| 1 dozen cookies | = 12 pieces | pieces |

Without this, operators cannot:
- Record purchases in the units they actually buy (cartons, bags, cases)
- Auto-convert to inventory units (kg, pieces) for stock tracking
- See accurate per-unit procurement costs

---

## What's Needed from POS Backend

### 1. Expand the Unit Table

Current valid units: `kg`, `ltr`, `piece`, `pkt`

**Add support for custom units per restaurant.** Either:
- A) Predefined expanded list: `carton`, `box`, `case`, `bag`, `dozen`, `bottle`, `can`, `sachet`, `bundle`, `strip`, `pack`
- B) Allow restaurants to create custom units (preferred — future-proof)

**Endpoint needed (if option B):**
```
GET  /inventory/units              → list all available units for this restaurant
POST /inventory/units              → create custom unit { name: "carton", abbreviation: "ctn" }
```

### 2. Add `conversion_factor` to Inventory Master

**On `add-inventory`** — accept new fields:
```json
[{
  "category_id": 1540,
  "stock_title": "Eggs",
  "unit": "carton",           // ← purchase unit (custom)
  "small_unit": "piece",       // ← consumption/selling unit
  "conversion_factor": 12,     // ← NEW: 1 carton = 12 pieces
  "minimun_stock_alert": 24,
  "min_unit_alert": "piece"
}]
```

**On `update-stock/{id}`** — accept:
```json
{
  "unit": "carton",
  "small_unit": "piece",
  "conversion_factor": 12       // ← NEW: editable
}
```

**On `get-inventory-master` response** — return:
```json
{
  "id": 17800,
  "stock_title": "Eggs",
  "unit": "carton",
  "small_unit": "piece",
  "conversion_factor": 12,      // ← NEW: returned
  "cal_quantity": 60,            // in pieces (5 cartons × 12)
  "display_qty": 5,             // in cartons
  "display_unit": "carton"
}
```

### 3. Conversion Logic in Backend

When stock is added via `add-stock/{id}`:
```
Input: quantity = 5, unit = "carton"
Conversion: 5 × conversion_factor(12) = 60 pieces
Storage: cal_quantity += 60 (in small_unit = pieces)
Display: display_qty = cal_quantity / conversion_factor = 5.00 cartons
```

When stock is consumed (recipe, wastage, transfer):
```
Recipe requires: 3 pieces of Eggs
Deduction: cal_quantity -= 3
Display update: display_qty = 57/12 = 4.75 cartons
```

### 4. Impact on Existing Endpoints

| Endpoint | Change Needed |
|----------|--------------|
| `POST /inventory/add-inventory` | Accept `conversion_factor` (default: infer from unit pair, e.g., kg→gm = 1000) |
| `PUT /inventory/update-stock/{id}` | Accept `conversion_factor` update |
| `GET /inventory/get-inventory-master` | Return `conversion_factor` in response |
| `GET /inventory/stock-inventory` | Return `conversion_factor` in each item |
| `GET /inventory/stock-inventory/{id}` | Return `conversion_factor` in summary |
| `POST /inventory/add-stock/{id}` | Use `conversion_factor` for cal_quantity computation |
| `GET /inventory/units` | **NEW** — return valid units for this restaurant |

### 5. Backward Compatibility

For existing items with standard units (kg→gm, ltr→ml):
- `conversion_factor` defaults to **1000** for kg→gm and ltr→ml
- `conversion_factor` defaults to **1** for piece→piece and pkt→pkt
- No migration needed — existing items continue working
- Only NEW items or explicitly updated items use custom conversion_factor

---

## Frontend Readiness (what we'll build once backend is ready)

### Raw Material Master — Add/Edit Form

```
┌─────────────────────────────────────────────┐
│ Add Ingredient                              │
│                                             │
│ Name:        [Eggs                    ]     │
│ Category:    [Dairy & Eggs        ▾]        │
│                                             │
│ ┌─ Unit Conversion ──────────────────────┐  │
│ │ Purchase Unit:    [carton          ▾]  │  │
│ │ Consumption Unit: [piece           ▾]  │  │
│ │ Conversion:       [12    ] piece/carton│  │
│ │                                        │  │
│ │ "1 carton = 12 pieces"                 │  │
│ └────────────────────────────────────────┘  │
│                                             │
│ Min Stock Alert: [24   ] [piece ▾]          │
│                                             │
│ [Save]                                      │
└─────────────────────────────────────────────┘
```

### Table Display

| Name | Category | Purchase Unit | Consumption Unit | Conversion | Stock | Status |
|------|----------|:------------:|:---------------:|:----------:|------:|:------:|
| Eggs | Dairy | carton | piece | 1:12 | 5 cartons (60 pcs) | OK |
| Flour | Baking | bag | kg | 1:25 | 2 bags (50 kg) | Low |
| Baking Powder | Cookie | kg | gm | 1:1000 | 3.21 kg | OK |

---

## Validation Evidence

**API probe (2026-06-13):**
- `add-inventory` with `"unit": "carton"` → **400: "Unit name was not found in the unit table."**
- `add-inventory` with `"conversion_factor": 12` → silently ignored (field not in schema)
- Valid units confirmed: `kg`, `ltr`, `piece`, `pkt` only
- No `GET /inventory/units` endpoint exists

---

## Priority Justification

- **Every bakery/restaurant buys in bulk units** (bags, cartons, cases) but tracks in consumption units (kg, gm, pieces)
- Without conversion, operators must mentally convert every purchase → error-prone
- Affects: Raw Material Master, Purchase screen, Production Run (ingredient requirements), Stock Inventory display
- This is table-stakes for any production-oriented inventory system

---

*Filed as G-020 in `/app/control/L9_OPEN_GAPS_REGISTER.md`*
