# CR-032 — Artifact 2: Impact Analysis (Outward Screens)

> **Date:** 2026-06-13

---

## Files Affected

| File | Change Type | Lines | Risk |
|------|-------------|:-----:|:----:|
| `ProductCatalogue.jsx` | Major edit — add Recipes + Addon Recipes tabs | ~200 | **HIGH** |
| `HistoryLedger.jsx` | Edit — fix items count | ~20 | MEDIUM |
| `PendingQueues.jsx` | Edit — fix requester name logic | ~15 | MEDIUM |
| `StockInventorySummary.jsx` | Edit — remove back button, fix -0d, fix store label | ~15 | LOW |
| `App.js` | Edit — remove orphaned redirect routes | ~5 | LOW |

## APIs Used (No new APIs needed)

| API | Screen | Existing? |
|-----|--------|:---------:|
| `getRecipeList()` | Product Catalog (new tab) | YES |
| `getRecipeDetail()` | Product Catalog | YES |
| `createRecipe()` / `updateRecipe()` / `deleteRecipe()` | Product Catalog | YES |
| `getAddonRecipes()` | Product Catalog (new tab) | YES |
| `createAddonRecipe()` / `updateAddonRecipe()` / `deleteAddonRecipe()` | Product Catalog | YES |
| `getTransferHistory()` | History | YES |
| `getPendingQueues()` | Queues | YES |
| `getTransferDetails()` | Queues | YES |

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|------------|
| **Recipe tab breaks Product Catalog** | MEDIUM | HIGH | Recipes tab is additive. Existing Foods/Categories/Addons tabs unaffected. Pattern follows existing tab structure. |
| **Items count fix breaks History rendering** | LOW | MEDIUM | Display-only change. Data flow unchanged. |
| **Requester name fix swaps labels wrongly** | MEDIUM | HIGH | Careful testing with request-type vs dispatch-type transfers. Must test both directions. |
| **Back button removal breaks navigation** | LOW | LOW | No other screen depends on this button. |

## Dependencies
- `RecipeCatalogue.jsx` — EXISTS but orphaned. Can be imported as a tab component.
- `AddonRecipeCatalogue.jsx` — EXISTS but orphaned. Same approach.
- CR-016 re-QA is a separate item tracked independently.

---

# CR-032 — Artifact 3: Implementation Plan (Outward Screens)

---

## Implementation Order

### Phase 1: Critical — Restore Recipe & Addon Recipe Access (3h)
1. **O-6 + O-7** — `ProductCatalogue.jsx`: Add Recipes and Addon Recipes tabs
   - Import `RecipeCatalogue` and `AddonRecipeCatalogue` components
   - Add 2 new `TabsTrigger` + `TabsContent` entries:
     ```
     Foods | Categories | Addons | Recipes | Addon Recipes
     ```
   - Test: all 5 tabs load correctly, CRUD works in each
   - Also: remove orphaned redirect routes in `App.js` for `/catalogue/recipes` and `/catalogue/addon-recipes` (they currently redirect to `/product-catalog` which is correct, but the tabs should now be present)

### Phase 2: Critical — Fix "0 Items" in History (2h)
2. **O-15** — `HistoryLedger.jsx`: Investigate and fix items count
   - Root cause investigation:
     a. Check what `formatItemsCount` receives as argument
     b. Check if history API returns line items or just transfer headers
     c. If API returns `items_count` field → use it
     d. If API returns `lines[]` array → use `lines.length`
     e. If neither → the count must come from `getTransferDetails()` per transfer (N+1, but necessary)
   - Fix: ensure items count is populated from the correct source field
   - Also verify **O-14** (dispatch tab "0 items") shares same root cause

### Phase 3: Critical — Fix Requester Name in Pending Queues (2h)
3. **O-13** — `PendingQueues.jsx`: Fix source/destination label logic
   - For **request-type** transfers: requester is `to_restaurant` (the store requesting stock FROM central)
   - For **dispatch-type** transfers: sender is `from_restaurant`
   - The card header should show: "{requester} → {fulfiller}" or "{sender} → {receiver}"
   - The subtitle should accurately reflect the direction
   - Test with both request transfers and dispatch transfers
   - Must test from Central (806) perspective AND Outlet (809) perspective

### Phase 4: Stock Inventory Fixes (1h)
4. **O-10** — `StockInventorySummary.jsx`: Remove or conditionally hide "Back" button
   - Only show back button if navigated from a drill-down context (e.g., from Store Detail)
   - Simple fix: remove the back button entirely (it's a top-level nav screen)
5. **O-9** — `StockInventorySummary.jsx`: Fix "-0d" display
   - In Days of Cover calculation: `Math.max(0, daysOfCover)` or `daysOfCover <= 0 ? "—" : `${daysOfCover}d``
6. **O-11** — `StockInventorySummary.jsx`: Show store name instead of "Store #806"
   - Use `restaurantName` from `useLoginContext()` instead of `restaurantId`

### Phase 5: Product Catalog Polish (30 min)
7. **O-8** — `ProductCatalogue.jsx`: Add "₹" prefix to price column

## Test Checkpoints

| After Phase | Test |
|-------------|------|
| Phase 1 | Product Catalog → verify all 5 tabs load. Create/edit/delete recipe. Create/edit/delete addon recipe. Verify Foods/Categories/Addons tabs unaffected. |
| Phase 2 | History & Ledger → verify items count is non-zero for transfers that have lines. Check both Transfer History and Stock Ledger tabs. |
| Phase 3 | Login as Central (806) → Pending Queues → verify request cards show correct requester name. Login as Outlet (809) → verify My Requests tab shows correct labels. |
| Phase 4 | Stock Inventory → verify no back button, no "-0d", store name shows correctly. |
| Phase 5 | Visual verification of price format. |

## Estimated Total: ~8.5h

## Cross-CR Dependencies
- CR-016 re-QA (hierarchy toggle) should be done separately after Phase 4
- O-2 (Alpha Outlet One missing data) is a preprod data issue, not a code fix
- O-1 (test 1 store) is BUG-014 — preprod cleanup, not a code fix
