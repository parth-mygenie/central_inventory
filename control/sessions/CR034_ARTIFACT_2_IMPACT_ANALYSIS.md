# CR-034 — Impact Analysis (Artifact #2)

# Recipe & Sub-Recipe API Contract Fix — Impact Analysis

---

## Files Affected

| # | File | Lines Now | Change Type | Risk |
|---|------|:---------:|-------------|:----:|
| 1 | `frontend/src/components/central-inventory/SubRecipeMaster.jsx` | 429 | Modify `handleSave()` payload (lines 211-233) | LOW |
| 2 | `frontend/src/components/central-inventory/RecipeCatalogue.jsx` | 357 | Modify `handleSave()` payload (lines 210-228), `handleDelete()` (lines 230-238) | LOW |
| 3 | `frontend/src/services/api.js` | 1140 | Modify `deleteRecipe()` (line 777) | LOW |

**Total: 3 files, ~30 lines changed. All frontend-only.**

---

## Change Detail Per File

### 1. `SubRecipeMaster.jsx` — `handleSave()` (lines 211-233)

**Current payload (BROKEN):**
```javascript
const payload = {
  name, food_name: name,
  prepration_time: Number(prepTime),
  serve_people: 1,
  unit, qty: Number(qty),
  ingredients: ingredients.filter(...).map(i => ({
    ingredient_id: Number(i.ingredient_id),
    ingredient_qty: Number(i.ingredient_qty),
    ingredient_unit: i.ingredient_unit,
  })),
};
if (recipe) await api.updateSubRecipe(recipe.recipe_id, payload);
else await api.createSubRecipe(payload);
```

**Required changes:**
1. Add `sub_recipe_name: name` field
2. Add `subunit: unit` field (keep `unit` too for backwards compat)
3. For CREATE: use `ingredient` (singular) key with `{id, qty, unit}` items
4. For UPDATE: use `ingredients` (plural) key with `{id, qty, unit}` items + add `serve_time: 0`
5. Split create vs update payload construction since they differ

**Risk:** LOW — isolated to the save handler. No read-side changes. No shared state mutations.

### 2. `RecipeCatalogue.jsx` — `handleSave()` (lines 210-228)

**Current payload (BROKEN):**
```javascript
const payload = {
  food_name: name, name,
  food_id: foodId ? Number(foodId) : undefined,
  prepration_time: Number(prepTime), serve_people: Number(serves),
  qty: Number(outputQty), unit: outputUnit,
  ingredients: ingredients.filter(...).map(i => ({
    ingredient_id: Number(i.ingredient_id),
    ingredient_qty: Number(i.ingredient_qty),
    ingredient_unit: i.ingredient_unit,
  })),
};
```

**Required changes:**
1. `name` → `Number(foodId)` (the food_id as integer, not the name string)
2. `prepration_time` → `preparation_time` (correct spelling for POS validation)
3. `serve_people` → `serves_people` (with 's')
4. Ingredient items: `{ingredient_id, ingredient_qty, ingredient_unit}` → `{id, qty, unit}`
5. Keep `food_name`, `food_id`, `unit`, `qty` as-is

**Also: `handleDelete()`** (line 230-238):
- Currently: `await api.deleteRecipe(recipe.id || recipe.recipe_id)`
- Needs: reason parameter passed through

**Risk:** LOW — same isolation as SubRecipeMaster. The `name = food_id` change is the most counter-intuitive part but is confirmed working via investigation.

### 3. `api.js` — `deleteRecipe()` (line 777)

**Current:**
```javascript
function deleteRecipe(id) { return client.delete(`/proxy/v2/recipe/delete-recipe/${id}`); }
```

**Required:**
```javascript
function deleteRecipe(id) {
  return client.delete(`/proxy/v2/recipe/delete-recipe/${id}`, {
    data: { reason: "Deleted from Central Inventory" }
  });
}
```

**Risk:** LOW — Axios `.delete()` with `{data: ...}` sends the body. This is the standard Axios pattern for DELETE with body.

---

## APIs Used (No Changes to Endpoints)

| API | Method | Endpoint | Change |
|-----|--------|----------|--------|
| createSubRecipe | POST | `/proxy/v2/recipe/store-sub-recipe` | Payload fields only |
| updateSubRecipe | PUT | `/proxy/v2/recipe/update-sub-recipe/{id}` | Payload fields only |
| createRecipe | POST | `/proxy/v2/recipe/store-recipe` | Payload fields only |
| updateRecipe | PUT | `/proxy/v2/recipe/update-recipe/{id}` | Payload fields only |
| deleteRecipe | DELETE | `/proxy/v2/recipe/delete-recipe/{id}` | Add body `{reason}` |

No new API methods. No endpoint URL changes. No cache invalidation changes needed.

---

## Dependencies & Cross-Impact

| Component | Impact | Risk |
|-----------|--------|:----:|
| `SubRecipeMaster.jsx` read path (loading form from API) | NONE — read uses `recipe.name`, `recipe.unit`, `recipe.ingredients[].ingredient_id` which are unchanged | NONE |
| `RecipeCatalogue.jsx` read path (loading form from API) | NONE — read uses `d.name`, `d.unit`, `d.ingredients[].ingredient_id` which are unchanged | NONE |
| `ProductionRunForm.jsx` (uses sub-recipes) | NONE — only reads sub-recipe list, doesn't create | NONE |
| `ProductionHistory.jsx` | NONE — read-only | NONE |
| `api.js` cache layer | `deleteRecipe` already doesn't have cache invalidation. No change needed. | NONE |
| `AddonRecipeCatalogue.jsx` | NOT INVESTIGATED — separate endpoints (`/product/store-addon-recipe`). May have similar issues but out of scope. | DEFERRED |
| `backend/server.py` | NONE — proxy passes JSON bodies through unchanged | NONE |

---

## Frozen File Check

| File | Frozen? | Status |
|------|:-------:|--------|
| `SubRecipeMaster.jsx` | No | Safe to modify |
| `RecipeCatalogue.jsx` | No | Safe to modify |
| `api.js` | No | Safe to modify |
| `terminology.js` | **YES** | NOT TOUCHED |
| `screenVisibility.js` | **YES** | NOT TOUCHED |
| `server.py` | **YES (by policy)** | NOT TOUCHED |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| CREATE vs UPDATE ingredient key mismatch (`ingredient` vs `ingredients`) breaks one path | LOW | HIGH | Split payload construction with explicit `isCreate` branch |
| Recipe `name = food_id` regression if food_id is not set | MEDIUM | HIGH | Validate `foodId` is set before save; show error if not |
| Addon-recipe has same issues | MEDIUM | MEDIUM | Out of scope — log for separate investigation |
| POS API changes field names again | LOW | HIGH | Document contract in this artifact for future reference |

---

## Estimated Effort

| Task | Time |
|------|------|
| SubRecipeMaster.jsx payload fix | 15 min |
| RecipeCatalogue.jsx payload fix | 15 min |
| api.js deleteRecipe fix | 5 min |
| Manual QA (create, update, delete for both types) | 20 min |
| **Total** | ~55 min |

---

## Recommendation

**Proceed to implementation.** All changes are isolated payload transformations in 3 files. No architectural changes. No frozen files touched. Risk is LOW with the mitigation of splitting create vs update payloads explicitly.
