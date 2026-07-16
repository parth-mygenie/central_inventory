# Impact Analysis — BUG-029 through BUG-035

> **Gate:** 2 (Impact Analysis)
> **Agent Role:** PLANNING
> **Date:** 2026-06-15
> **Sprint:** S3

---

## Scope Overview

7 bugs, 7 files targeted. All in Sprint S3. No frozen file changes required.

| Bug | Severity | Files | Sub-issues |
|-----|:--------:|:-----:|:----------:|
| BUG-029 | HIGH | 1 | 1 |
| BUG-030 | HIGH | 1 | 6 |
| BUG-031 | MEDIUM | 1 | 2 |
| BUG-032 | HIGH | 1 | 3 |
| BUG-033 | MEDIUM | 3 | 2 |
| BUG-034 | MEDIUM | 1 | 1 |
| BUG-035 | MEDIUM | 1 | 2 |

---

## Code Reality Check

All 7 bugs: **Code Reality = NONE** — no fix code exists yet. All are confirmed present in current codebase.

---

## Conflict Pre-Check

| File | Bugs Touching | Conflict? |
|------|:---:|:---:|
| `IngredientCatalogue.jsx` | BUG-029 | NO — isolated function |
| `PurchaseOrderCreate.jsx` | BUG-030 | NO — isolated to this bug |
| `StockInventorySummary.jsx` | BUG-031, BUG-032, BUG-033 | SHARED — execute in order 031→032→033 |
| `DirectDispatchForm.jsx` | BUG-033 | NO |
| `WastageEntryForm.jsx` | BUG-033 | NO |
| `SubRecipeMaster.jsx` | BUG-034 | NO |
| `ProductionHistory.jsx` | BUG-035 | NO |

**L7 frozen file check:** None of the target files are frozen. `screenVisibility.js` and `terminology.js` are NOT touched.

---

## BUG-029: Consumption still 0.0 — ingredient_id join mismatch

### Root Cause

`IngredientCatalogue.jsx` line 421 builds `consumptionMap` keyed by `ingredient_id` from the `daily-consumption-report` API. But the intelligence panel at line 79 looks up `consumptionMap[item.id]` where `item.id` is the `inventory_master_id` from `stock-inventory` API. These IDs are different — the two APIs use different ID systems.

### Data Flow

```
daily-consumption-report API → stock_details[].ingredient_id → consumptionMap[ingredient_id]
stock-inventory API → current_stocks[].id (inventory_master_id) → item.id
IngredientIntelligence line 79: consumptionMap[item.id] → null (because item.id ≠ ingredient_id)
```

### Fix Strategy

Add **name-based fallback join**. When `consumptionMap[item.id]` is null, try matching by `stock_title` ↔ `ingredient_name` from consumption data. The `daily-consumption-report` API returns `ingredient_name` in `stock_details[]`.

### Affected Lines

| Location | Current | Impact |
|----------|---------|--------|
| `IngredientCatalogue.jsx:419-431` | consumptionMap keyed by `ingredient_id` only | Add name-keyed fallback map |
| `IngredientCatalogue.jsx:79` | `consumptionMap[item.id]` | Also check `consumptionMap[item.stock_title?.toLowerCase()]` |

### Risk: LOW
Single file, isolated data pipeline. No downstream consumers of consumptionMap outside this file.

---

## BUG-030: PO Create residual — rate=0, display_qty, DoC, search

### Sub-issues

| # | Issue | Root Cause |
|---|-------|-----------|
| 2a | Expected Rate: always send 0 to API | Line 284/312: sends `Number(l.expected_rate)` — should always be `0` |
| 2b | Stock shows `cal_quantity` (29865 kg) not `display_qty` (29.87 kg) | Lines 133, 178: `Number(item.cal_quantity)` — should be `Number(item.display_qty)` |
| 2c | DoC shows 995d (wrong) — same consumption bug as BUG-027 | Lines 127-134, 186-192: uses purchase-history-based consumption, not daily-consumption-report |
| 2d | Search bar only on By Vendor, not By Item Need | No `<Input>` search exists in item-need mode render section |
| 2e | By Item Need: same display_qty issue | Line 178: `Number(item.cal_quantity)` |
| 2f | By Item Need: same DoC issue | Lines 186-192: purchase-history consumption |

### Data Flow

```
By Vendor:
  initVendorLines() → item.cal_quantity (WRONG, should be display_qty)
  → purchase-history-based dailyConsumption (WRONG, should use daily-consumption-report)
  → expected_rate sent to API (SHOULD BE 0)

By Item Need:
  initNeedLines() → same cal_quantity and purchase-history issues
  → no search bar
```

### Fix Strategy

1. **display_qty**: Replace `Number(item.cal_quantity)` with `Number(item.display_qty)` in both `initVendorLines` (line 133) and `initNeedLines` (line 178)
2. **Consumption**: Fetch `daily-consumption-report` like IngredientCatalogue does, build consumptionMap, use it for DoC calculation instead of purchase-history estimation
3. **Rate = 0**: In submit handler, override `expected_rate: 0` for all lines (display can still show vendor rate for reference)
4. **Search in item-need mode**: Add search `<Input>` + filter logic to item-need tab render

### Affected Lines

| Location | Current | Change |
|----------|---------|--------|
| `PurchaseOrderCreate.jsx:133` | `Number(item.cal_quantity)` | → `Number(item.display_qty)` |
| `PurchaseOrderCreate.jsx:178` | `Number(item.cal_quantity)` | → `Number(item.display_qty)` |
| `PurchaseOrderCreate.jsx:127-134` | Purchase-history consumption | → consumptionMap from daily-consumption-report |
| `PurchaseOrderCreate.jsx:186-192` | Purchase-history consumption (need mode) | → same consumptionMap |
| `PurchaseOrderCreate.jsx:264-265` | KPI uses `cal_quantity` | → `display_qty` |
| `PurchaseOrderCreate.jsx:284,312` | `expected_rate: Number(l.expected_rate)` | → `expected_rate: 0` |
| `PurchaseOrderCreate.jsx:~560` | No search in item-need tab | Add search Input + state + filter |

### Risk: MEDIUM
Multiple sub-issues in one file. Consumption logic rewrite needed. API submit payload changes. Test both By Vendor and By Item Need flows.

---

## BUG-031: RM Stock page — remove All/FG tabs, hide Sub Recipe filter

### Sub-issues

| # | Issue | Root Cause |
|---|-------|-----------|
| 3a | `/inventory?type=raw` shows All (75) and FG (31) tabs | `StockInventorySummary.jsx:225-242` always renders all 3 tabs regardless of URL `type` param |
| 3b | Category filter shows "Sub Recipe (31)" | `useStockInventory.js:54-58` counts ALL categories; `StockInventorySummary.jsx:96` renders all of them |

### Fix Strategy

1. When `defaultStockType` (from URL) is `"raw"`, only show the Raw Materials tab (hide All and FG)
2. When `defaultStockType` is `"fg"`, only show the FG tab
3. When `defaultStockType` is `"all"` or no param, show all 3 tabs (current behavior)
4. Filter "Sub Recipe" from category dropdown in the component (same pattern as IngredientCatalogue `filterRawCategories`)

### Affected Lines

| Location | Current | Change |
|----------|---------|--------|
| `StockInventorySummary.jsx:224-243` | Always shows 3 tabs | Conditionally filter based on `defaultStockType` |
| `StockInventorySummary.jsx:96` | `categories` from all `categoryCounts` | Filter out "Sub Recipe" |

### Risk: LOW
UI-only changes. No data flow affected.

---

## BUG-032: Stock Inventory expanded row — expiry inline, hide Adjust Stock, load FEFO segments

### Sub-issues

| # | Issue | Root Cause |
|---|-------|-----------|
| 4 | Expiry Risk column shows "View detail" text | Line 446: hardcoded `"View detail"` instead of nearest batch expiry date |
| 5a | Expanded row shows "Adjust Stock" button | Line 635: `Adjust Stock` button always rendered in quick actions |
| 5b | Expanded row shows "No segments" but full detail has FEFO data | Line 571: reads `item.segments_preview` which is empty unless `include_segments=true` was passed to API |

### Data Flow (5b)

```
useStockInventory.js → api.getStockInventory() (NO include_segments param)
  → current_stocks[].segments_preview = undefined/[]
  → ExpandedStockDetail line 571: segments = [] → "No segments"

Fix: Pass include_segments=true OR lazy-load segments on expand
```

### Fix Strategy

1. **Expiry inline (4)**: Extract nearest expiry date from item data. If `segments_preview` is populated, use earliest non-expired `expiry_date`. Otherwise use `item.nearest_expiry_date` if API provides it. Fallback to "—".
2. **Hide Adjust Stock (5a)**: Remove the "Adjust Stock" button from `ExpandedStockDetail` quick actions.
3. **Load FEFO segments (5b)**: Two options:
   - **Option A (recommended)**: Pass `includeSegments: true, segmentLimit: 5, includeConsumption: true` to `getStockInventory()` in the hook. This makes segments available for all items on initial load. API supports these params per `api.js:594-598`. Trade-off: ~29s response time (per L9 note on G-022).
   - **Option B**: Lazy-load segments per-item when row expands (call `getStockDetail(item.id)` or `getStockInventory({ includeSegments: true })`). Faster initial load but delay on expand.

**Recommendation: Option B** — lazy-load on expand. Keeps initial page load fast. Use a small per-item fetch on expand.

### Affected Lines

| Location | Current | Change |
|----------|---------|--------|
| `StockInventorySummary.jsx:444-449` | "View detail" text | → nearest expiry date from segments or "—" |
| `StockInventorySummary.jsx:635-637` | Adjust Stock button | Remove |
| `StockInventorySummary.jsx:570-607` | `ExpandedStockDetail` reads `segments_preview` | Add `useEffect` to fetch segments on mount via dedicated API call |

### Risk: MEDIUM
The segment lazy-load adds an API call per expand. Need to handle loading state. Expiry column depends on segment data availability.

### Open Question for Owner

For BUG-032 sub-issue 5b (FEFO segments):
- **Option A**: Include segments in initial stock load (slower page load ~29s, all data immediate)
- **Option B**: Lazy-load segments when user expands a row (fast page load, brief spinner on expand)

**Agent recommends Option B.** Owner confirmation requested.

---

## BUG-033: Quick Actions — ingredient pre-selection for Dispatch/Wastage

### Sub-issues

| # | Issue | Root Cause |
|---|-------|-----------|
| 6a | Dispatch button doesn't pre-select ingredient | `DirectDispatchForm.jsx` has no `useSearchParams` — doesn't read `?item=` |
| 6b | Wastage button doesn't pre-select ingredient | `WastageEntryForm.jsx` has no `useSearchParams` — doesn't read `?item=` |

### Data Flow

```
StockInventorySummary.jsx (expanded row):
  navigate(`/dispatch/new?item=${item.id}`) → DirectDispatchForm
  navigate(`/wastage/new?item=${item.id}`) → WastageEntryForm

DirectDispatchForm: No useSearchParams. Ignores ?item= param.
WastageEntryForm: No useSearchParams. Ignores ?item= param.
```

### Fix Strategy

1. In both forms, add `useSearchParams` to read `item` param
2. On load, if `item` param exists, find the matching inventory item and pre-select it
3. `StockInventorySummary.jsx` already passes `?item=${item.id}` in navigation (lines 629, 632) — this side is correct

### Affected Files

| File | Change |
|------|--------|
| `DirectDispatchForm.jsx` | Add `useSearchParams`, read `?item=`, pre-select ingredient in destination/items list |
| `WastageEntryForm.jsx` | Add `useSearchParams`, read `?item=`, pre-select ingredient |
| `StockInventorySummary.jsx` | No change — already passes `?item=` correctly |

### Risk: LOW
Both forms have item selection dropdowns. Pre-selection just sets initial state. No business logic change.

---

## BUG-034: Sub-Recipe Master — Delete → Active/Inactive toggle

### Sub-issue

Replace the red "Delete" button + confirmation dialog with an active/inactive toggle switch (same pattern as `CategoriesTab` in `IngredientCatalogue.jsx`).

### Current Code

```
SubRecipeMaster.jsx:317 — <Button variant="ghost" ... className="text-destructive" onClick={() => setDeleteConfirm(true)}>
  <Trash2 /> Delete
SubRecipeMaster.jsx:249-258 — handleDelete() calls api.deleteSubRecipe(recipe.recipe_id)
SubRecipeMaster.jsx:429-437 — ConfirmActionDialog for delete
```

### Fix Strategy

1. Replace `<Button>` with `<Switch>` component (already imported pattern from IngredientCatalogue)
2. Display as "Active" toggle — ON = active, OFF = inactive
3. Since backend API for active/inactive toggle is **pending** (per registry notes), implement as UI stub with toast: "Status updated" (optimistic UI) but note in code that real API call is needed when available
4. Remove `deleteConfirm` state, `handleDelete` function, and `ConfirmActionDialog` for delete
5. Keep the `removeIngredientRow` function (that's for removing BOM rows, not the recipe itself)

### Affected Lines

| Location | Current | Change |
|----------|---------|--------|
| `SubRecipeMaster.jsx:13` | `Trash2` import | → remove `Trash2`, ensure `Switch` imported |
| `SubRecipeMaster.jsx:173` | `deleteConfirm` state | Remove |
| `SubRecipeMaster.jsx:249-258` | `handleDelete` function | → `handleToggleActive` with toast stub |
| `SubRecipeMaster.jsx:317-318` | Delete button | → Active/Inactive `<Switch>` |
| `SubRecipeMaster.jsx:429-437` | Delete confirmation dialog | Remove |

### Risk: LOW
Removing destructive action, adding safe toggle. Backend API is NOT yet available — stub only.

---

## BUG-035: Production History — ingredient qty total + unit normalization

### Sub-issues

| # | Issue | Root Cause |
|---|-------|-----------|
| 8a | Ingredient-level Qty shows "—" | `AllocationRow` line 142: `fmt(alloc.quantity_consumed)` — if `quantity_consumed` is null/undefined at ingredient level (only set at batch level), shows "—" |
| 8b | No unit normalization when summing batches | Batches may have different units (gm vs kg). Summing raw values without conversion gives incorrect totals |

### Data Flow

```
API response → data.consumed_allocations[] → each alloc has:
  - alloc.quantity_consumed (may be null at ingredient level)
  - alloc.segments[] or alloc.segment_allocations[] → each seg has:
    - seg.qty_cal (batch quantity in base unit)
    - seg.unit (may differ)

AllocationRow line 142: fmt(alloc.quantity_consumed) → "—" when null
```

### Fix Strategy

1. **Sum from segments**: If `alloc.quantity_consumed` is null/undefined, sum `seg.qty_cal` across all segments for the ingredient
2. **Unit normalization**: Convert all segment quantities to a consistent unit before summing (gm→kg if mixed, ml→ltr if mixed). Use same `normalizeToDisplayUnit` pattern from IngredientCatalogue
3. Display the computed total with appropriate unit

### Affected Lines

| Location | Current | Change |
|----------|---------|--------|
| `ProductionHistory.jsx:134-153` | `AllocationRow` component | Compute total qty from segments if `quantity_consumed` is null |
| `ProductionHistory.jsx:142` | `fmt(alloc.quantity_consumed)` | → `fmt(computedQty)` with unit normalization |

### Risk: LOW
Display-only change. Segments data is already loaded in the audit detail response. No additional API calls.

---

## Execution Order (Recommended)

| # | Bug | Reason | Est. |
|---|-----|--------|:----:|
| 1 | BUG-029 | Unblocks consumption accuracy for BUG-030 | 20 min |
| 2 | BUG-030 | Largest scope, depends on consumption fix pattern from 029 | 45 min |
| 3 | BUG-031 | Quick UI fix, sets up clean state for 032 | 15 min |
| 4 | BUG-032 | Depends on 031 being done (same file) | 40 min |
| 5 | BUG-033 | Depends on 032 expanded row being stable | 25 min |
| 6 | BUG-034 | Independent, quick | 15 min |
| 7 | BUG-035 | Independent, quick | 20 min |

**Total estimated: ~3 hours**

---

## Summary

- **7 bugs, 7 unique files, 0 frozen file touches**
- **Code Reality: NONE for all 7** — no fix code exists
- **Conflicts: BUG-031/032/033 share StockInventorySummary.jsx** — execute in order
- **Backend dependencies: BUG-034 toggle needs backend API (pending)** — UI stub only
- **1 Open Question: BUG-032 segment loading strategy (Option A vs B)**
- **Risk: LOW (5 bugs), MEDIUM (2 bugs — BUG-030, BUG-032)**
