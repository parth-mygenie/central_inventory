# INVESTIGATION REPORT — Consumption Display & Unit Mismatch

> **Agent Role:** INVESTIGATION
> **Date:** 2026-06-15
> **Scope:** App-wide audit of consumption display precision and unit handling
> **Triggered by:** "Whole Wheat Flour" shows Consumption 0.0 kg/day in Raw Material Master (owner@chai.com)

---

## Executive Summary

**3 distinct bug classes** found across **8 files**, affecting **6 screens**. The most critical is a **unit mismatch** in PO Create that causes order quantities to be **~1000x inflated** (e.g., suggests ordering 258 kg when 0.14 kg is needed).

---

## Root Cause: API Returns Consumption in Base Unit (gm), Frontend Displays in Display Unit (kg)

The POS API `daily-consumption-report` returns `quantity_deducted` as strings like `"8.57 gm"`. The `stock_summary` returns `total_consumed` as strings like `"134.18 gm"`.

Meanwhile, stock inventory shows items in display units: `display_qty = "29.87"`, `unit = "kg"`.

**The consumed quantity is ALWAYS in gm (base unit), but stock is in kg (display unit).** Multiple components fail to convert between these.

---

## Curl Evidence (owner@chai.com / Whole Wheat Flour / id=17772)

```
Stock Inventory:     id=17772, display_qty="29.87", unit="kg", cal_quantity="29865.84"
Consumption Report:  ingredient_id=17772, 16 entries totaling 134.18 gm over 14 days
                     Daily rate = 9.584 gm/day = 0.00958 kg/day
Stock Summary:       total_consumed="134.18 gm" (STRING with unit suffix)
```

---

## BUG CLASS 1: Display Precision (`.toFixed(1)` truncation)

When consumption is correctly converted from gm to kg, small values round to "0.0".

| # | File:Line | Display Code | Actual Value | Shows As |
|---|-----------|-------------|:--------:|:--------:|
| 1a | **IngredientCatalogue.jsx:124** | `intel.dailyConsumption.toFixed(1) ${item.unit}/day` | 0.00958 kg/day | **"0.0 kg/day"** |
| 1b | **StockInventorySummary.jsx:633** | `dailyRate.toFixed(1) ${item.display_unit}/day` | (potential small values) | **"0.0 kg/day"** |

**Note:** IngredientCatalogue is the ONLY component that correctly normalizes units (via `normalizeToDisplayUnit`). The bug here is purely display precision.

**Fix (Option A with 3 decimal fallback):**
```javascript
// If value < 0.05 in display unit, show in consumption unit instead
if (value > 0 && value < 0.05) {
  // Reverse-convert to original unit and show: "9.584 gm/day"
} else {
  // Show with 3 decimals: "1.234 kg/day"
}
```

---

## BUG CLASS 2: Unit Mismatch — gm Value with kg Label (CRITICAL)

Consumption rate in gm/day is displayed with the item's display unit label (kg), AND used in calculations against display_qty (kg) without conversion.

### PurchaseOrderCreate.jsx — By Item Need Mode

| # | File:Line | Code | Bug | Impact |
|---|-----------|------|-----|--------|
| 2a | **:641** | `l.daily.toFixed(1) ${l.unit}/d` | Shows gm value labeled as kg | "9.6 kg/d" instead of "9.6 gm/d" |
| 2b | **:224** | `daysOfCover = Math.floor(qty / dailyConsumption)` | divides kg by gm/day | Shows "3d" instead of "3116d" |
| 2c | **:232** | `Math.ceil(TARGET_DAYS * dailyConsumption - qty)` | multiplies gm/day × 30 days then subtracts kg | Suggests 258 kg instead of ~0.14 kg |

**Screenshot proof:** Whole Wheat Flour row:
- Stock: 29.87 kg
- Daily Consumption: **9.6 kg/d** ← WRONG (is 9.6 gm/d)
- Days Will Last: **3d** ← WRONG (is 3,116d)
- Suggested Qty: **258** ← WRONG (should be ~0)

**This causes PO #1 to include "Whole Wheat Flour 258 kg @ ₹45 = ₹11,610"** — a 1000x over-order.

### PurchaseOrderCreate.jsx — By Vendor Mode (same bugs)

| # | File:Line | Code | Bug |
|---|-----------|------|-----|
| 2d | **:169** | `dailyConsumption = cData.dailyQty` | gm/day stored raw |
| 2e | **:172** | `daysOfCover = Math.floor(currentQty / dailyConsumption)` | kg / gm mismatch |
| 2f | **:184** | `Math.ceil(TARGET_DAYS * dailyConsumption - currentQty)` | mixed units |

**Fix:** Add `normalizeToDisplayUnit()` (from IngredientCatalogue) to convert `cData.dailyQty` from consumption unit (`cData.unit`) to item's display unit before all calculations.

---

## BUG CLASS 3: Unit Stripping + `Number()` NaN

API returns `total_consumed` as string "134.18 gm". Some components use `parseFloat()` (gets 134.18 but loses unit), others use `Number()` (gets NaN = data lost).

### DirectDispatchForm.jsx

| # | File:Line | Code | Bug |
|---|-----------|------|-----|
| 3a | **:130** | `parseFloat(item.total_consumed)` | Parses "134.18 gm" → 134.18 (unit lost) |
| 3b | **:131** | `map[name] = consumed / destConsumptionDays` | Rate in gm/day, keyed by name |
| 3c | **:157** | `daysOfCover = destQty / avgDaily` | `destQty` in display_qty (kg), `avgDaily` in gm → wrong |

### RequestStockForm.jsx

| # | File:Line | Code | Bug |
|---|-----------|------|-----|
| 3d | **:139-141** | `parseFloat(item.total_consumed)` + `/consumptionDays` | Same unit stripping |
| 3e | **:171** | `daysOfCover = currentStock / avgDaily` | Same kg / gm mismatch |

### useProductionRun.js (TOTAL DATA LOSS)

| # | File:Line | Code | Bug |
|---|-----------|------|-----|
| 3f | **:114** | `Number(item.total_consumed \|\| item.total_qty \|\| 0)` | `Number("134.18 gm")` = **NaN** |
| 3g | **:115** | `if (id && totalConsumed > 0)` | NaN > 0 = false → **item skipped entirely** |

**Impact:** ProductionRunForm NEVER gets consumption data from `stock_summary` entries with string-format `total_consumed`. Coverage estimates for all FG items are broken.

**Fix:** Replace `Number()` with `parseFloat()` AND preserve the unit for downstream conversion.

---

## BUG CLASS 4: StockInventorySummary Expanded Row — Ambiguous Unit Scale

| # | File:Line | Code | Concern |
|---|-----------|------|---------|
| 4a | **:595** | `dailyRate = consumption.total_consumed_cal / dateRangeDays` | `total_consumed_cal` is in cal_quantity scale |
| 4b | **:633** | `dailyRate.toFixed(1) ${item.display_unit}/day` | Labels as display_unit but value may be in cal scale |

**Depends on:** Whether `consumption_summary.total_consumed_cal` from the API is in cal_quantity scale (gm) or display_qty scale (kg). If cal_quantity scale → same label mismatch as Bug Class 2.

---

## Affected Screens Summary

| Screen | Route | Severity | Bug Class | Visible Symptom |
|--------|-------|:--------:|:---------:|-----------------|
| **Raw Material Master** | `/raw-materials` | P2 | 1 (precision) | "0.0 kg/day" for small consumers |
| **PO Create (By Item Need)** | `/purchase/orders/new` | **P0** | 2 (unit mismatch) | Wrong daily rate, wrong DoC, **1000x over-order** |
| **PO Create (By Vendor)** | `/purchase/orders/new` | **P0** | 2 (unit mismatch) | Wrong DoC badges, wrong suggested qty |
| **Direct Dispatch** | `/dispatch/new` | P1 | 3 (unit strip) | Wrong dispatch qty suggestions |
| **Request Stock** | `/request/new` | P1 | 3 (unit strip) | Wrong order qty suggestions |
| **Run Production** | `/production/new` | P1 | 3 (Number NaN) | Coverage estimates missing entirely |
| **Stock Inventory (expanded)** | `/inventory` | P2 | 4 (ambiguous) | Potentially wrong daily rate label |
| **Daily Consumption Report** | `/reports/consumption` | OK | — | Displays raw API strings — no conversion issue |

---

## Recommended Fix Strategy

### Shared Helper: `smartConsumptionDisplay(value, fromUnit, toUnit, precision = 3)`

Create a centralized helper in `lib/formatters.js`:

```javascript
/**
 * Format consumption value with Option A fallback.
 * If value < 0.05 in target unit, fall back to source unit.
 * Always use 3 decimal places.
 */
function smartConsumptionDisplay(value, fromUnit, toUnit) {
  if (!value || value <= 0) return null;
  const converted = normalizeToDisplayUnit(value, fromUnit, toUnit);
  if (converted < 0.05 && fromUnit !== toUnit) {
    // Fallback: show in original (smaller) unit
    return { display: value.toFixed(3), unit: fromUnit };
  }
  return { display: converted.toFixed(3), unit: toUnit };
}
```

### Fix Priority Order

1. **P0 — PurchaseOrderCreate.jsx** (2a-2f): Add unit normalization to `dailyConsumption` before ALL calculations (daysOfCover, suggestedQty, display). This prevents 1000x over-ordering.

2. **P1 — useProductionRun.js** (3f-3g): Replace `Number()` with `parseFloat()`. Add unit preservation.

3. **P1 — DirectDispatchForm.jsx** (3a-3c): Parse unit from `total_consumed` string. Normalize before `daysOfCover` calculation.

4. **P1 — RequestStockForm.jsx** (3d-3e): Same as DirectDispatchForm.

5. **P2 — IngredientCatalogue.jsx** (1a): Apply `smartConsumptionDisplay()` with 3 decimal precision and Option A fallback.

6. **P2 — StockInventorySummary.jsx** (4a-4b): Verify `total_consumed_cal` unit scale. Apply matching display logic.

### Files to Modify (8 files)

| File | Changes |
|------|---------|
| `frontend/src/lib/formatters.js` | Add `smartConsumptionDisplay()`, `parseConsumedQty()`, `normalizeToDisplayUnit()` |
| `frontend/src/components/central-inventory/PurchaseOrderCreate.jsx` | Normalize consumption unit in both modes (lines 168-184, 222-232, 641) |
| `frontend/src/components/central-inventory/IngredientCatalogue.jsx` | Use `smartConsumptionDisplay` at line 124, increase precision to 3 |
| `frontend/src/components/central-inventory/DirectDispatchForm.jsx` | Parse unit from `total_consumed`, normalize before calculations (lines 130, 157) |
| `frontend/src/components/central-inventory/RequestStockForm.jsx` | Same as DirectDispatchForm (lines 139, 171) |
| `frontend/src/hooks/useProductionRun.js` | Replace `Number()` with `parseFloat()`, preserve unit (line 114) |
| `frontend/src/components/central-inventory/StockInventorySummary.jsx` | Verify unit scale, apply display formatter (line 633) |

---

## Root Cause Classification

| Category | Action |
|----------|--------|
| **Frontend bug — unit handling** | Systematic failure to convert between API base unit (gm/ml) and display unit (kg/ltr) |
| **Scope** | 8 files, 6 screens, ~15 affected code locations |
| **Risk** | P0 for PO Create (financial impact — over-ordering); P1 for dispatch/request/production (operational); P2 for display-only |

---

## Next Step

→ Hand to **PLANNING** agent for Gate 2 Impact Analysis + Gate 3 Implementation Plan, covering all 8 files with exact line-level edits.

OR → If owner approves expedited fix: directly to **IMPLEMENTATION** with this report as the plan.

---

*Investigation complete. 4 bug classes, 8 files, 6 screens. P0 urgency for PO Create unit mismatch causing 1000x over-ordering.*
