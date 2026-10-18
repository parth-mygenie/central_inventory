
---

## Addendum: P21 Catalogue Gaps — Implementation Complete (28 May 2026)

> **Testing:** 17/17 frontend PASS, 30/30 backend PASS
> **Gaps closed:** Food Category CRUD, Addon Master CRUD, Ingredient Rename

### Implemented

| Gap | What Was Added | Key Route Quirk |
|-----|---------------|-----------------|
| A: Food Category CRUD | Create/Edit/Delete in FoodCategoriesTab + FoodCategoryFormDialog | Update uses **POST** (not PUT) |
| B: Addon Master CRUD | Create/Edit/Delete in AddonsTab + AddonFormDialog | Update route: `addon-update/{id}` (noun-verb) |
| C: Ingredient Rename | stock_title field in EditIngredientDialog + rename warning UX | Standard PUT to `/update-stock/{id}` |

### API Methods Added to api.js

| Method | Route | HTTP |
|--------|-------|------|
| `createFoodCategory(payload)` | `/product/add-categories` | POST |
| `updateFoodCategory(id, payload)` | `/product/update-categories/{id}` | **POST** |
| `deleteFoodCategory(id)` | `/product/delete-categories/{id}` | DELETE |
| `createAddon(payload)` | `/product/add-addon` | POST |
| `updateAddon(id, payload)` | `/product/addon-update/{id}` | **PUT** |
| `deleteAddon(id)` | `/product/delete-addon/{id}` | DELETE |

### Rename Warning UX

When ingredient name is changed, first Save shows amber warning: "This name may be used in recipes, transfers, and reports." Button text changes to "Confirm Rename & Save". Second click executes the update.

### No Regressions

Recipes page, Addon-recipes page, Operations Hub — all verified working.
