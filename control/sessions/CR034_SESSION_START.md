# Session-Start — CR-034 (Artifact #0)

---

## Session Context

| Field | Value |
|-------|-------|
| **Date** | 2026-06-14 |
| **Agent / Developer** | E1 Agent |
| **Sprint** | S3 |
| **Item ID** | CR-034 |
| **Item Title** | Recipe & Sub-Recipe API Contract Fix (POS Field Name Mismatch) |
| **Item Type** | CR |
| **Branch** | 14-june-1 |

## What I'm Working On

Fix POS API field-name mismatches that cause sub-recipe creation to fail (name=null, unit=null) and recipe creation to fail ("selected name is invalid"). The root cause is the frontend sending field names that the POS backend does not recognize. Investigation completed — this session is for the fix.

## Files I Expect to Touch

| File | Action | Reason |
|------|--------|--------|
| `frontend/src/components/central-inventory/SubRecipeMaster.jsx` | modify | Fix `handleSave()` payload: `name` → `sub_recipe_name`, `unit` → `subunit`, `ingredients` → `ingredient` (singular for create), ingredient items `{ingredient_id,...}` → `{id, qty, unit}` |
| `frontend/src/components/central-inventory/RecipeCatalogue.jsx` | modify | Fix `handleSave()` payload: `name` must be `food_id` (integer), `prepration_time` → `preparation_time`, `serve_people` → `serves_people`, ingredient items `{ingredient_id,...}` → `{id, qty, unit}`. Fix `handleDelete()`: must send `{reason: "..."}` body. |
| `frontend/src/services/api.js` | modify | `deleteRecipe()` must send JSON body with `reason` field |

## Pre-Conditions Verified

- [x] Read `control/L2_HANDOVER_PROTOCOL.md`
- [x] Read `control/L6_SPRINT_STATUS.md` for current sprint context
- [x] Checked `control/registry.json` — item will be registered as CR-034
- [x] Checked `control/L7_FILE_OWNERSHIP.md` — no frozen files in plan (SubRecipeMaster, RecipeCatalogue, api.js are all editable)
- [x] Terminology mapping understood (backend `master` = business Central)

## Risks / Concerns

1. **CREATE vs UPDATE inconsistency**: POS backend uses `ingredient` (singular) for sub-recipe CREATE but `ingredients` (plural) for sub-recipe UPDATE. Frontend must handle this split.
2. **Recipe `name` = `food_id`**: The POS store-recipe endpoint validates `name` as `Rule::in(food IDs)`. The `name` field must receive the integer `food_id`, NOT the food name string. This is counter-intuitive.
3. **Recipe `unit`/`qty` may not persist**: During investigation, the POS store-recipe endpoint returned `unit: null` and `qty: 0` even when sent. This may be a POS backend limitation unrelated to our fix.
4. **No breaking changes to existing flows**: The sub-recipe GET and recipe GET return different field formats from what CREATE/UPDATE expect. Must ensure we only transform on write, not read.

## Exit Criteria

- Sub-recipe CREATE works end-to-end (name + unit + ingredients all persist)
- Sub-recipe UPDATE works end-to-end
- Recipe CREATE works end-to-end
- Recipe UPDATE works end-to-end
- Recipe DELETE works (sends `reason`)
- No regression on existing read flows (list, detail)

---

*After session: update registry.json artifact refs and run the generator.*
