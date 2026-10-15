# Code-Gate (Artifact #4) — BUG-025, BUG-019, BUG-024

> **Date:** 2026-06-14
> **Status:** APPROVED

---

## BUG-025: Food Edit Dialog → Side Sheet (30 min)

| # | Check | Result |
|---|-------|--------|
| 1 | Frozen files? | NO — `ProductCatalogue.jsx` only |
| 2 | API changes? | NO |
| 3 | Component exists? | YES — `@/components/ui/sheet.jsx` confirmed present |
| 4 | Regression risk? | LOW — swap Dialog → Sheet. Same form logic, different container. AlertDialog for delete unchanged. |

| File | Change |
|------|--------|
| `ProductCatalogue.jsx` | Replace Dialog import → Sheet import. Rename `dialogOpen` → `sheetOpen`. Rewrite `FoodFormDialog` → `FoodFormSheet` (right-side slide-in with Quick Info section). Pass `recipeMap` for Quick Info. |

**Key risk:** FoodCategoriesTab also uses `dialogOpen` state (line 183) — that's a *separate* component instance within `ProductCatalogue.jsx` for category CRUD. Must NOT rename that one. Only the Foods tab `dialogOpen` (line 59) is affected.

---

## BUG-019: Stock Inventory Split FG/RM (20 min)

| # | Check | Result |
|---|-------|--------|
| 1 | Frozen files? | **YES** — `screenVisibility.js`. **Owner approved unfreeze** (documented in BUGBATCH_ARTIFACT_2). |
| 2 | API changes? | NO |
| 3 | Hook change needed? | YES — `useStockInventory.js` needs to accept initial `stockType` param |
| 4 | Regression risk? | LOW — additive: new nav item + query param. Direct `/inventory` URL still works (defaults to "all"). |

| File | Change |
|------|--------|
| `screenVisibility.js` | Add `{ id: "rm-stock", ..., path: "/inventory?type=raw" }` under Inward. Change Outward "Stock Inventory" → "FG Stock" with `path: "/inventory?type=fg"`. |
| `useStockInventory.js` | Accept `initialStockType` param, use as default for `useState`. |
| `StockInventorySummary.jsx` | Read `?type=` from URL via `useSearchParams`, pass to hook. Update page title based on context. |

---

## BUG-024: Production Run → Master-Detail Layout (90 min)

| # | Check | Result |
|---|-------|--------|
| 1 | Frozen files? | NO |
| 2 | API changes? | NO |
| 3 | Business logic changes? | **ZERO** — all state, memos, effects, handlers, cost estimation, FEFO allocation, post-submit flow preserved verbatim |
| 4 | Regression risk? | **MEDIUM** — 628-line file, full layout restructure. Must preserve all `data-testid` attributes and all computation logic. |
| 5 | Mock available? | YES — `/__dev/previews/RUN_PRODUCTION_LAYOUT_COMPARISON.html` |

| File | Change |
|------|--------|
| `ProductionRunForm.jsx` | Full layout rewrite: vertical → master-detail (30/70 split). Left panel: recipe list with search + demand sort + stock badges. Right panel: batch form → coverage → BOM → cost → confirmation. Add `recipeSearch` state + `filteredRecipes` memo + `Search` import. |

**What stays untouched (verbatim):**
- All state variables (lines 39-45)
- `sortedRecipes`, `selectedRecipe`, `baseQty`, `unit`, `mult`, `totalQty`
- `ingredientSegments` useEffect
- `ingredientRows` useMemo (76 lines of FEFO cost logic)
- `insufficientCount`, `hasInsufficient`, `canSubmit`
- `totalEstimatedCost`, `estimatedUnitCost`
- `coverageEstimate` useMemo
- `handleRecipeSelect`, `handleSubmit`, `handleReset`
- Role gate, loading/error/disabled states
- `PostProductionConfirmation` component (lines 518-627)
- All `data-testid` attributes

**What changes: layout JSX only** (lines 232-515 → new master-detail structure)

---

*All 3 approved to proceed. Implementation order: BUG-025 → BUG-019 → BUG-024.*
