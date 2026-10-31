
---

## Addendum: P21 Catalogue Phase — Implementation Complete (28 May 2026)

> **Source:** Full catalogue implementation + testing
> **Testing:** 17/17 frontend features PASS, 19/19 backend pytest PASS
> **Actor:** Master (rid=1) — catalogue visible. Central/Franchise — catalogue hidden.

### Implementation Status

| Module | Route | Components | API Methods | Status |
|--------|-------|-----------|-------------|--------|
| Inventory Catalogue | `/catalogue/ingredients` | IngredientCatalogue, EditIngredientDialog, AddIngredientDialog | 7 (categories CRUD + add-inventory + update-stock) | **IMPLEMENTED** |
| Product Catalogue | `/catalogue/products` | ProductCatalogue, FoodFormDialog, FoodCategoriesTab, AddonsTab | 6 (foods CRUD + categories + addon-list) | **IMPLEMENTED** |
| Recipe Management | `/catalogue/recipes` | RecipeCatalogue, RecipeFormDialog, SubRecipeFormDialog | 6 (recipe CRUD via /recipe/ prefix + sub-recipe CRUD) | **IMPLEMENTED** |
| Addon-recipe Mgmt | `/catalogue/addon-recipes` | AddonRecipeCatalogue, AddonRecipeFormDialog | 6 (addon-recipe CRUD + orphan detection) | **IMPLEMENTED** |

### Shared Components

| Component | Used By |
|-----------|---------|
| `IngredientComposer` | RecipeFormDialog, SubRecipeFormDialog, AddonRecipeFormDialog |
| `useCatalogueCrud` hook | CategoriesTab (stock-item-categories) |

### Corrected Route Prefix

Recipe + sub-recipe endpoints use `/recipe/...` prefix, NOT `/product/...`:
- `GET /recipe/get-recipe` — canonical rich recipe list
- `GET /recipe/recipe/{id}` — single detail
- `POST /recipe/store-recipe` / `PUT /recipe/update-recipe/{id}` / `DELETE /recipe/delete-recipe/{id}`
- `GET /recipe/sub-recipes` / `POST /recipe/store-sub-recipe` / `PUT /recipe/update-sub-recipe/{id}`

### Role Visibility

- Master: ALL 4 catalogue nav items visible
- Central: HIDDEN
- Franchise: HIDDEN

### Normalization Layer

27 new api.js methods handle 5 different response wrapper patterns:
- Stock categories: `{success, data: []}` → extract `.data`
- Foods: `{foods: []}` → extract `.foods` + parse numeric strings
- Food categories: raw array → pass through
- Addons: `{addons: []}` → extract `.addons`
- Recipes/addon-recipes: `{recipes: []}` → extract `.recipes`

### Sub-recipe Frontend Validation

Backend `store-sub-recipe` has NO server-side validation (goes straight to SQL INSERT). Frontend validates `name`, `prepration_time`, `serve_people`, and `ingredients[]` before submit to avoid 500 SQL errors.

### No Regressions

Operations Hub, Stock Inventory, Pending Queues, Transfer lifecycle — all verified working after catalogue implementation.
