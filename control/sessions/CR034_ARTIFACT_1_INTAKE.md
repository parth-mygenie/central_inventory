# CR-034 — Intake (Artifact #1)

# Recipe & Sub-Recipe API Contract Fix

---

## Problem Statement

Sub-recipe and recipe creation from the Central Inventory frontend **fail silently or with cryptic errors** because the frontend sends field names that the POS backend (`preprod.mygenie.online`) does not recognize. Discovered via focused API investigation on 2026-06-14.

### Symptoms Reported

1. **Sub-recipe CREATE**: POS returns `Integrity constraint violation: Column 'name' cannot be null` — the name never reaches the database.
2. **Sub-recipe CREATE**: Unit is also null in the database insert.
3. **Recipe CREATE**: POS returns `The selected name is invalid` — the `name` field fails validation.

### Root Cause

The POS API endpoints use **different field names** than what the frontend sends. The mismatch was never caught because these endpoints were wired during CR-011 (P21 Catalogue CRUD, pre-governance) without exhaustive API contract validation.

---

## Scope

### In Scope

| # | Bug | Affected Operation | Files |
|---|-----|--------------------|-------|
| 1 | `name` → `sub_recipe_name` | Sub-recipe CREATE & UPDATE | `SubRecipeMaster.jsx` |
| 2 | `unit` → `subunit` | Sub-recipe CREATE & UPDATE | `SubRecipeMaster.jsx` |
| 3 | `ingredients[]` → `ingredient[]` (singular) | Sub-recipe CREATE only | `SubRecipeMaster.jsx` |
| 4 | Ingredient items `{ingredient_id, ingredient_qty, ingredient_unit}` → `{id, qty, unit}` | Sub-recipe CREATE & UPDATE, Recipe CREATE & UPDATE | `SubRecipeMaster.jsx`, `RecipeCatalogue.jsx` |
| 5 | Recipe `name` must be `food_id` (integer), not food name string | Recipe CREATE & UPDATE | `RecipeCatalogue.jsx` |
| 6 | `prepration_time` → `preparation_time` (correct spelling) | Recipe CREATE & UPDATE | `RecipeCatalogue.jsx` |
| 7 | `serve_people` → `serves_people` | Recipe CREATE & UPDATE | `RecipeCatalogue.jsx` |
| 8 | `serve_time: 0` required | Sub-recipe UPDATE | `SubRecipeMaster.jsx` |
| 9 | Recipe DELETE requires `{reason: "..."}` body | Recipe DELETE | `api.js` |

### Out of Scope

- **Recipe `unit`/`qty` not persisting on POS side**: During investigation, the store-recipe response returned `unit: null` and `qty: 0`. This appears to be a POS backend limitation, not a field name mismatch. Logged but not fixed here.
- **Addon-recipe CRUD**: Not reported as broken. Needs separate investigation if required.
- **Backend `server.py`**: Proxy-only, no changes needed — the proxy passes through JSON bodies correctly.

---

## Requirements

### R1: Sub-Recipe Create Must Succeed
- Frontend `handleSave()` (create path) sends: `sub_recipe_name`, `food_name`, `subunit`, `prepration_time`, `serve_people`, `qty`, `ingredient` (singular array with `{id, qty, unit}` items)
- POS API returns success with created sub-recipe data

### R2: Sub-Recipe Update Must Succeed
- Frontend `handleSave()` (update path) sends: `sub_recipe_name`, `subunit`, `serve_time`, `prepration_time`, `serve_people`, `qty`, `ingredients` (plural array with `{id, qty, unit}` items)
- POS API returns success with updated sub-recipe data

### R3: Recipe Create Must Succeed
- Frontend `handleSave()` (create path) sends: `name` = food_id (integer), `food_id`, `preparation_time`, `serves_people`, `unit`, `qty`, `ingredients` (plural array with `{id, qty, unit}` items)
- POS API returns success with created recipe data

### R4: Recipe Update Must Succeed
- Same field mapping as R3 for the update payload

### R5: Recipe Delete Must Succeed
- `api.deleteRecipe(id)` sends DELETE with JSON body `{reason: "Deleted from Central Inventory"}`
- POS API returns success

### R6: No Regression on Read Flows
- Sub-recipe list and detail views continue to work (they use GET endpoints, unaffected)
- Recipe list and detail views continue to work
- Existing sub-recipe/recipe editing (loading data into form) is unaffected — the read response uses `{ingredient_id, ingredient_qty, ingredient_unit}` which is fine for display

---

## API Contract Reference (Validated by Investigation)

### Sub-Recipe Store (`POST /recipe/store-sub-recipe`)

**Correct payload:**
```json
{
  "sub_recipe_name": "Name",
  "food_name": "Name",
  "prepration_time": 0,
  "serve_people": 1,
  "subunit": "piece",
  "qty": 1,
  "ingredient": [
    {"id": 17632, "qty": 10, "unit": "gm"}
  ]
}
```

### Sub-Recipe Update (`PUT /recipe/update-sub-recipe/{id}`)

**Correct payload:**
```json
{
  "sub_recipe_name": "Name",
  "subunit": "piece",
  "prepration_time": 5,
  "serve_time": 0,
  "serve_people": 1,
  "qty": 2,
  "ingredients": [
    {"id": 17632, "qty": 20, "unit": "gm"}
  ]
}
```

### Recipe Store (`POST /recipe/store-recipe`)

**Correct payload:**
```json
{
  "name": 206294,
  "food_id": 206294,
  "preparation_time": 10,
  "serves_people": 1,
  "unit": "piece",
  "qty": 1,
  "ingredients": [
    {"id": 17632, "qty": 10, "unit": "gm"}
  ]
}
```

### Recipe Update (`PUT /recipe/update-recipe/{id}`)

Same as store payload.

### Recipe Delete (`DELETE /recipe/delete-recipe/{id}`)

**Requires body:** `{"reason": "..."}`

---

## Evidence (Investigation Curls)

All investigation was performed on 2026-06-14 using the `manager@germanfluid.com` (RID 806) account. Key findings:

1. Sub-recipe create with `name`/`unit` → SQL null error (confirmed direct to POS)
2. Sub-recipe update validation → revealed `sub_recipe_name` and `subunit` field names
3. Sub-recipe create with `sub_recipe_name`/`subunit`/`ingredient` → **SUCCESS**
4. Recipe create with `name: "food name"` → "selected name is invalid"
5. Recipe create with `name: food_id` (integer) → **SUCCESS** (recipe_id 9094)
6. Recipe delete without `reason` → validation error
7. All test data was cleaned up after investigation.
