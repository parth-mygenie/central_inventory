# CR-030 — Artifact 2: Impact Analysis (Inward Screens)

> **Date:** 2026-06-13

---

## Files Affected

| File | Change Type | Lines | Risk |
|------|-------------|:-----:|:----:|
| `VendorManagement.jsx` | Edit | ~5 | LOW |
| `IngredientCatalogue.jsx` | Edit | ~40 | LOW |
| `AddStockPurchaseForm.jsx` | Edit | ~30 | LOW |

## APIs Used

| API | Screen | Existing? | Notes |
|-----|--------|:---------:|-------|
| `getVendors()` | Vendor Mgmt | YES | |
| `getVendorItemList(rid, fromDate, toDate)` | Vendor Mgmt + Purchase | **NEW** | `GET /inventory/vendor-item-list?restaurant_ids[]={rid}&from_date=&to_date=` — purchase history with Vendor_Name, Amount, unit_price, Purchase_Date. G-017 CLOSED. |
| `getStockInventory()` | Raw Materials | YES | |
| `getStockItemCategories()` | Raw Materials | YES | |
| `getRecipeList()` | Raw Materials | YES | |
| `getHierarchyList()` | Raw Materials (new for "Pushed to X") | YES (unused here) | |
| `getInventoryMaster()` | Purchase | YES | |
| `addStockPurchase()` | Purchase | YES | |

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|------------|
| Breaking vendor CRUD | LOW | HIGH | Edit-only changes, no flow changes |
| Breaking ingredient search/display | LOW | MEDIUM | Additive columns only |
| Purchase submission regression | LOW | HIGH | Sequential submission logic unchanged |
| Cache invalidation issues | LOW | LOW | No new write endpoints |

## Dependencies on Other CRs
- None. All fixes are self-contained within Inward screens.
- G-017 (Vendor purchase history) remains a backend blocker for full intelligence.

---

# CR-030 — Artifact 3: Implementation Plan (Inward Screens)

---

## Implementation Order

### Phase 1: Quick Fixes (30 min)
1. **I-3** — `VendorManagement.jsx` line 74: Replace `alert()` with `toast({ variant: "destructive" })`
2. **I-7** — `IngredientCatalogue.jsx` line 217: Add error handling in `AddIngredientDialog.save()` — add `toast({ title: msg, variant: "destructive" })` in catch block

### Phase 2: Raw Material Intelligence (4h)
3. **I-6** — `IngredientCatalogue.jsx`: Add "Pushed to Stores" column
   - Call `api.getHierarchyList()` on mount
   - For each ingredient, cross-reference with hierarchy push data to count stores
   - Add column between "Vendor" and "Actions"
   - Show "X stores" or "Not pushed" badge

### Phase 3: Purchase UX Hardening (2.5h)
4. **I-9** — `AddStockPurchaseForm.jsx`: Improve partial failure UX
   - Track per-line success/failure in submission loop
   - After loop, show summary: "3 of 5 items added. 2 failed:"
   - List failed items with error messages
   - Offer "Retry Failed" button
5. **I-12/13** — `AddStockPurchaseForm.jsx`: Disable file inputs or show "not available" after file selection
   - Add `onChange` handler that shows toast "Invoice processing not yet available (G-014)"
   - Same for Excel: "Excel import not yet available (G-015)"

### Phase 4: Cosmetic (30 min)
6. **I-5** — `IngredientCatalogue.jsx`: Optional — show "Empty" badge for 0-stock items with 0 min_alert
7. **I-8** — Investigate if `updateStockItem` API supports `category_id` change

## Test Checkpoints

| After Phase | Test |
|-------------|------|
| Phase 1 | Delete vendor → verify toast. Add ingredient with bad data → verify toast. |
| Phase 2 | Login as Central (806) → Raw Materials → verify "Pushed to Stores" column shows counts |
| Phase 3 | Purchase → add 3 items, mock one failure → verify partial success UX |
| Phase 4 | Visual verification only |

## Estimated Total: ~7.5h
