# Session-Start + Intake — BUG-026, BUG-027, BUG-028

> **Date:** 2026-06-15
> **Sprint:** S3
> **Items:** BUG-026 (HIGH), BUG-027 (HIGH), BUG-028 (HIGH)
> **Branch:** 15-june

---

## What I'm Working On

Three related bug batches reported by owner — all on Raw Material Master and Purchase Order Create screens. Sub-recipe items are polluting raw-material-only views, consumption math is broken, and PO creation has multiple UX issues.

## BUG-026 — Raw Material Master Sub-Recipe Contamination (5 sub-issues)

| # | Issue | Location |
|---|-------|----------|
| 1 | Ingredients list shows sub-recipe FG items (e.g. "Ajwain Cookies With Jaggery") | `IngredientsTab` — no filter on `getStockInventory()` results |
| 2 | New/Edit ingredient category dropdown shows "Sub Recipe" | `InlineAddForm` / `InlineEditForm` — passes raw `categories` |
| 3 | Categories tab lists "Sub Recipe" with delete icon | `CategoriesTab` — shows all categories from API |
| 4 | Filter category dropdown shows "Sub Recipe" | `IngredientsTab` — `uniqueCategories` derived from unfiltered list |
| 5 | Recipes column shows 0 for items used in sub-recipes | `recipeMap` counts recipe ingredients only, not sub-recipe usage |

## BUG-027 — Consumption & Days of Stock Miscalculation

- **Example:** Whole Wheat Flour — 29.87 kg stock, shows "30.0 kg/day" consumption and "995d" days of stock
- **Root cause hypothesis:** `vendor-item-list` API returns `stock_quantity_raw` which may be in base units (grams) while display uses kg. Division gives consumption in grams/day, then dividing 29870g / 30g = 995 days. Unit normalization needed.

## BUG-028 — Purchase Order Create Issues (9 sub-issues)

| # | Issue | Tab |
|---|-------|-----|
| 7a | Sub-recipe items showing in By Vendor item list | By Vendor |
| 7b | No search to filter items | By Vendor |
| 7c | "Cheapest" column shows `\u2014` as literal text | By Vendor |
| 7d | Rate input required even when vendor history exists | By Vendor |
| 8a | Sub-recipe items showing in By Item Need list | By Item Need |
| 8b | Items with "No history" can't select a vendor | By Item Need |
| 8c | Column header "Daily" → "Daily Consumption" | By Item Need |
| 8d | Column header "Days" → "Days Will Last" | By Item Need |
| 8e | Need tooltip for projection calculation formula | By Item Need |

## Pre-Conditions Verified

- [x] Read `control/AGENT_PROMPT.md`
- [x] Read `control/L6_SPRINT_STATUS.md`
- [x] Checked `control/registry.json` — items registered
- [x] Checked `control/L7_FILE_OWNERSHIP.md` — no frozen files in plan
- [x] Terminology mapping understood

## Files I Expect to Touch

| File | Action | Reason |
|------|--------|--------|
| `IngredientCatalogue.jsx` | Modify | BUG-026 (filter sub-recipes), BUG-027 (fix consumption math) |
| `PurchaseOrderCreate.jsx` | Modify | BUG-028 (filter, search, columns, vendor selection, tooltips) |

## Exit Criteria

- Sub-recipe items hidden from Raw Material Master (list, categories, filter, dropdown)
- Recipes column shows sub-recipe usage count
- Consumption/Days of Stock shows correct numbers
- PO Create filters sub-recipes, has search, correct column names, vendor selection for new items, projection tooltip
