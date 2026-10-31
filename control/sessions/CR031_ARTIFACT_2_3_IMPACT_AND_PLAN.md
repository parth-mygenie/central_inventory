# CR-031 — Artifact 2: Impact Analysis (Production Screens)

> **Date:** 2026-06-13

---

## Files Affected

| File | Change Type | Lines | Risk |
|------|-------------|:-----:|:----:|
| `SubRecipeMaster.jsx` | Edit | ~30 | LOW |
| `ProductionRunForm.jsx` | Edit | ~50 | MEDIUM |
| `ProductionHistory.jsx` | Edit | ~60 | LOW |
| `services/api.js` | Edit (add `deleteSubRecipe`) | ~5 | LOW |

## APIs Used

| API | Screen | Existing? | Notes |
|-----|--------|:---------:|-------|
| `getSubRecipeList()` | Sub-Recipe | YES | |
| `createSubRecipe()` | Sub-Recipe | YES | |
| `updateSubRecipe()` | Sub-Recipe | YES | |
| `deleteSubRecipe()` | Sub-Recipe | **NO — needs adding** | POS likely has `DELETE /recipe/delete-sub-recipe/{id}`. Needs API probing. |
| `runProduction()` | Run Prod | YES | |
| `getProductionRunHistory()` | History | YES | Has `from_date`/`to_date` params already |
| `getProductionRunDetail()` | History | YES | |
| `getStockInventory()` | Run Prod | YES | For ingredient name resolution |

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|------------|
| Confirmation dialog blocks production flow | LOW | MEDIUM | Standard dialog pattern, well-tested across app |
| Delete sub-recipe breaks references | MEDIUM | HIGH | Add warning about linked production runs |
| Date filter loads wrong data | LOW | LOW | Same API param pattern as other date filters |
| Ingredient name resolution causes extra API calls | LOW | LOW | Data already cached from initial load |

## Dependencies
- `api.js` needs new `deleteSubRecipe()` method (1 line)
- `useProductionRun.js` may need inventory master data for ingredient name resolution

---

# CR-031 — Artifact 3: Implementation Plan (Production Screens)

---

## Implementation Order

### Phase 1: Critical — Production Confirmation Dialog (2h)
1. **P-5** — `ProductionRunForm.jsx`: Add confirmation step before `handleSubmit`
   - New state: `confirmMode` (boolean)
   - When user clicks "Run Production" → set `confirmMode = true` → show confirmation card
   - Confirmation card shows: recipe name, total qty, batch label, expiry, ingredient summary, estimated cost
   - Two buttons: "Back to Edit" / "Confirm & Run Production"
   - Only on "Confirm & Run" does `handleSubmit()` execute
   - Pattern: match `AddStockPurchaseForm.jsx` confirm flow

### Phase 2: Sub-Recipe Delete (1.5h)
2. **P-1** — Probe API: `DELETE /proxy/v2/recipe/delete-sub-recipe/{id}`
   - If works: add `deleteSubRecipe(id)` to `api.js`
   - `SubRecipeMaster.jsx`: Add delete button per row with `AlertDialog` confirmation
   - Warning text: "This sub-recipe may be referenced by production runs. Deleting it will not affect past runs but will prevent future production."

### Phase 3: Ingredient Name Resolution (1h)
3. **P-6 + P-3** — `useProductionRun.js` or `ProductionRunForm.jsx`:
   - Cross-reference `ingredient_id` with `stockMap` to get `stock_title`
   - Fallback chain: `ingredient_name` → `stockMap[id]?.stock_title` → `Item #${id}`
   - Same fix applies to `SubRecipeMaster.jsx` form dialog

### Phase 4: Production History Filters (2h)
4. **P-9** — `ProductionHistory.jsx`:
   - Add `DateRangePicker` component (already used in HistoryLedger)
   - Wire `from_date`/`to_date` to `getProductionRunHistory()` params
   - Re-compute KPIs based on filtered data
5. **P-10** — `ProductionHistory.jsx`:
   - Add search input (filter by recipe name or reference code)
   - Frontend filter on loaded data

### Phase 5: Polish (1h)
6. **P-4** — `SubRecipeMaster.jsx`: Add Refresh button (match Vendor Management pattern)
7. **P-7** — `ProductionRunForm.jsx`: Add time window note to coverage estimate ("based on last 30d avg")
8. **P-8** — `ProductionRunForm.jsx`: Pass destination store ID in NBA dispatch links (`/dispatch/new?to=${storeId}`)

## Test Checkpoints

| After Phase | Test |
|-------------|------|
| Phase 1 | Select recipe → fill form → click Run → verify confirmation card → confirm → verify success |
| Phase 2 | Probe delete API. If available: delete sub-recipe → verify removed from list. Verify production form still works. |
| Phase 3 | Run Production → select recipe → verify ingredient names are human-readable (not `Item #123`) |
| Phase 4 | Production History → set date range → verify filtered runs + recalculated KPIs |
| Phase 5 | Visual verification |

## Estimated Total: ~7.5h
