# BUG-036 — Implementation Plan (Gate 3)

> **ID:** BUG-036
> **Title:** App-Wide Consumption Unit Mismatch
> **Code Reality:** PARTIAL — `normalizeToDisplayUnit()` exists locally in IngredientCatalogue only
> **Agent:** PLANNING
> **Date:** 2026-06-15

---

## Scope Lock

**Files WILL change:**
1. `frontend/src/lib/formatters.js` — add shared helpers
2. `frontend/src/components/central-inventory/PurchaseOrderCreate.jsx` — unit normalization
3. `frontend/src/components/central-inventory/IngredientCatalogue.jsx` — use shared helpers, fix display
4. `frontend/src/components/central-inventory/DirectDispatchForm.jsx` — parse unit, normalize
5. `frontend/src/components/central-inventory/RequestStockForm.jsx` — parse unit, normalize
6. `frontend/src/hooks/useProductionRun.js` — fix Number→parseFloat, store unit
7. `frontend/src/components/central-inventory/StockInventorySummary.jsx` — fix display
8. `frontend/src/components/central-inventory/ProductionRunForm.jsx` — handle object-format consumption

**Files will NOT touch:** `api.js`, `terminology.js`, `screenVisibility.js`, `server.py`, `App.js`, any frozen file.

---

## Execution Sequence

```
Step 1: formatters.js         (shared foundation — no dependencies)
Step 2: All 7 consumers       (parallel-safe — each imports from formatters.js)
```

---

## Edit 1: `frontend/src/lib/formatters.js` — Add 3 shared helpers

Append after line 84 (end of `formatItemsCount`):

```javascript
// BUG-036 — Consumption unit helpers

/**
 * Parse a consumed-quantity string like "134.18 gm" → { value: 134.18, unit: "gm" }
 * Handles bare numbers (returns unit "").
 */
export function parseConsumedQty(str) {
  if (!str) return { value: 0, unit: "" };
  if (typeof str === "number") return { value: str, unit: "" };
  const parts = String(str).trim().split(/\s+/);
  return { value: parseFloat(parts[0]) || 0, unit: parts[1] || "" };
}

/**
 * Convert between base unit (gm/ml) and display unit (kg/ltr).
 * Returns the original value if no conversion is known.
 */
export function normalizeToDisplayUnit(value, fromUnit, toUnit) {
  if (!fromUnit || !toUnit || fromUnit === toUnit) return value;
  const f = fromUnit.toLowerCase();
  const t = toUnit.toLowerCase();
  if (f === "gm" && t === "kg") return value / 1000;
  if (f === "kg" && t === "gm") return value * 1000;
  if (f === "ml" && t === "ltr") return value / 1000;
  if (f === "ltr" && t === "ml") return value * 1000;
  return value;
}

/**
 * Format consumption for display: 3 decimals, Option A fallback.
 * If value < 0.05 in displayUnit, show in consumptionUnit instead.
 * Returns { text: "9.584 gm/day", value: 9.584, unit: "gm" } or null if zero.
 */
export function smartConsumptionDisplay(dailyQty, consumptionUnit, displayUnit) {
  if (!dailyQty || dailyQty <= 0) return null;
  const converted = normalizeToDisplayUnit(dailyQty, consumptionUnit, displayUnit);
  if (converted < 0.05 && consumptionUnit && displayUnit && consumptionUnit.toLowerCase() !== displayUnit.toLowerCase()) {
    return { text: `${dailyQty.toFixed(3)} ${consumptionUnit}/day`, value: dailyQty, unit: consumptionUnit };
  }
  return { text: `${converted.toFixed(3)} ${displayUnit || consumptionUnit}/day`, value: converted, unit: displayUnit || consumptionUnit };
}
```

**Verification:** `import { parseConsumedQty, normalizeToDisplayUnit, smartConsumptionDisplay } from "@/lib/formatters"` compiles.

---

## Edit 2: `PurchaseOrderCreate.jsx` — Unit normalization in both modes (**P0 CRITICAL**)

### Edit 2a: Add import (line 1 area)

After the existing imports, add:
```javascript
import { normalizeToDisplayUnit, smartConsumptionDisplay } from "@/lib/formatters";
```

### Edit 2b: By Vendor mode — normalize consumption (lines 167-172)

**Current code (lines 167-172):**
```javascript
      // BUG-030: Use real consumption from daily-consumption-report, display_qty for stock
      const cData = consumptionMap[item.id] || consumptionMap[`name:${(item.stock_title || "").toLowerCase().trim()}`];
      const dailyConsumption = cData ? cData.dailyQty : 0;

      const currentQty = Number(item.display_qty) || 0; // BUG-030: display_qty not cal_quantity
      const daysOfCover = dailyConsumption > 0 ? Math.floor(currentQty / dailyConsumption) : null;
```

**New code:**
```javascript
      // BUG-030: Use real consumption from daily-consumption-report, display_qty for stock
      // BUG-036: Normalize consumption unit (gm→kg) before calculations
      const cData = consumptionMap[item.id] || consumptionMap[`name:${(item.stock_title || "").toLowerCase().trim()}`];
      const rawDaily = cData ? cData.dailyQty : 0;
      const dailyConsumption = rawDaily > 0 ? normalizeToDisplayUnit(rawDaily, cData?.unit || "", item.unit || "") : 0;

      const currentQty = Number(item.display_qty) || 0; // BUG-030: display_qty not cal_quantity
      const daysOfCover = dailyConsumption > 0 ? Math.floor(currentQty / dailyConsumption) : null;
```

### Edit 2c: By Vendor mode — fix suggested qty (lines 183-184)

No change needed — `dailyConsumption` is now already normalized, so `TARGET_DAYS * dailyConsumption - currentQty` will be in correct units.

### Edit 2d: By Item Need mode — normalize consumption (lines 221-224)

**Current code (lines 221-224):**
```javascript
      // BUG-030: Use real consumption from daily-consumption-report
      const cData = consumptionMap[item.id] || consumptionMap[`name:${(item.stock_title || "").toLowerCase().trim()}`];
      const dailyConsumption = cData ? cData.dailyQty : 0;
      const daysOfCover = dailyConsumption > 0 ? Math.floor(qty / dailyConsumption) : null;
```

**New code:**
```javascript
      // BUG-030: Use real consumption from daily-consumption-report
      // BUG-036: Normalize consumption unit (gm→kg) before calculations
      const cData = consumptionMap[item.id] || consumptionMap[`name:${(item.stock_title || "").toLowerCase().trim()}`];
      const rawDaily = cData ? cData.dailyQty : 0;
      const dailyConsumption = rawDaily > 0 ? normalizeToDisplayUnit(rawDaily, cData?.unit || "", item.unit || "") : 0;
      const daysOfCover = dailyConsumption > 0 ? Math.floor(qty / dailyConsumption) : null;
```

### Edit 2e: By Item Need mode — store display info for table (line 242)

**Current code (line 242):**
```javascript
        current_qty: qty, daily: dailyConsumption, daysOfCover, isLow, isEmpty, urgency,
```

**New code:**
```javascript
        current_qty: qty, daily: dailyConsumption, dailyRaw: rawDaily, dailyUnit: cData?.unit || "", daysOfCover, isLow, isEmpty, urgency,
```

### Edit 2f: By Item Need display — smart consumption display (line 641)

**Current code (line 641):**
```javascript
                    <TableCell className="py-1.5 text-xs text-right tabular-nums text-muted-foreground">{l.daily > 0 ? `${l.daily.toFixed(1)} ${l.unit}/d` : "\u2014"}</TableCell>
```

**New code:**
```javascript
                    <TableCell className="py-1.5 text-xs text-right tabular-nums text-muted-foreground">{l.daily > 0 ? (smartConsumptionDisplay(l.dailyRaw, l.dailyUnit, l.unit)?.text || `${l.daily.toFixed(3)} ${l.unit}/d`) : "\u2014"}</TableCell>
```

**Verification:** Login as `owner@chai.com` → PO Create → By Item Need → Whole Wheat Flour should show ~"9.584 gm/d" (Option A fallback), Days Will Last ~3116d, suggested qty ~0.

---

## Edit 3: `IngredientCatalogue.jsx` — Use shared helpers, fix display

### Edit 3a: Add import (top of file, after existing imports)

```javascript
import { normalizeToDisplayUnit, smartConsumptionDisplay } from "@/lib/formatters";
```

### Edit 3b: Remove local `normalizeToDisplayUnit` (lines 56-66)

**Delete lines 56-66** (the local function). It's now imported from formatters.js.

### Edit 3c: Fix display precision (line 124)

**Current code (line 124):**
```javascript
            {intel.dailyConsumption > 0 ? `${intel.dailyConsumption.toFixed(1)} ${item.unit || ""}/day` : "\u2014"}
```

**New code:**
```javascript
            {intel.dailyConsumption > 0 ? (smartConsumptionDisplay(intel.dailyConsumptionRaw, intel.consumptionUnit, item.unit || "")?.text || `${intel.dailyConsumption.toFixed(3)} ${item.unit || ""}/day`) : "\u2014"}
```

### Edit 3d: Pass raw values through intel (lines 104)

**Current code (line 104):**
```javascript
    return { avgRate, dailyConsumption: dailyInDisplayUnit, daysOfStock, vendorRates, maxRate };
```

**New code:**
```javascript
    return { avgRate, dailyConsumption: dailyInDisplayUnit, dailyConsumptionRaw: dailyConsumption, consumptionUnit: consumptionUnit, daysOfStock, vendorRates, maxRate };
```

**Verification:** Login as `owner@chai.com` → Raw Material Master → Expand Whole Wheat Flour → Should show "9.584 gm/day" (not "0.0 kg/day"), Days of Stock = 3116d.

---

## Edit 4: `DirectDispatchForm.jsx` — Parse unit, normalize

### Edit 4a: Add import

```javascript
import { parseConsumedQty, normalizeToDisplayUnit } from "@/lib/formatters";
```

### Edit 4b: Fix consumption map building (lines 128-131)

**Current code (lines 128-131):**
```javascript
    destConsumption.forEach(item => {
      const name = (item.ingredient_name || "").toLowerCase();
      const consumed = parseFloat(item.total_consumed) || 0;
      if (name && consumed > 0) map[name] = consumed / destConsumptionDays;
    });
```

**New code:**
```javascript
    // BUG-036: Parse unit from total_consumed string, store { dailyQty, unit }
    destConsumption.forEach(item => {
      const name = (item.ingredient_name || "").toLowerCase();
      const parsed = parseConsumedQty(item.total_consumed);
      if (name && parsed.value > 0) map[name] = { dailyQty: parsed.value / destConsumptionDays, unit: parsed.unit };
    });
```

### Edit 4c: Fix consumption usage in calculations (lines 145, 156-158)

**Current code (line 145):**
```javascript
      const avgDaily = destConsumptionMap[name] || 0;
```

**New code:**
```javascript
      // BUG-036: Normalize consumption to item's display unit before calculation
      const cEntry = destConsumptionMap[name];
      const avgDaily = cEntry ? normalizeToDisplayUnit(cEntry.dailyQty, cEntry.unit, item.unit || ownItem?.display_unit || "") : 0;
```

**Verification:** Select destination store → dispatch suggestions should show reasonable quantities.

---

## Edit 5: `RequestStockForm.jsx` — Parse unit, normalize

### Edit 5a: Add import

```javascript
import { parseConsumedQty, normalizeToDisplayUnit } from "@/lib/formatters";
```

### Edit 5b: Fix consumption map building (lines 137-142)

**Current code (lines 137-142):**
```javascript
    consumption.forEach(item => {
      const name = (item.ingredient_name || "").toLowerCase();
      const consumed = parseFloat(item.total_consumed) || 0;
      if (name && consumed > 0) {
        map[name] = consumed / consumptionDays;
      }
    });
```

**New code:**
```javascript
    // BUG-036: Parse unit from total_consumed string, store { dailyQty, unit }
    consumption.forEach(item => {
      const name = (item.ingredient_name || "").toLowerCase();
      const parsed = parseConsumedQty(item.total_consumed);
      if (name && parsed.value > 0) {
        map[name] = { dailyQty: parsed.value / consumptionDays, unit: parsed.unit };
      }
    });
```

### Edit 5c: Fix consumption usage (line 160)

**Current code (line 160):**
```javascript
      const avgDaily = consumptionMap[name] || 0;
```

**New code:**
```javascript
      // BUG-036: Normalize consumption to item's display unit
      const cEntry = consumptionMap[name];
      const avgDaily = cEntry ? normalizeToDisplayUnit(cEntry.dailyQty, cEntry.unit, item.display_unit || catalogItem?.unit || "") : 0;
```

**Verification:** Request Stock → coverage calculations use correct units.

---

## Edit 6: `useProductionRun.js` — Fix Number→parseFloat, store unit

### Edit 6a: Add import (top of file)

```javascript
import { parseConsumedQty } from "@/lib/formatters";
```

### Edit 6b: Fix consumption parsing (lines 112-118)

**Current code (lines 112-118):**
```javascript
    for (const item of details) {
      const id = item.inventory_master_id || item.id;
      const totalConsumed = Number(item.total_consumed || item.total_qty || 0);
      if (id && totalConsumed > 0) {
        consumptionMap[id] = totalConsumed / days;
      }
    }
```

**New code:**
```javascript
    // BUG-036: Use parseConsumedQty to handle "134.18 gm" strings (Number() returns NaN)
    for (const item of details) {
      const id = item.inventory_master_id || item.id;
      const parsed = parseConsumedQty(item.total_consumed || item.total_qty);
      if (id && parsed.value > 0) {
        consumptionMap[id] = { dailyQty: parsed.value / days, unit: parsed.unit };
      }
    }
```

**Verification:** Production Run → coverage estimates should now appear for FG items.

---

## Edit 7: `ProductionRunForm.jsx` — Handle object-format consumptionMap

### Edit 7a: Add import

```javascript
import { normalizeToDisplayUnit } from "@/lib/formatters";
```

### Edit 7b: Fix coverage estimate (lines 147-152)

**Current code (lines 147-152):**
```javascript
    const dailyConsumption = consumptionMap[fgId];
    if (!dailyConsumption || dailyConsumption <= 0) return null;
    const currentStock = Number(stockMap[fgId]?.cal_quantity) || 0;
    const coverageDays = Math.round((currentStock + totalQty) / dailyConsumption);
    const outletCount = hierarchyStores.length || 0;
    return { coverageDays, dailyConsumption: Math.round(dailyConsumption), currentStock, outletCount };
```

**New code:**
```javascript
    // BUG-036: consumptionMap now stores { dailyQty, unit } objects
    const cEntry = consumptionMap[fgId];
    if (!cEntry || !cEntry.dailyQty || cEntry.dailyQty <= 0) return null;
    const currentStock = Number(stockMap[fgId]?.cal_quantity) || 0;
    // Normalize consumption to cal_quantity scale for consistent division
    const dailyInCalScale = normalizeToDisplayUnit(cEntry.dailyQty, cEntry.unit, "gm");
    const coverageDays = Math.round((currentStock + totalQty) / dailyInCalScale);
    const outletCount = hierarchyStores.length || 0;
    return { coverageDays, dailyConsumption: Math.round(dailyInCalScale), currentStock, outletCount };
```

**Verification:** Run Production → select recipe with FG consumption data → coverage estimate appears.

---

## Edit 8: `StockInventorySummary.jsx` — Fix expanded row display

### Edit 8a: Add import

```javascript
import { smartConsumptionDisplay } from "@/lib/formatters";
```

### Edit 8b: Fix daily rate display (line 633)

**Current code (line 633):**
```javascript
            <div><span className="text-[10px] text-muted-foreground block">Daily Rate</span><span className="font-semibold tabular-nums">{dailyRate > 0 ? `${dailyRate.toFixed(1)} ${item.display_unit}/day` : "—"}</span></div>
```

**New code:**
```javascript
            <div><span className="text-[10px] text-muted-foreground block">Daily Rate</span><span className="font-semibold tabular-nums">{dailyRate > 0 ? `${dailyRate.toFixed(3)} ${item.display_unit}/day` : "—"}</span></div>
```

### Edit 8c: Fix 7-Day Total display (line 634)

**Current code (line 634):**
```javascript
            <div><span className="text-[10px] text-muted-foreground block">7-Day Total</span><span className="font-semibold tabular-nums">{consumption.total_consumed_cal > 0 ? `${Number(consumption.total_consumed_cal).toFixed(1)} ${item.display_unit}` : "—"}</span></div>
```

**New code:**
```javascript
            <div><span className="text-[10px] text-muted-foreground block">7-Day Total</span><span className="font-semibold tabular-nums">{consumption.total_consumed_cal > 0 ? `${Number(consumption.total_consumed_cal).toFixed(3)} ${item.display_unit}` : "—"}</span></div>
```

**Note:** `total_consumed_cal` and `calQty` are both in cal_quantity scale → daysOfCover calculation (line 597) remains correct. Only display precision changes.

**Verification:** Expand item in Stock Inventory → Daily Rate shows 3 decimal precision.

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Auto? |
|:------:|------|--------|---------------|:-----:|
| 1 | formatters.js | Add 3 helpers | Import compiles, unit test | NO |
| 2b | PurchaseOrderCreate.jsx | By Vendor normalize | Login chai → PO Create → By Vendor → select vendor → Whole Wheat Flour DoC ~3116d | NO |
| 2d-f | PurchaseOrderCreate.jsx | By Item Need normalize + display | Login chai → By Item Need → Whole Wheat Flour: ~9.584 gm/d, ~3116d, qty ~0 | NO |
| 3b-d | IngredientCatalogue.jsx | Shared helpers + display | Login chai → Raw Materials → Expand Whole Wheat Flour → "9.584 gm/day" | NO |
| 4b-c | DirectDispatchForm.jsx | Parse unit + normalize | Login chai → Dispatch → select dest → verify reasonable suggestions | NO |
| 5b-c | RequestStockForm.jsx | Parse unit + normalize | Login chai → Request Stock → verify reasonable suggestions | NO |
| 6b | useProductionRun.js | parseFloat fix | Login chai → Run Production → coverage estimates appear | NO |
| 7b | ProductionRunForm.jsx | Object-format consumption | Login chai → Run Production → select recipe → coverage shows | NO |
| 8b-c | StockInventorySummary.jsx | Display precision | Login chai → RM Stock → expand item → 3 decimal rate | NO |

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| Breaking existing IngredientCatalogue by removing local `normalizeToDisplayUnit` | Import from shared formatters.js replaces exact same function |
| PO Create urgency sorting changes (items re-ordered) | Expected and correct — items were sorted on wrong DoC values before |
| ProductionRunForm breaks if consumptionMap format changes | Defensive check: `cEntry.dailyQty` with fallback |
| DirectDispatch/RequestStock `total_consumed` not always a string | `parseConsumedQty` handles both numbers and strings |

---

## Post-Code Registry Checklist (for IMPLEMENTATION agent)

```
- [ ] registry.json: BUG-036 → status: IMPLEMENTED, artifact_refs updated
- [ ] L4: BUG-036 row status updated
- [ ] L7: every created/modified file listed for BUG-036
- [ ] Code markers: // BUG-036 comment in every modified file
- [ ] Dashboard drift check: node control/gen_dashboard_data.js --check → PASS
```

---

*Implementation Plan complete. 8 edits across 8 files. P0 critical path through PurchaseOrderCreate.jsx.*
*Awaiting Gate 4: Owner GO.*
