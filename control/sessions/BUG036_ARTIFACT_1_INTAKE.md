# BUG-036 — Intake

> **ID:** BUG-036
> **Title:** App-Wide Consumption Unit Mismatch — gm values displayed/calculated as kg (causes 1000x over-ordering in PO Create)
> **Date:** 2026-06-15
> **Reporter:** Owner (screenshot: Whole Wheat Flour 0.0 kg/day in Raw Material Master)
> **Agent:** INTAKE + INVESTIGATION

---

## Classification

| Field | Value |
|-------|-------|
| **Severity** | **P0 — CRITICAL** (PO Create generates 1000x inflated order quantities; affects financial operations) |
| **Category** | Frontend bug — unit handling |
| **Sprint** | S3 |
| **Source** | OWNER-REPORTED + AGENT-DISCOVERED (full investigation) |
| **Confidence** | CONFIRMED (curl-probed API, traced code, screenshot-verified) |

**Severity rationale:** The PO Create unit mismatch causes `Whole Wheat Flour` to suggest ordering **258 kg** when actual need is **~0.14 kg** — a 1000x over-order. This directly impacts purchase operations. The same class of bug affects Dispatch, Request Stock, and Production screens — all operational flows.

---

## Duplicate Check

| Check | Result |
|-------|--------|
| **BUG-029** (Consumption 0.0 fix) | **RELATED** — BUG-029 fixed ingredient_id join mismatch. This bug is about unit conversion AFTER join succeeds. |
| **BUG-030** (PO Create residual) | **RELATED** — BUG-030 fixed display_qty vs cal_quantity and added consumption API. But did NOT add unit normalization between gm→kg. |
| **G-020** (Custom unit conversion gap) | **RELATED** — Open gap acknowledging POS backend unit conversion needed. This bug is the frontend manifestation. |

**Classification: DISTINCT** — BUG-029/030 fixed data joining and value source; this bug is about the UNIT CONVERSION between consumption API's base unit (gm/ml) and inventory's display unit (kg/ltr), which was never addressed.

---

## Code Reality

**PARTIAL** — One component (`IngredientCatalogue.jsx`) has a local `normalizeToDisplayUnit()` function (added in BUG-029). But:
- It is NOT shared/exported to other components
- 7 other components lack any unit normalization
- `PurchaseOrderCreate.jsx` was modified in BUG-030 to use consumption data but unit conversion was NOT added
- `useProductionRun.js` uses `Number()` instead of `parseFloat()`, causing total data loss for string-format `total_consumed`

---

## Evidence

### Screenshot (owner-provided)
- **Raw Material Master** (`/raw-materials`, logged in as `owner@chai.com`):
  - Whole Wheat Flour expanded → Consumption: **0.0 kg/day**, Days of Stock: **3116d**

### Screenshot (agent-captured)
- **PO Create** (`/purchase/orders/new`, By Item Need mode, `owner@chai.com`):
  - Whole Wheat Flour → Daily Consumption: **9.6 kg/d** (WRONG — actual is 9.6 gm/d)
  - Days Will Last: **3d** (WRONG — actual is 3,116d)
  - Suggested Qty: **258** (WRONG — should be ~0)

### Curl Evidence
```
Stock Inventory API: Whole Wheat Flour id=17772, display_qty="29.87", unit="kg", cal_quantity="29865.84"
Consumption API:     ingredient_id=17772, 16 entries totaling 134.18 gm over 14 days
                     quantity_deducted = "8.57 gm" (STRING with unit suffix)
Stock Summary:       total_consumed = "134.18 gm" (STRING with unit suffix)

Correct daily rate:  134.18 gm / 14 days = 9.584 gm/day = 0.00958 kg/day
```

### Steps to Reproduce
1. Login as `owner@chai.com` / `Qplazm@10`
2. Navigate to `/raw-materials` → Expand "Whole Wheat Flour" → See "0.0 kg/day"
3. Navigate to `/purchase/orders/new` → "By Item Need" → See "9.6 kg/d" and "3d" for Whole Wheat Flour
4. Observe suggested qty = 258 kg (should be ~0)

---

## Blast Radius

- **Files affected:** 8 component files + 1 hook = **9 files**
- **Lines referencing patterns:** ~84 (toFixed + consumption + dailyRate + total_consumed)
- **Hotspot files touched:** YES — `PurchaseOrderCreate.jsx`, `DirectDispatchForm.jsx`, `RequestStockForm.jsx`, `IngredientCatalogue.jsx`, `StockInventorySummary.jsx`, `ProductionRunForm.jsx`, `useProductionRun.js`, `StockDetailPanel.jsx`
- **Estimated scope:** **LARGE (8+ files)**
- **Screens affected:** Raw Material Master, PO Create (both modes), Direct Dispatch, Request Stock, Run Production, Stock Inventory (expanded)

---

## 4 Bug Sub-Classes Identified

| Class | Description | Files | Severity |
|:-----:|-------------|-------|:--------:|
| **1** | Display precision — `.toFixed(1)` truncates small kg values to "0.0" | IngredientCatalogue.jsx, StockInventorySummary.jsx | P2 |
| **2** | Unit mismatch — gm value used in kg calculations and displayed with kg label | PurchaseOrderCreate.jsx (both modes) | **P0** |
| **3** | Unit stripping — `parseFloat()` loses unit; `Number()` returns NaN | DirectDispatchForm.jsx, RequestStockForm.jsx, useProductionRun.js | P1 |
| **4** | Ambiguous unit scale in expanded row consumption | StockInventorySummary.jsx | P2 |

---

## Open Questions for Owner

1. **Precision:** Investigation recommends 3 decimal places with Option A fallback (show in gm when kg rounds to < 0.05). Owner confirmed. No further decision needed.
2. **Shared helper location:** Should `normalizeToDisplayUnit` + `smartConsumptionDisplay` live in `lib/formatters.js` (shared) or stay per-component? Recommend `lib/formatters.js`.
3. **G-020 scope:** This fix is frontend-only (convert between known gm↔kg, ml↔ltr pairs). The backend G-020 gap for custom unit conversion remains open for edge cases.

---

## Related Items

| Item | Relationship |
|------|-------------|
| BUG-029 | Fixed ingredient_id join; consumption now reaches components. This bug is AFTER the join. |
| BUG-030 | Added consumption API to PO Create; fixed display_qty. But no unit normalization. |
| G-020 | Backend gap for custom unit conversion. This bug is frontend-solvable for gm↔kg, ml↔ltr. |

---

*Intake complete. Next: Impact Analysis (Gate 2) → Implementation Plan (Gate 3).*
