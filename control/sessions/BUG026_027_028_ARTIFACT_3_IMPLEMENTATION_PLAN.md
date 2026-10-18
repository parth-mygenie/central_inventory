# Implementation Plan — BUG-026, BUG-027, BUG-028

> **Date:** 2026-06-15
> **Owner Answers:** Q1=A, Q2=A+toggle, Q3=expected_rate+0+readonly, Q4=B, Q5=B

---

## Execution Order (by dependency)

### Phase 1: IngredientCatalogue.jsx (BUG-026 + BUG-027)

| Step | Fix | Lines | Details |
|:----:|-----|-------|---------|
| 1 | Filter sub-recipe items from ingredients list | ~306-308 | `.filter(i => !i.is_sub_recipe && (i.category_name||'').toLowerCase() !== 'sub recipe')` |
| 2 | Filter "Sub Recipe" from category dropdowns (add/edit) | InlineAddForm, InlineEditForm | Filter `categories` prop before rendering Select |
| 3 | Hide "Sub Recipe" from Categories tab + replace delete icon with active/inactive toggle (UI-only stub, flag for backend) | CategoriesTab | Filter out "Sub Recipe" row. Replace Trash2 with toggle Switch. Toggle calls future API (stub toast for now). |
| 4 | Fix filter category dropdown | auto-resolves | Since ingredients list no longer has sub-recipe items, `uniqueCategories` won't include "Sub Recipe" |
| 5 | Recipes column → "Used In" counting sub-recipe usage | ~309-323 | Add `getSubRecipeList()` call, build combined `usageMap` from both recipes and sub-recipes |
| 6 | Fix consumption: switch to `daily-consumption-report` API | IngredientIntelligence | Replace purchase-data-based consumption with `getDailyConsumptionReport()` data. Use `display_qty` for stock. |

### Phase 2: PurchaseOrderCreate.jsx (BUG-028)

| Step | Fix | Lines | Details |
|:----:|-----|-------|---------|
| 7 | Filter sub-recipe items from both By Vendor + By Item Need | handleSelectVendor, initNeedLines | Filter `inventoryItems` with same sub-recipe check |
| 8 | Add search input to By Vendor items table | Above vendor items table | Search state + filter vendorLines by stock_title |
| 9 | Fix Cheapest column rendering | Line 464 | Ensure em-dash renders correctly |
| 10 | Rename "Rate" → "Expected Rate", make read-only, pass 0 for no-history | Lines 444, 473, 597 | Column header rename. Remove Input, show text. Always send 0 or auto-filled rate. `expected_rate` field non-editable. |
| 11 | "No history" → vendor picker on click | Lines 587-595 | Show "No history" text + clickable icon to open vendor select |
| 12 | Rename "Daily" → "Daily Consumption", "Days" → "Days Will Last" | Lines 563-564 | Header text change |
| 13 | Add tooltip for "Days Will Last" projection formula | Line 564 | Tooltip: "Current Stock ÷ Avg Daily Consumption (from consumption report)" |

## Test Checkpoints
- Login as Central Store (806), navigate to /raw-materials → verify no sub-recipe items
- Expand raw material → verify consumption numbers are reasonable
- Navigate to /purchase/orders/new → verify no sub-recipe items in both tabs
- Verify column renames, rate field behavior, vendor picker
