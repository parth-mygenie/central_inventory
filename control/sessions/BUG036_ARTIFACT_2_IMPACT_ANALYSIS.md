# BUG-036 — Impact Analysis (Gate 2)

> **ID:** BUG-036
> **Title:** App-Wide Consumption Unit Mismatch
> **Code Reality:** PARTIAL — `normalizeToDisplayUnit()` exists in IngredientCatalogue only; not shared
> **Agent:** PLANNING (combined with INTAKE session)

---

## Data Flow Trace

### Source: POS API `daily-consumption-report`

```
POST /proxy/v2/report/daily-consumption-report
  → stock_details[]: { ingredient_id, ingredient_name, quantity_deducted: "8.57 gm" }
  → stock_summary[]: { ingredient_id, ingredient_name, total_consumed: "134.18 gm" }

Key fact: quantity_deducted and total_consumed are STRINGS with unit suffix.
The unit is ALWAYS the base unit (gm for weight, ml for volume).
```

### Source: POS API `stock-inventory`

```
GET /proxy/v2/inventory/stock-inventory
  → current_stocks[]: { id: 17772, display_qty: "29.87", unit: "kg", cal_quantity: "29865.84" }

Key fact: display_qty is in display unit (kg/ltr). cal_quantity is in base unit (gm/ml).
```

### The Gap
Consumption data arrives in **gm** (base unit). Stock data is displayed in **kg** (display unit). Frontend components must convert between them. Only 1 of 8 components does this.

---

## Conflict Pre-Check

| Target File | Last Modifier | Other Items in Flight | Conflict? |
|------------|---------------|----------------------|:---------:|
| `lib/formatters.js` | CR-025 (reference_code) | None active | NO |
| `PurchaseOrderCreate.jsx` | BUG-030 | None active | NO |
| `IngredientCatalogue.jsx` | BUG-029 | None active | NO |
| `DirectDispatchForm.jsx` | CR-025 | None active | NO |
| `RequestStockForm.jsx` | CR-025 | None active | NO |
| `useProductionRun.js` | CR-026 | None active | NO |
| `StockInventorySummary.jsx` | BUG-031, BUG-032 | None active | NO |
| `StockDetailPanel.jsx` | CR-015 | None active | NO |

All target files are conflict-free. No parallel items touching same files.

---

## Per-Component Impact Analysis

### Component 1: `lib/formatters.js` (NEW shared helper)

**Current state:** No consumption unit helpers exist.

**Required additions:**
1. `parseConsumedQty(str)` — parse "134.18 gm" → `{ value: 134.18, unit: "gm" }`
2. `normalizeToDisplayUnit(value, fromUnit, toUnit)` — convert gm→kg, ml→ltr and vice versa
3. `smartConsumptionDisplay(value, fromUnit, toUnit)` — format with 3 decimals + Option A fallback

**Risk:** LOW — new functions only, no modification to existing code in this file.

**Downstream consumers:** All 7 other components will import from here.

---

### Component 2: `PurchaseOrderCreate.jsx` (**P0 — CRITICAL**)

**Current broken flow (By Item Need, lines 222-242):**
```
consumptionMap[item.id] → cData = { dailyQty: 9.584, unit: "gm" }
dailyConsumption = 9.584  ← gm/day (unit ignored!)
qty = Number(item.display_qty) = 29.87  ← kg
daysOfCover = Math.floor(29.87 / 9.584) = 3  ← WRONG (mixing kg ÷ gm)
suggestedQty = Math.ceil(30 * 9.584 - 29.87) = 258  ← WRONG (30 × gm - kg)
```

**Display (line 641):**
```
l.daily.toFixed(1) ${l.unit}/d → "9.6 kg/d"  ← label says kg but value is gm
```

**Correct flow after fix:**
```
cData = { dailyQty: 9.584, unit: "gm" }
dailyInDisplayUnit = normalizeToDisplayUnit(9.584, "gm", "kg") = 0.009584 kg/day
daysOfCover = Math.floor(29.87 / 0.009584) = 3116  ← CORRECT
suggestedQty = Math.ceil(30 × 0.009584 - 29.87) = 0  ← CORRECT (already stocked)
display = smartConsumptionDisplay(9.584, "gm", "kg") → "9.584 gm/d" (Option A fallback)
```

**Lines to modify:**
| Line | Current | Fix |
|:----:|---------|-----|
| 168-169 | `dailyConsumption = cData.dailyQty` (raw gm) | Normalize to display unit before use |
| 172 | `Math.floor(currentQty / dailyConsumption)` | Use normalized value |
| 184 | `TARGET_DAYS * dailyConsumption - currentQty` | Use normalized value |
| 196 | `dailyConsumption` stored in line object | Store normalized + original unit |
| 222-224 | Same pattern in By Item Need | Same fix |
| 231-232 | Same calculation | Same fix |
| 242 | `daily: dailyConsumption` | Store normalized + unit info |
| 641 | `l.daily.toFixed(1) ${l.unit}/d` | Use `smartConsumptionDisplay()` |

**Risk:** HIGH — affects PO creation, suggested quantities, urgency sorting, auto-check logic.
**Test:** Create PO as `owner@chai.com` → Whole Wheat Flour should show ~0.010 kg/d or 9.584 gm/d, Days Will Last ~3116d, Suggested Qty = 0.

---

### Component 3: `IngredientCatalogue.jsx` (P2 — display precision)

**Current flow (lines 78-87):**
```
consumption = consumptionMap[item.id] → { dailyQty: 9.584, unit: "gm" }
dailyConsumption = 9.584 gm/day
normalizeToDisplayUnit(9.584, "gm", "kg") = 0.009584 kg/day  ← CORRECT conversion
display: (0.009584).toFixed(1) → "0.0"  ← precision too low
```

**The conversion IS correct here.** Only the display precision needs fixing.

**Lines to modify:**
| Line | Current | Fix |
|:----:|---------|-----|
| 124 | `intel.dailyConsumption.toFixed(1) ${item.unit}/day` | Use `smartConsumptionDisplay()` with 3 decimals + Option A fallback |

**Also refactor:** Move `normalizeToDisplayUnit()` from here to `lib/formatters.js` (shared).

**Risk:** LOW — display-only change. Calculations already correct.
**Test:** Expand Whole Wheat Flour → Should show "9.584 gm/day" (Option A fallback) instead of "0.0 kg/day".

---

### Component 4: `DirectDispatchForm.jsx` (P1)

**Current broken flow (lines 124-157):**
```
parseFloat("134.18 gm") → 134.18 (unit LOST)
map[name] = 134.18 / 30 = 4.47  ← gm/day (but stored as bare number)
destQty = parseFloat(item.display_quantity) = 29.87  ← kg (display unit)
daysOfCover = 29.87 / 4.47 = 6.7  ← WRONG (kg ÷ gm)
projectedNeed = 4.47 * 7 = 31.3  ← WRONG (gm × days, subtracted from kg)
```

**Lines to modify:**
| Line | Current | Fix |
|:----:|---------|-----|
| 130 | `parseFloat(item.total_consumed)` | Use `parseConsumedQty()` to preserve unit |
| 131 | `map[name] = consumed / destConsumptionDays` | Store `{ dailyQty, unit }` |
| 145 | `destConsumptionMap[name]` (bare number) | Access `.dailyQty` + normalize to display unit |
| 157-158 | `daysOfCover = destQty / avgDaily` | Use normalized value |

**Risk:** MEDIUM — affects dispatch quantity suggestions.
**Test:** Select destination with consumption → dispatch suggestions should be reasonable.

---

### Component 5: `RequestStockForm.jsx` (P1)

**Identical pattern to DirectDispatchForm:**

**Lines to modify:**
| Line | Current | Fix |
|:----:|---------|-----|
| 139 | `parseFloat(item.total_consumed)` | Use `parseConsumedQty()` |
| 141 | `map[name] = consumed / consumptionDays` | Store `{ dailyQty, unit }` |
| 160 | `consumptionMap[name]` (bare number) | Access + normalize |
| 171 | `daysOfCover = currentStock / avgDaily` | Use normalized value |

**Risk:** MEDIUM — affects request quantity suggestions.
**Test:** Request Stock → coverage calculations should use correct units.

---

### Component 6: `useProductionRun.js` (P1 — data loss)

**Current broken flow (lines 112-118):**
```
item.total_consumed = "134.18 gm"  (STRING from stock_summary)
Number("134.18 gm") = NaN
NaN > 0 = false → item SKIPPED entirely
```

**Consumption data is completely lost for all items.**

**Lines to modify:**
| Line | Current | Fix |
|:----:|---------|-----|
| 114 | `Number(item.total_consumed \|\| item.total_qty \|\| 0)` | Use `parseConsumedQty()` → `{ value, unit }` |
| 115-116 | `if (id && totalConsumed > 0) consumptionMap[id] = totalConsumed / days` | Store `{ dailyQty, unit }` |

**Downstream:** `ProductionRunForm.jsx:147` reads `consumptionMap[fgId]` as bare number → also needs update.

**Risk:** MEDIUM — fixes a total data loss. Coverage estimates in production will start working.
**Test:** Run Production → should show coverage estimates for FG items.

---

### Component 7: `StockInventorySummary.jsx` (P2 — expanded row)

**Current flow (lines 591-633):**
```
consumption = item.consumption_summary  (from stock-inventory API with include_consumption)
dailyRate = consumption.total_consumed_cal / dateRangeDays
display: dailyRate.toFixed(1) ${item.display_unit}/day
```

**`total_consumed_cal`** — this field name suggests it's in `cal_quantity` scale (base unit, gm). If so, the display is wrong (gm value labeled as kg/day).

**Lines to modify:**
| Line | Current | Fix |
|:----:|---------|-----|
| 595 | `dailyRate = consumption.total_consumed_cal / dateRangeDays` | Normalize from cal scale to display scale |
| 633 | `dailyRate.toFixed(1) ${item.display_unit}/day` | Use `smartConsumptionDisplay()` |

**Risk:** LOW — display only. Calculation uses `calQty / dailyRate` which is consistent (both cal scale).
**Note:** daysOfCover calculation (line 597) is correct IF both values are in same scale.

**Test:** Expand item in Stock Inventory → daily rate should show correct unit.

---

### Component 8: `StockDetailPanel.jsx` (LOW IMPACT)

**Lines 511-529:** Uses `consumption_summary.total_consumed_cal` with `.toLocaleString()` (not `.toFixed(1)`).
**Lines 515-529:** Days of cover uses `current_stock_cal / (total_consumed_cal / 7)` — both in cal scale = consistent.

**Impact:** Minimal. Display uses `.toLocaleString()` which is more flexible than `.toFixed(1)`.
**Action:** May need label correction if `total_consumed_cal` is in gm but labeled as display unit.

---

## Risk Assessment Summary

| Component | Risk | Reason |
|-----------|:----:|--------|
| `lib/formatters.js` | LOW | New code, no existing logic modified |
| `PurchaseOrderCreate.jsx` | **HIGH** | Affects PO creation, order quantities, sorting |
| `IngredientCatalogue.jsx` | LOW | Display-only change, calculations already correct |
| `DirectDispatchForm.jsx` | MEDIUM | Affects dispatch suggestions |
| `RequestStockForm.jsx` | MEDIUM | Affects request suggestions |
| `useProductionRun.js` | MEDIUM | Fixes total data loss, enables coverage estimates |
| `StockInventorySummary.jsx` | LOW | Display change, calculation consistency preserved |
| `StockDetailPanel.jsx` | LOW | Minimal change, label only |

---

## Open Questions for Owner

1. **Display format for Option A fallback:** When value < 0.05 in display unit, show as:
   - (a) `"9.584 gm/day"` — always 3 decimals in fallback unit
   - (b) `"9.58 gm/day"` — 2 decimals in fallback unit
   - **Recommendation:** 3 decimals as owner specified

2. **PO Create — Below 14D Cover KPI:** Currently counts items where `daysOfCover < 14`. After fix, Whole Wheat Flour (3116d) will DROP from this count. This changes the KPI from 23 → lower. Is that expected? (Answer: Yes, it was incorrectly counted before.)

3. **G-020 relationship:** This fix handles gm↔kg and ml↔ltr conversions. Items with non-standard units (piece, pkt) won't be affected. Is that acceptable? (Answer: Yes, those items don't have sub-unit conversions.)

---

*Impact Analysis complete. 8 files, ~20 line-level changes. P0 critical path through PurchaseOrderCreate.jsx.*
*Next: Implementation Plan (Gate 3) or Gate 4 Owner GO.*
