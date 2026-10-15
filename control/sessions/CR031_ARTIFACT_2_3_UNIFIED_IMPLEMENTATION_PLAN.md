# CR-031 — Unified Implementation Plan (UX Redesign + Bug Fixes)

> **Date:** 2026-06-14
> **Scope:** Sub-Recipe Master, Run Production, Production History
> **Replaces:** Previous Artifact 2-3 (bug-fix-only plan)
> **Estimated effort:** ~18h

---

## API Probing Results (2026-06-14)

| API | Status | Notes |
|-----|:------:|-------|
| `GET /recipe/sub-recipes` | ✅ WORKS | Returns `recipe_id` (NOT `id`), `name`, `ingredients[]` with `ingredient_name`. 4 sub-recipes in 806. |
| `DELETE /recipe/delete-sub-recipe/{recipe_id}` | ⚠️ NOT PROBED (destructive) | Must probe with a test-created sub-recipe before Phase 2. If unavailable → disable delete button. |
| `GET /inventory/production-run?from_date=&to_date=&limit=` | ✅ CONFIRMED (G-018 CLOSED) | Date params supported. |
| `GET /inventory/production-run/{id}` | ✅ CONFIRMED | Returns full audit detail with consumed allocations. |
| `GET /inventory/stock-inventory?include_segments=true&include_consumption=true` | ✅ WORKS | For ingredient cost estimation (FEFO unit_cost in segments). |

### Key Finding: Sub-recipe ID field
Sub-recipes use `recipe_id` (not `id`). The existing `api.updateSubRecipe(id, ...)` likely uses this already. The new `deleteSubRecipe` must use `recipe_id` too.

### Key Finding: Ingredient names already populated
Sub-recipe `ingredients[]` contains `ingredient_name` field. P-3/P-6 ("Item #ID" bug) may only occur when `ingredient_name` is null/empty — fallback chain still needed.

---

## Files Affected

| File | Change Type | Current Lines | Estimated After | Risk |
|------|-------------|:------------:|:---------------:|:----:|
| `services/api.js` | Add `deleteSubRecipe()` | 1035 | ~1045 | LOW |
| `SubRecipeMaster.jsx` | **FULL REWRITE** | 213 | ~500 | HIGH |
| `ProductionRunForm.jsx` | EDIT (add confirmation step) | 607 | ~680 | MEDIUM |
| `ProductionHistory.jsx` | **MAJOR REWRITE** | 446 | ~550 | HIGH |

---

## Phase 0: API Layer (30 min)

### 0.1 — Add `deleteSubRecipe()` to `api.js`

```javascript
function deleteSubRecipe(recipeId) {
  return client.delete(`/proxy/v2/recipe/delete-sub-recipe/${recipeId}`).then(r => {
    _invalidateCache(["getSubRecipeList:", "getRecipeList:"]);
    return r;
  });
}
```

### 0.2 — Probe delete API with test data

1. Create a test sub-recipe: `api.createSubRecipe({ name: "DELETE_TEST", ... })`
2. Get its `recipe_id` from the list
3. Attempt `DELETE /recipe/delete-sub-recipe/{recipe_id}`
4. If 200 → delete works, proceed
5. If 404/405 → flag as gap, disable delete button with tooltip

---

## Phase 1: Sub-Recipe Master — Full Rewrite (7h)

### Current → Target

| Current (213 lines) | Target (~500 lines) |
|---------------------|---------------------|
| Simple table + popup edit dialog | **Master-detail** (35% list / 65% detail) |
| No delete action | Delete button with confirmation |
| `IngredientComposer` in dialog | **Inline BOM editor** in right panel |
| No intelligence | KPIs: material cost, last produced, FG stock |
| Ingredient names may show as ID | Resolved from inventory master |

### Layout Structure

```
┌──────────────────┬─────────────────────────────────────────────────┐
│ SUB-RECIPES (35%)│ DETAIL PANEL (65%)                               │
│                  │                                                   │
│ [Search...]      │ State 1: "Select or add a recipe"                │
│ [+ Add Sub-Recipe│ State 2: Edit form + BOM editor + intelligence   │
│                  │ State 3: New form + empty BOM                     │
│ ┌──────────────┐ │                                                   │
│ │ Elachi Cookie│ │ ┌─ Form ──────────────────────── [Delete] ─────┐ │
│ │ 12 ing · 37pc│ │ │ Name / Output Qty / Unit / Prep Time         │ │
│ ├──────────────┤ │ └───────────────────────────────────────────────┘ │
│ │ Oats Cookie  │ │                                                   │
│ │ 10 ing · 24pc│ │ ┌─ Ingredient BOM ─────────────────────────────┐ │
│ ├──────────────┤ │ │ Ingredient (dropdown) │ Qty │ Unit │ ✕       │ │
│ │ Ragi Cookie  │ │ │ Wheat Flour           │ 200 │ gm   │ ✕       │ │
│ │ 8 ing · 37pc │ │ │ Jaggery Powder        │ 100 │ gm   │ ✕       │ │
│ ├──────────────┤ │ │ [+ Add Ingredient]                            │ │
│ │Sesame Cookie │ │ └───────────────────────────────────────────────┘ │
│ │ 9 ing · 6 🔴 │ │ [Save Changes]                                   │
│ └──────────────┘ │                                                   │
│                  │ ┌─ Intelligence ─────────────────────────────────┐ │
│                  │ │ [₹45/batch] [Produced 2d ago] [FG: 37 pcs]   │ │
│                  │ └───────────────────────────────────────────────┘ │
└──────────────────┴─────────────────────────────────────────────────┘
```

### Implementation Steps

**1.1 — State & Data Loading**

On mount:
1. `api.getSubRecipeList()` → sub-recipe list with ingredients
2. `api.getStockInventory()` → for FG stock per sub-recipe + ingredient name resolution
3. `api.getInventoryMaster()` → for BOM dropdown (ingredient picker)
4. `api.getProductionRunHistory({ limit: 50 })` → for "Last Produced" KPI

State:
- `subRecipes[]`, `loading`, `error`, `search`
- `selectedRecipeId` (new)
- `isAddMode` (new)
- `editForm{}` (new — name, qty, unit, prep_time, ingredients[])
- `stockMap{}` (inventory items by ID for name resolution + FG stock)
- `productionRuns[]` (for last produced per recipe)

**1.2 — Left Panel (Recipe List)**
- Search filter by name
- "+ Add Sub-Recipe" button → `isAddMode=true`
- Recipe cards: name (bold), ingredient count, FG stock with color
  - FG stock: look up `stockMap[recipe.inventory_id]` → `cal_quantity` + `stock_unit`
  - Color: red if `is_low_stock` or FG=0, amber if FG < 2×min_alert, green otherwise
- Selected card: blue left border

**1.3 — Right Panel: Edit Form**
- Name (text input)
- Output Qty (number) + Unit (dropdown: gm/kg/piece/ml/ltr/pkt)
- Prep Time (number, minutes)
- Delete button (red, top-right): confirmation dialog → `api.deleteSubRecipe(recipe_id)` → toast → select next

**1.4 — Right Panel: Ingredient BOM Editor**
- Table rows: Ingredient (searchable dropdown from inventoryMaster), Qty (number), Unit (dropdown), Remove (×)
- Ingredient dropdown shows `stock_title (unit)` from inventory master
- Name resolution fallback chain: `ingredient_name` → `stockMap[id]?.stock_title` → "Unknown (ID: X)" with amber warning
- "+ Add Ingredient" appends empty row
- Validation: at least 1 ingredient, each must have qty > 0, duplicate detection

**1.5 — Right Panel: Intelligence (edit mode only)**
- **Material Cost:** Sum of (ingredient_qty × segment unit_cost) per ingredient. Use FEFO allocation: for each ingredient, find cheapest segment from `stockMap[id]?.segments_preview`. Show "₹X/batch".
- **Last Produced:** From `productionRuns`, find most recent where `output_stock_title` matches. Show relative time.
- **FG Stock:** `stockMap[recipe.inventory_id]?.cal_quantity` + unit. Green/amber/red color.

**1.6 — Add New Flow**
- Empty form, empty BOM (2 rows), "Cancel" + "Create Sub-Recipe" buttons
- Intelligence hidden (no data yet)

### Test checkpoint:
- Select recipe → see form + BOM + intelligence
- Edit ingredient BOM → save → verify update
- Delete sub-recipe → confirm → removed from list
- Add new → fill form → create → appears in list
- Verify ingredient names are human-readable

---

## Phase 2: Run Production — Add Confirmation Step (3h)

### Current → Target

Current flow: Fill form → click "Run Production" → API call immediately → post-production result.

Target flow: Fill form → scroll down → **confirmation card visible** → "Confirm & Run Production" → API call → result.

### Implementation

The confirmation card is NOT a separate step/modal — it's **always visible at the bottom** when the form is filled. User reviews summary and clicks confirm.

**2.1 — Add confirmation section to `ProductionRunForm.jsx`**

Below the existing ingredient table + cost summary, add:

```
┌── CONFIRMATION (green border) ─────────────────────────────────┐
│ Review Before Running                                           │
│ Recipe: Sesame Cookie  Qty: 30 pieces  Batch: SESAME-001       │
│ Expiry: 2026-12-31    Est Cost: ₹285.00                       │
│ Insufficient: None (or "2 ingredients below required qty")     │
│                                                                 │
│ [Back to Edit]                    [Confirm & Run Production]   │
└─────────────────────────────────────────────────────────────────┘
```

- Show only when: recipe selected AND multiplier > 0 AND batch label filled
- "Back to Edit" scrolls back to form / focuses first field
- "Confirm & Run Production" calls `handleSubmit()` (existing)
- Remove the old "Run Production" button from the form — only the confirmation section has the submit button

**2.2 — Coverage estimate time window (P-7)**
- Add note: "(based on last 30d avg)" to coverage estimate text

**2.3 — NBA dispatch links (P-8)**
- Post-production dispatch buttons: pass `?to=${storeId}` query param (future: DirectDispatchForm reads it)

### Test checkpoint:
- Select recipe → fill qty/batch/expiry → confirmation card appears below
- Click "Confirm & Run Production" → success → post-production result
- Without filling form → no confirmation card visible

---

## Phase 3: Production History — Major Rewrite (7h)

### Current → Target

| Current (446 lines) | Target (~550 lines) |
|---------------------|---------------------|
| Navigate to `/production/:id` for detail | **Expandable rows** with inline audit detail |
| No date filter | Date range picker |
| No search | Search by reference/recipe name |
| KPIs always show full dataset | KPIs **recalculate** with date filter |

### Layout Structure

```
┌──────────────────────────────────────────────────────────────────────┐
│ Production History                                      [+ New Run]  │
│                                                                      │
│ [From: ____] [To: ____]  [Search reference or recipe...]            │
│                                                                      │
│ ┌──────────┐ ┌──────────────────┐ ┌─────────────────────────────┐   │
│ │ Total    │ │ Total FG         │ │ Total Material Cost         │   │
│ │ Runs: 10 │ │ Produced: 1,905  │ │ ₹4.9K (avg ₹2.57/unit)     │   │
│ └──────────┘ └──────────────────┘ └─────────────────────────────┘   │
│                                                                      │
│ ┌── STALENESS + COST TREND (keep existing) ────────────────────────┐ │
│ └────────────────────────────────────────────────────────────────── │ │
│                                                                      │
│ ┌── ALL RUNS TABLE ────────────────────────────────────────────────┐ │
│ │ Date    │ Reference      │ Recipe        │ Qty  │ U.Cost│Total  │ │
│ │ 13 Jun  │ PRD-2026-0010  │ Sesame Cookie │ 30   │ ₹9.50│₹285   │ │
│ │ ▼ EXPANDED AUDIT DETAIL ──────────────────────────────────────── │ │
│ │ │ Ref, Planned/Actual, Batch, Expiry, Cost                     │ │ │
│ │ │ CONSUMED INGREDIENTS table with expandable segments           │ │ │
│ │ │ OUTPUT: Sesame Cookie 30 pcs [View in Stock →]               │ │ │
│ │ └──────────────────────────────────────────────────────────────── │ │
│ │ 13 Jun  │ PRD-2026-0009  │ Oats Cookie   │ 20   │ ₹7.20│₹144   │ │
│ └────────────────────────────────────────────────────────────────── │ │
└──────────────────────────────────────────────────────────────────────┘
```

### Implementation Steps

**3.1 — Add date filter + search to ProductionHistory**

New state:
- `fromDate`, `toDate` (date picker state)
- `searchTerm` (string)
- `expandedRunId` (which run's audit detail is expanded)
- `auditDetails{}` (cache: runId → detail data from `getProductionRunDetail`)

On mount / filter change:
- `api.getProductionRunHistory({ fromDate, toDate, limit: 100 })` → runs
- KPIs recompute from filtered data

Search: frontend filter on `reference_code` or recipe name.

**3.2 — Replace navigation with expandable rows**

Currently clicking a run navigates to `/production/:id`. Replace with:
- Click row → toggle `expandedRunId`
- On expand: call `api.getProductionRunDetail(runId)` (cached)
- Show inline audit detail below the row

**3.3 — Inline Audit Detail**

Content (same as current `/production/:id` page, but inline):
- Summary: Reference, Planned/Actual qty, Batch, Expiry, Unit Cost, Total Cost
- Consumed Ingredients table: Ingredient, Qty Consumed, Unit, Line Cost
  - Click ingredient row → expand segment allocations (batch, expiry, qty, unit_cost per segment)
- Output: FG name + segment + "View in Stock →" link

**3.4 — Keep existing components**

The existing `AuditDetail` component (lines 41-100 of ProductionHistory.jsx) can be extracted and reused inline instead of as a separate page.

### Test checkpoint:
- Production History loads with KPIs
- Set date range → KPIs recalculate, table filters
- Search by recipe name → table filters
- Click run row → expand → audit detail renders inline
- Click ingredient → segment allocations expand

---

## Implementation Order

| Order | Phase | Screen | Effort | Risk |
|:-----:|-------|--------|:------:|:----:|
| 1 | Phase 0 | api.js (add `deleteSubRecipe`, probe) | 30min | LOW |
| 2 | Phase 1 | SubRecipeMaster.jsx full rewrite | 7h | HIGH |
| 3 | Phase 2 | ProductionRunForm.jsx confirmation step | 3h | MEDIUM |
| 4 | Phase 3 | ProductionHistory.jsx major rewrite | 7h | HIGH |

**Total estimated: ~17.5h**

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|------------|
| `deleteSubRecipe` API doesn't exist | MEDIUM | LOW | Probe first. If unavailable: disable button with tooltip "Delete not available — contact admin" |
| BOM editor ingredient picker slow with 48 items | LOW | LOW | Use searchable Select component (existing pattern) |
| Production history expandable breaks existing KPI/staleness sections | LOW | MEDIUM | Keep existing sections untouched, only change table rows |
| `recipe_id` vs `id` confusion | MEDIUM | HIGH | Verify all API calls use `recipe_id`. Add comment. |

---

## Governance Updates Required

1. `control/registry.json` — update CR-031 artifact refs
2. `control/L7_FILE_OWNERSHIP.md` — no new frozen files
3. `control/L9_OPEN_GAPS_REGISTER.md` — note delete API probe result
4. `node control/gen_dashboard_data.js` — regenerate

---

*This plan supersedes the previous Artifact 2-3 (bug-fix-only plan). Implementation proceeds against UX freeze specs.*
