# Impact Analysis — BUG-026, BUG-027, BUG-028

> **Date:** 2026-06-15

---

## Scope: 2 files, ~20 targeted edits

| File | Lines | Bugs | Risk |
|------|:-----:|------|:----:|
| `IngredientCatalogue.jsx` | 536 | BUG-026 (5 fixes), BUG-027 (1 fix) | LOW |
| `PurchaseOrderCreate.jsx` | 667 | BUG-028 (9 fixes) | LOW |

No frozen files touched. No API changes. No new dependencies. Frontend-only.

---

## BUG-026: Sub-Recipe Contamination — Root Cause & Fix Map

### Root Cause
`getStockInventory()` returns ALL inventory items including Finished Goods (sub-recipe outputs). No filter exists in `IngredientCatalogue.jsx` to exclude them.

### API Data Shape (confirmed via probe)
```
Sub-recipe items have: is_sub_recipe: true, category_name: "Sub Recipe", subrecipe_id: <number>
Raw materials have:     is_sub_recipe: false/null, category_name: "Flours"/"Nuts & Seeds"/etc.
```
49 total items → 5 sub-recipe, 44 raw materials.

### Fix Locations

| Issue | Location | Fix |
|-------|----------|-----|
| **#1 — Filter ingredients list** | `IngredientsTab`, line 306-308 | After `setIngredients()`, filter: `items.filter(i => !i.is_sub_recipe && (i.category_name || '').toLowerCase() !== 'sub recipe')` |
| **#2 — Category dropdown (add/edit)** | `InlineAddForm` line 256, `InlineEditForm` line 185 | Filter `categories` prop: `categories.filter(c => c.category_name.toLowerCase() !== 'sub recipe')` |
| **#3 — Categories tab** | `CategoriesTab` line 487 | Filter `crud.items` to exclude "Sub Recipe"; hide delete icon for it (or just filter it out entirely) |
| **#4 — Filter category dropdown** | `IngredientsTab` line 346-349 | `uniqueCategories` already derived from ingredients — if #1 is fixed (sub-recipe items removed), this auto-resolves |
| **#5 — Recipes column** | `IngredientsTab` line 309-323 | Currently counts recipe ingredients only. Need to also call `getSubRecipeList()` and count sub-recipe ingredient usage in `recipeMap` |

---

## BUG-027: Consumption Math — Root Cause

### Confirmed Data
```
Whole Wheat Flour:
  cal_quantity = 8822.92 (internal unit — likely grams)
  display_qty  = 8.82 (display unit — kg)
  unit         = kg

Purchase data (vendor-item-list):
  stock_quantity_raw = 2, 2, 5 (in display units — kg)
```

### Root Cause
`IngredientIntelligence` line 59: `const currentQty = Number(item.cal_quantity) || 0;`

This uses `cal_quantity` (8822.92 grams) but `stock_quantity_raw` from vendor-item-list is in display units (kg). So:
- `dailyConsumption = 15 kg / 1 day = 15 kg/day` (correct scale)
- `daysOfStock = 8822.92 / 15 = 588 days` (WRONG — should be 8.82 / 15 = 0.6 days)

### Fix
Line 59: Change `Number(item.cal_quantity)` → `Number(item.display_qty)` to match purchase data units.

Same fix needed in `PurchaseOrderCreate.jsx` where `Number(item.cal_quantity)` is used for stock display and calculations (lines 123, 168).

---

## BUG-028: Purchase Order Create — Fix Map

| Issue | Location | Fix |
|-------|----------|-----|
| **#7a — By Vendor sub-recipes** | `handleSelectVendor` line 99 | Filter `inventoryItems` before `.map()`: exclude `is_sub_recipe` items |
| **#7b — No search** | Items table (line 433+) | Add search input above table, filter `vendorLines` by `stock_title.includes(search)` |
| **#7c — Cheapest shows \u2014 text** | Line 464 | This renders `\u2014` in JSX which SHOULD be em-dash. Investigate: may be data issue where `cheapestVendorName` is the literal string. Fix: use `{"\u2014"}` or `{"—"}` explicitly |
| **#7d — Rate input required** | Line 473 | Auto-fill `expected_rate` from cheapest/avg vendor rate. Keep editable but pre-populated. Already done for checked lines — may just be that unchecked lines show empty |
| **#8a — By Item Need sub-recipes** | `initNeedLines` line 167 | Filter `inventoryItems` before `.map()`: same sub-recipe filter |
| **#8b — No vendor for "No history"** | Line 587-595 | When `vendorOptions.length === 0`, show ALL vendors in dropdown instead of "No history" text |
| **#8c — "Daily" → "Daily Consumption"** | Line 563 | Rename table header |
| **#8d — "Days" → "Days Will Last"** | Line 564 | Rename table header |
| **#8e — Projection tooltip** | Line 564 | Add tooltip: "Days Will Last = Current Stock ÷ Avg Daily Consumption (estimated from purchase history)" |

---

## Questions for Owner (BLOCKING)

### Q1 — Recipes/Sub-Recipe Column (BUG-026 #5)
The "Recipes" column currently counts how many **recipes** use each raw material. But many raw materials are used in **sub-recipes** (not recipes directly). Should I:
- **(A)** Show count of sub-recipes + recipes that use the ingredient (rename column to "Used In")?
- **(B)** Show only sub-recipe usage count (since raw materials go into sub-recipes, not recipes directly)?
- **(C)** Keep as "Recipes" but count both recipe AND sub-recipe usage?

### Q2 — Categories Tab (BUG-026 #3)
For the Categories tab, should I:
- **(A)** Completely hide "Sub Recipe" from the categories list (user can't edit/delete it)?
- **(B)** Show it but without edit/delete icons (read-only system category)?
Owner also said "remove the delete icon" — does that mean remove delete from ALL categories, or just from "Sub Recipe"?

### Q3 — Rate Auto-fill (BUG-028 #7d)
When creating a PO by vendor, rate IS auto-filled for items with purchase history. For items WITHOUT history, the rate field is empty. The POS API requires `expected_rate` per line. Should I:
- **(A)** Keep rate field, but make it optional (send 0 if empty)?
- **(B)** Keep rate field as-is (required for PO creation)?
- **(C)** Hide rate column entirely and let backend handle pricing?

### Q4 — "No History" Vendor Selection (BUG-028 #8b)
For items with no purchase history, should the vendor dropdown show:
- **(A)** All registered vendors (user picks one)?
- **(B)** "No history" text + a manual vendor picker that opens on click?

### Q5 — Consumption Source (BUG-027)
Current consumption uses purchase history (vendor-item-list) as a proxy for daily consumption. This is INACCURATE (purchase ≠ consumption). Should I:
- **(A)** Keep using purchase history as estimate but fix the unit bug? (Quick fix)
- **(B)** Switch to actual `daily-consumption-report` API for real consumption data? (More accurate but adds API call)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Sub-recipe filter too aggressive (hides legitimate items) | Medium | Filter by `is_sub_recipe === true` OR `category_name === "Sub Recipe"` — both conditions from API data |
| Consumption calc still inaccurate after unit fix | Low | Purchase history is an approximation — owner aware |
| PO creation breaks if sub-recipe items were previously ordered | None | PO lines use `inventory_master_id` — filtering display doesn't affect existing POs |
