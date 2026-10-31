# BUG-047 — Addon Recipe CRUD Broken (Create/Save/Delete All Fail)

> **Registered:** 2026-07-24
> **Severity:** P1 — HIGH (core CRUD feature completely non-functional)
> **Source:** OWNER-REPORTED + AGENT-CONFIRMED (Investigation role)
> **Related:** BUG-046 (identical name auto-fill pattern, fixed for regular RecipeCatalogue)
> **Duplicate Check:** DISTINCT (no prior addon recipe bug registered)

---

## Description

Addon Recipe creation is 100% broken. When a user navigates to Product Catalog → Addon Recipes → Add Addon Recipe, selects a linked addon, adds ingredients, and clicks "Create Addon Recipe", the API returns **"The given data was invalid"** and the recipe is NOT created.

Additionally, the "Recipe Name" field does not auto-populate when selecting a linked addon (unlike the regular RecipeCatalogue which auto-fills from the food name).

---

## Evidence

### Screenshot
Owner-provided screenshot showing:
- Restaurant: "hells kitchen" (Central Store)
- Products → Addon Recipes tab
- "New Addon Recipe" form with "poi" addon selected
- Error toast: "The given data was invalid."

### Curl Evidence (4 distinct failures confirmed)

**Failure 1 — Missing required fields:**
```
POST /proxy/v2/product/store-addon-recipe
Payload: {"name":"test","addon_name":"test","addon_id":35,"ingredients":[...]}
Response: {
  "errors": {
    "preparation_time": ["The preparation time field is required."],
    "serves_people": ["The serves people field is required."]
  }
}
```

**Failure 2 — Wrong ingredient key format:**
```
POST /proxy/v2/product/store-addon-recipe
Payload: {...,"preparation_time":0,"serves_people":1,"ingredients":[{"ingredient_id":1192,"ingredient_qty":100,"ingredient_unit":"ltr"}]}
Response: {
  "message": "Undefined array key \"id\"",
  "exception": "ErrorException",
  "file": "AddOnController.php", "line": 850
}
```

**Success — Corrected payload:**
```
POST /proxy/v2/product/store-addon-recipe
Payload: {...,"preparation_time":0,"serves_people":1,"serve_time":0,"ingredients":[{"id":1192,"qty":100,"unit":"ltr"}]}
Response: {"recipe_id": 9825, "name": "Bacon", ...} ← SUCCESS
```

**Failure 3 — Delete missing reason:**
```
DELETE /proxy/v2/product/delete-addon-recipe/9824
Response: {"errors": {"reason": ["The reason field is required."]}}
```

### Steps to Reproduce
1. Login as any Central Store user with addons
2. Navigate to Products → Addon Recipes tab
3. Click "+ Add Addon Recipe"
4. Select a linked addon from dropdown (note: Recipe Name does NOT auto-fill)
5. Type a name, add ingredients, click "Create Addon Recipe"
6. **Result:** Error toast "The given data was invalid"

---

## Root Causes (4 sub-issues)

### RC-1: Recipe Name Auto-Fill Missing
- **File:** `AddonRecipeCatalogue.jsx` line 200
- **Bug:** `onValueChange={setAddonId}` — only sets addon ID, doesn't auto-fill name
- **Expected:** Should match RecipeCatalogue pattern: `setAddonId(v); setName(addon.name)`
- **Reference:** `RecipeCatalogue.jsx` line 330 does this correctly for foods

### RC-2: Missing Required Fields in Payload
- **File:** `AddonRecipeCatalogue.jsx` lines 164-168
- **Bug:** Payload missing `preparation_time`, `serves_people`, `serve_time`
- **Fix:** Add `preparation_time: 0, serves_people: 1, serve_time: 0` to payload
- **Reference:** `RecipeCatalogue.jsx` lines 263-265 includes these fields

### RC-3: Ingredient Format Mismatch
- **File:** `AddonRecipeCatalogue.jsx` lines 166-168
- **Bug:** Sends `{ingredient_id, ingredient_qty, ingredient_unit}` — API expects `{id, qty, unit}`
- **Fix:** Map ingredients to `{id: Number(...), qty: Number(...), unit: ...}`
- **Reference:** `RecipeCatalogue.jsx` line 257 uses correct format

### RC-4: Delete Missing `reason` Body
- **File:** `api.js` line 920
- **Bug:** `deleteAddonRecipe(id)` sends no body — API requires `{reason: "..."}`
- **Fix:** Add `{ data: { reason: "Deleted from Central Inventory" } }`
- **Reference:** `deleteRecipe()` (api.js) already does this correctly

---

## Blast Radius

- **~7 files, ~46 lines** referencing addon recipe pattern
- **Hotspot files touched:** YES — `api.js` (HIGH-RISK, line 920)
- **Estimated scope:** SMALL (2 files need changes)
- **Files that need changes:**
  - `frontend/src/components/central-inventory/AddonRecipeCatalogue.jsx` (RC-1, RC-2, RC-3)
  - `frontend/src/services/api.js` (RC-4)

---

## Open Questions

None — all root causes confirmed with curl evidence. No business rule ambiguity.

---

## Classification

| Field | Value |
|-------|-------|
| Category | Frontend bug |
| Action | Hand to PLANNING → IMPLEMENTATION |
| Backend gap? | None — POS API works correctly with proper payload |
| Data issue? | None |
