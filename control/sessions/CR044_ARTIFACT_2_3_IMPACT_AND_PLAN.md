# CR-044 — Manufactured Recipe → Auto Sub-Recipe (G-030)

> **Gates:** 2 + 3 combined | **Planned:** 2026-07-11 | **Agent:** PLANNING
> **Source:** `AI/openGaps/gap_validation.md` — G-030 FULLY RESOLVED
> **Code Reality:** NONE — no `is_manufactured` / `manufactured_sub_recipe_id` in frontend/src. Recipe creation exists (`RecipeCatalogue.jsx` line 233 → `api.createRecipe`).

---

## 1. Impact Analysis (Gate 2)

### What backend now provides (verified 2026-07-07)
`POST /recipe/store-recipe` with:
```json
{ "name": <food_id>, "is_manufactured": true,
  "manufacturing": { "output_qty":1, "output_unit":"batch", "consumption_unit":"piece", "converion_factor":10 },
  "ingredients": [{"id":18998,"qty":100,"unit":"gm"}, ...] }
```
→ single call creates: recipe + linked sub-recipe + FG inventory item. Response: `recipe_id`, `is_manufactured`, `manufactured_sub_recipe_id`, `fg_inventory_master_id`, `bom_ingredients`, `pos_ingredients` (`[{id: fg_id, qty, unit}]`).

Meaning: for batch-manufactured dishes, POS sale consumption points at the FG stock item, while production consumes the BOM via the auto sub-recipe (producible via existing Production Run — already supports sub-recipes).

### Data flow (target)
```
RecipeCatalogue create/edit form
  → "Batch manufactured?" toggle (default off)
  → ON: manufacturing fields (output_qty, output_unit, consumption_unit, converion_factor)
  → createRecipe(payload incl. is_manufactured + manufacturing)
  → success dialog: "Created: recipe + sub-recipe #{manufactured_sub_recipe_id} + FG stock item #{fg_inventory_master_id}"
  → recipe list row shows "Manufactured" badge (is_manufactured on read — probe read-shape)
```

### Known unknowns (R9 probes before coding)
1. Does `GET /recipe/get-recipe` list return `is_manufactured` / linkage fields? (Validation only shows store response.)
2. Update path: can an existing recipe be switched to manufactured via `update-recipe`? If not → toggle is create-only, disabled on edit with note.

### Affected files

| File | Change | Risk |
|------|--------|:---:|
| `frontend/src/components/central-inventory/RecipeCatalogue.jsx` | Toggle + 4 manufacturing fields in recipe form (submit ~line 233); success linkage dialog; "Manufactured" list badge | MEDIUM |
| `frontend/src/components/central-inventory/SubRecipeMaster.jsx` | Optional: "Auto (from recipe)" badge on manufactured sub-recipes — only if read-shape probe confirms a distinguishing field; else skip | LOW |

api.js unchanged — `createRecipe` passes payload through.

### Conflict pre-check
- `RecipeCatalogue.jsx`: CR-043 (this batch) adds lock badges. **Execution order: after CR-043** (or same session sequential).
- `SubRecipeMaster.jsx`: BUG-034 (QA pending) — additive, parallel-safe.

### Open Questions (owner)
1. Manufacturing unit fields: free-text units consistent with existing recipe form conventions, or constrained select? (Existing form conventions to be mirrored.)
2. If update-recipe can't toggle manufactured post-creation (probe), create-only acceptable for v1?

## 2. Implementation Plan (Gate 3)

### Edits

**Edit 1 — RecipeCatalogue.jsx form.** Add `isManufactured` + `manufacturing {output_qty, output_unit, consumption_unit, converion_factor}` state. Toggle `data-testid="recipe-manufactured-toggle"`; when ON, reveal 4 inputs (number/text/text/number) with helper: "Producing {output_qty} {output_unit} yields {converion_factor} {consumption_unit} of finished goods". Validate: all 4 required when toggle ON.

**Edit 2 — RecipeCatalogue.jsx submit (~line 233).** When ON, merge `is_manufactured: true, manufacturing: {...}` into createRecipe payload (note API typo key `converion_factor`). On success with `manufactured_sub_recipe_id`: success toast/dialog listing sub-recipe id + FG item id, link "View in Production" → `/production/new`.

**Edit 3 — RecipeCatalogue.jsx list.** `is_manufactured` (if returned on list — per probe) → `Badge` "Manufactured" `data-testid="recipe-manufactured-badge-{id}"`.

**Edit 4 (conditional) — SubRecipeMaster.jsx.** If probe confirms manufactured-origin field on sub-recipes list → "Auto" badge. Otherwise SKIP (do not guess — R3).

### Execution sequence
R9 probes (get-recipe read shape; update-recipe manufactured toggle) → Edits 1-3 → conditional Edit 4.

### Scope lock
- **WILL change:** `RecipeCatalogue.jsx`, conditionally `SubRecipeMaster.jsx`
- **Will NOT touch:** api.js, ProductionRunForm (manufactured sub-recipes flow through existing production), server.py

### Verification Matrix

| # | File | Change | How to Verify | Automated? |
|---|------|--------|---------------|:---:|
| 1 | probe | read/update shape | curl get-recipe → check is_manufactured presence | YES |
| 2 | form | e2e create | Create manufactured recipe on 835 → response has all 6 spec fields; sub-recipe appears in SubRecipeMaster; FG item in inventory master | YES (curl) + UI |
| 3 | form | validation | Toggle ON + empty fields → blocked with message | NO |
| 4 | regression | normal recipe | Non-manufactured create unchanged | NO |

### Post-code registry checklist
- [ ] registry.json: CR-044 → IMPLEMENTED · L3 · L7 · `// CR-044` markers · dashboard `--check` PASS
