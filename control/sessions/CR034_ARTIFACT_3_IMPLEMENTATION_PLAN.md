# CR-034 — Implementation Plan (Artifact #3)

# Recipe & Sub-Recipe API Contract Fix — Step-by-Step Plan

---

## Overview

3 files, 3 tasks, each with exact line targets and before/after code. No new files. No new dependencies. Frontend-only.

---

## Task 1: `SubRecipeMaster.jsx` — Fix `handleSave()` payload

**File:** `frontend/src/components/central-inventory/SubRecipeMaster.jsx`
**Lines:** 211–233

### Current Code (lines 214–225)

```javascript
const payload = {
  name, food_name: name,
  prepration_time: Number(prepTime),
  serve_people: 1,
  unit, qty: Number(qty),
  ingredients: ingredients.filter(i => i.ingredient_id && Number(i.ingredient_qty) > 0).map(i => ({
    ingredient_id: Number(i.ingredient_id),
    ingredient_qty: Number(i.ingredient_qty),
    ingredient_unit: i.ingredient_unit,
  })),
};
if (recipe) await api.updateSubRecipe(recipe.recipe_id, payload);
else await api.createSubRecipe(payload);
```

### Target Code

```javascript
const validIngredients = ingredients
  .filter(i => i.ingredient_id && Number(i.ingredient_qty) > 0)
  .map(i => ({ id: Number(i.ingredient_id), qty: Number(i.ingredient_qty), unit: i.ingredient_unit }));

if (recipe) {
  // UPDATE: POS expects ingredients (plural), sub_recipe_name, subunit, serve_time
  await api.updateSubRecipe(recipe.recipe_id, {
    sub_recipe_name: name,
    subunit: unit,
    prepration_time: Number(prepTime),
    serve_time: 0,
    serve_people: 1,
    qty: Number(qty),
    ingredients: validIngredients,
  });
} else {
  // CREATE: POS expects ingredient (SINGULAR), sub_recipe_name, subunit
  await api.createSubRecipe({
    sub_recipe_name: name,
    food_name: name,
    subunit: unit,
    prepration_time: Number(prepTime),
    serve_people: 1,
    qty: Number(qty),
    ingredient: validIngredients,
  });
}
```

### Changes Summary

| Field | Old | New | Applies To |
|-------|-----|-----|-----------|
| Recipe name | `name` | `sub_recipe_name` | CREATE + UPDATE |
| Unit | `unit` | `subunit` | CREATE + UPDATE |
| Ingredients key | `ingredients` (plural) | `ingredient` (singular) for CREATE, `ingredients` (plural) for UPDATE | Split |
| Ingredient items | `{ingredient_id, ingredient_qty, ingredient_unit}` | `{id, qty, unit}` | CREATE + UPDATE |
| serve_time | (missing) | `serve_time: 0` | UPDATE |
| food_name | present | present | CREATE only |

### Test Checkpoint

```bash
# Login
TOKEN=$(curl -s -X POST "$API_URL/api/proxy/auth/login" -H "Content-Type: application/json" -d '{"email":"manager@germanfluid.com","password":"Qplazm@10"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# Create sub-recipe via UI, then verify:
curl -s "$API_URL/api/proxy/v2/recipe/sub-recipes" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; [print(f'{sr[\"recipe_id\"]}: {sr[\"name\"]} ({sr[\"unit\"]}, {len(sr[\"ingredients\"])} ing)') for sr in json.load(sys.stdin).get('sub_recipes',[])]"
```

---

## Task 2: `RecipeCatalogue.jsx` — Fix `handleSave()` + `handleDelete()`

**File:** `frontend/src/components/central-inventory/RecipeCatalogue.jsx`
**Lines:** 210–238

### handleSave — Current (lines 213–221)

```javascript
const payload = {
  food_name: name, name,
  food_id: foodId ? Number(foodId) : undefined,
  prepration_time: Number(prepTime), serve_people: Number(serves),
  qty: Number(outputQty), unit: outputUnit,
  ingredients: ingredients.filter(i => i.ingredient_id && Number(i.ingredient_qty) > 0).map(i => ({
    ingredient_id: Number(i.ingredient_id), ingredient_qty: Number(i.ingredient_qty), ingredient_unit: i.ingredient_unit,
  })),
};
if (recipe) await api.updateRecipe(recipe.id || recipe.recipe_id, payload);
else await api.createRecipe(payload);
```

### handleSave — Target

```javascript
const validIngredients = ingredients
  .filter(i => i.ingredient_id && Number(i.ingredient_qty) > 0)
  .map(i => ({ id: Number(i.ingredient_id), qty: Number(i.ingredient_qty), unit: i.ingredient_unit }));

const payload = {
  name: foodId ? Number(foodId) : undefined,
  food_name: name,
  food_id: foodId ? Number(foodId) : undefined,
  preparation_time: Number(prepTime),
  serves_people: Number(serves),
  serve_time: 0,
  qty: Number(outputQty),
  unit: outputUnit,
  ingredients: validIngredients,
};
if (recipe) await api.updateRecipe(recipe.id || recipe.recipe_id, payload);
else await api.createRecipe(payload);
```

### handleSave Changes Summary

| Field | Old | New |
|-------|-----|-----|
| `name` | `name` (string) | `Number(foodId)` (integer = food_id) |
| `prepration_time` | typo | `preparation_time` (correct spelling) |
| `serve_people` | no 's' | `serves_people` (with 's') |
| `serve_time` | (missing) | `0` |
| Ingredient items | `{ingredient_id, ingredient_qty, ingredient_unit}` | `{id, qty, unit}` |

### handleSave Validation Note

The `food_id` must be selected for save to work. Currently `valid` check on line 343 only checks `name.trim()`. Should add `foodId` check for create mode to prevent sending `name: undefined`.

### handleDelete — Current (line 233)

```javascript
await api.deleteRecipe(recipe.id || recipe.recipe_id);
```

### handleDelete — Target

No change needed here — the `reason` will be added at the `api.js` layer (Task 3). The component doesn't need to know about it.

### Test Checkpoint

```bash
# Create a food, then create a recipe for it via UI:
# 1. Go to Products > Foods > Add Food
# 2. Go to Products > Recipes > Add Recipe > Select the food > Add ingredients > Save
# 3. Verify recipe appears in list
```

---

## Task 3: `api.js` — Fix `deleteRecipe()`

**File:** `frontend/src/services/api.js`
**Line:** 777

### Current

```javascript
function deleteRecipe(id) { return client.delete(`/proxy/v2/recipe/delete-recipe/${id}`); }
```

### Target

```javascript
function deleteRecipe(id) {
  return client.delete(`/proxy/v2/recipe/delete-recipe/${id}`, {
    data: { reason: "Deleted from Central Inventory" }
  });
}
```

### Note

Axios `delete()` requires the body in `{data: {...}}` config param (unlike `post`/`put` which take body as second arg).

---

## Execution Order

| Step | Task | File | Blocking? |
|:----:|------|------|:---------:|
| 1 | Fix SubRecipeMaster payload | SubRecipeMaster.jsx | No |
| 2 | Fix RecipeCatalogue payload | RecipeCatalogue.jsx | No |
| 3 | Fix deleteRecipe body | api.js | No |

All 3 tasks are **independent** — can be executed in parallel.

---

## QA Plan (for Artifact #5)

| # | Test | Method | Pass Criteria |
|---|------|--------|--------------|
| Q1 | Create sub-recipe | UI | Name + unit + ingredients persist. Appears in list. |
| Q2 | Update sub-recipe | UI | Name/qty/ingredients change. Verified via API GET. |
| Q3 | Delete sub-recipe | UI | Removed from list. |
| Q4 | Create recipe | UI | Linked to food. Ingredients persist. Appears in list. |
| Q5 | Update recipe | UI | Changes persist. Verified via API GET. |
| Q6 | Delete recipe | UI | Removed from list. No validation error. |
| Q7 | Existing sub-recipes load | UI | All 4 existing sub-recipes display correctly. |
| Q8 | Existing recipes load | UI | All 2 existing recipes display correctly. |

---

## Rollback

If any task causes regression, revert the single file via git. No database migrations. No backend changes. Clean rollback.
