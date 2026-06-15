# CR-031 — Artifact 1: Intake (Production Screens Audit)

> **Date:** 2026-06-13
> **Scope:** Sub-Recipe Master, Run Production, Production History

---

## Screen 1: Sub-Recipe Master (`/sub-recipe-master`)

### What's Working ✅
- List view: 4 sub-recipes with name, output qty, unit, ingredient count
- Search filter
- Add/Edit dialog with `IngredientComposer`
- Role-gating via `canAccess("scr-sub-recipe-master") || canAccess("scr-catalogue")`
- Proper CRUD: create, update (via `api.createSubRecipe` / `api.updateSubRecipe`)
- data-testid on all elements

### Issues Found ⚠️
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| P-1 | **No delete action for sub-recipes** — only edit is available. User can't remove obsolete sub-recipes. | MEDIUM | Missing implementation. API may support delete (`deleteSubRecipe` not in api.js). Needs investigation. |
| P-2 | **No "cost per batch" display in list view** — useful intelligence for comparing recipes | LOW | Enhancement. Would need segment cost data per recipe. |
| P-3 | **Ingredient names in form show as `Item #ID`** if `ingredient_name` is missing from API response | LOW | API data quality. `IngredientComposer` should resolve names from inventory master. |
| P-4 | **No refresh button** — user must reload page to see updates after external changes | LOW | UX gap. Other screens have explicit refresh. |

### Missing vs Phase 7 Freeze
Sub-Recipe Master was added in CR-026 (not in original Phase 7 Freeze). No frozen spec to compare against. Functionality is complete for its CR-026 scope.

---

## Screen 2: Run Production (`/production/new`)

### What's Working ✅
- P3-3: Sub-recipes sorted by demand (lowest FG stock first) — **verified in screenshot**: Sesame (6) → Oats (24) → Ragi (37) → Whole Wheat (1657)
- P3-4: Ingredient health strips with color coding (emerald/amber/red)
- P3-5: Coverage estimate ("covers ~X days across Y stores")
- P3-6: Post-production NBA (dispatch suggestions to lowest-stock stores)
- Phase 2c: FEFO cost estimation from segment data (₹ per ingredient, total, unit cost)
- Role-gating: Central + Master only
- Production-not-enabled blocker with settings redirect
- Auto-generated batch label
- Negative stock blocked/warned states
- data-testid on all elements

### Issues Found ⚠️
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| P-5 | **No confirmation step before production run** — clicking "Run Production" executes immediately. Unlike Purchase (which has Review & Confirm), production has no intermediate review. | HIGH | Missing implementation. A production run is irreversible — it consumes raw materials. Should have a confirm dialog. |
| P-6 | **Ingredient names show as `Item #ID`** when `ingredient_name` is null in sub-recipe data | MEDIUM | API data quality. `useProductionRun` hook should cross-reference with inventory master for names. |
| P-7 | **Coverage estimate denominator unclear** — "avg daily consumption" doesn't specify the time window used for computing the average | LOW | UX clarity. Should show "(based on last 7d)" or similar. |
| P-8 | **Post-production NBA "Dispatch" buttons all go to `/dispatch/new`** without pre-selecting the destination store | LOW | UX gap. Could pass destination store ID as query param. |

### Missing vs Phase 7 Freeze
Production was added in CR-026, not in original Phase 7 Freeze. All P3-phase intelligence items (P3-1 through P3-9) are implemented per CR-026 spec.

---

## Screen 3: Production History (`/production/history` + `/production/:id`)

### What's Working ✅
- P3-7: Summary KPIs (Total Runs: 10, Total FG: 1,905, Total Cost: ₹4.9K with avg ₹2.57/unit)
- P3-8: Sub-recipe staleness (all 4 showing "Produced 0d ago" with avg cost)
- P3-9: Cost trend chart (₹1.91 avg, -13.1% trend, 5-bar sparkline)
- All Runs table: Date, Reference (PRD-2026-XXXX), Recipe, Qty, Unit Cost, Total
- Click-through to audit detail (`/production/:id`)
- Audit detail: reference code, batch, expiry, planned/actual, cost breakdown
- Consumed allocations table with expandable segment rows
- Output section with "View in Stock" link
- Role-gating: Central + Master only
- data-testid on all elements

### Issues Found ⚠️
| # | Issue | Severity | Root Cause |
|---|-------|----------|------------|
| P-9 | **No date filter on history list** — unlike History & Ledger which has date range picker, production history loads all runs with a fixed `limit=50`. No way to filter by date. | MEDIUM | Missing implementation. API supports `from_date`/`to_date` params. |
| P-10 | **No search/filter** — can't find a specific production run by recipe name or reference code | LOW | Missing implementation. Frontend filter would work. |
| P-11 | **Staleness sorted wrong direction** — currently sorted by `(b.daysAgo) - (a.daysAgo)` which puts "most stale" first. But all are "0d ago" so not visible. When data ages, the most-recently-produced will be at bottom, which is counterintuitive for a "staleness" view. | LOW | Sort direction choice. May be intentional (highlight stale first). |
| P-12 | **"New Run" button in history could be confusing** — users might expect it to create from the history context (e.g., re-run a previous recipe). It just navigates to `/production/new`. | LOW | UX clarity. Consider "Re-run" action per row. |
| P-13 | **Cost trend only shows last recipe's data** — not user-selectable. If user wants to see cost trend for a different recipe, they can't. | LOW | Enhancement. Could add recipe selector for cost trend. |

---

## Summary: Prioritized Fix List

| Priority | ID | Screen | Issue | Effort |
|----------|-----|--------|-------|--------|
| HIGH | P-5 | Run Production | No confirmation step before irreversible production run | 2h |
| MEDIUM | P-1 | Sub-Recipe Master | No delete action for sub-recipes | 1h |
| MEDIUM | P-6 | Run Production | Ingredient names show as `Item #ID` | 1h |
| MEDIUM | P-9 | Production History | No date filter on history | 2h |
| LOW | P-3 | Sub-Recipe Master | Ingredient names in form show as `Item #ID` | 30min |
| LOW | P-4 | Sub-Recipe Master | No refresh button | 15min |
| LOW | P-7 | Run Production | Coverage estimate time window unclear | 15min |
| LOW | P-8 | Run Production | NBA dispatch buttons don't pre-select destination | 30min |
| LOW | P-10 | Production History | No search/filter | 1h |
| LOW | P-12 | Production History | "Re-run" action per row | 1h |
| LOW | P-13 | Production History | Cost trend recipe selector | 1.5h |
