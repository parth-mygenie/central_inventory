# P21-Catalogue — Inventory, Product & Recipe Catalogue Management

> **Status:** PLANNING + API VALIDATION — no code changes
> **Author:** E1 agent, 27 May 2026
> **Depends on:** P20 stock-inventory, existing inventory/transfer system
> **API validation:** 30 probes against live POS API (preprod.mygenie.online)
> **Curl evidence:** `AI/curls/p21_catalogue_curls.sh`

---

## 0. API Validation Summary — Live POS (27 May 2026)

### Endpoint Status Matrix

#### Inventory Catalogue

| # | Endpoint | Method | HTTP | Status | Notes |
|---|----------|--------|------|--------|-------|
| V1 | `/inventory/stock-item-categories` | GET | 200 | **WORKING** | `{success, data: [{id, category_name, restaurant_id, type, p_catid}]}` |
| V10 | `/inventory/stock-item-categories/get/{id}` | GET | 200 | **WORKING** | `{success, data: {...}}` |
| V23 | `/inventory/stock-item-categories/store` | POST | 422 | **WORKING** | Validates `category_name` required |
| V29 | `/inventory/stock-item-categories/update/{id}` | PUT | 422 | **WORKING** | Validates `category_name` required |
| V26 | `/inventory/stock-item-categories/delete/{id}` | DELETE | 404 | **WORKING** | "Category not found" for invalid ID |
| V12 | `/inventory/add-inventory` | POST | 400 | **WORKING** | "No valid items to process" on empty array |
| V27 | `/inventory/update-stock/{id}` | PUT | 400 | **WORKING** | "No changes made." on empty body |

#### Product Catalogue

| # | Endpoint | Method | HTTP | Status | Notes |
|---|----------|--------|------|--------|-------|
| V2 | `/product/foods-list` | GET | 200 | **WORKING** | `{foods: [{...}], restaurant_settings: {...}}` |
| V3 | `/product/categories` | GET | 200 | **WORKING** | Raw array `[{id, name, image, ...}]` |
| V4 | `/product/addon-list` | GET | 200 | **WORKING** | `{addons: [{id, name, price, status}]}` |
| V21 | `/product/add-food` | POST | 422 | **WORKING** | Validates `category_id`, `price` required |
| V28 | `/product/foods/{id}` | PUT | 422 | **WORKING** | Validates `price` required |
| — | `/product/delete/{id}` | DELETE | — | **ASSUMED** | Not destructively tested; route pattern consistent |

#### Recipe Catalogue — BLOCKER

| # | Endpoint | Method | HTTP | Status | Notes |
|---|----------|--------|------|--------|-------|
| V5 | `/product/recipes` | GET | **404** | **NOT FOUND** | `NotFoundHttpException` — route NOT registered |
| V6 | `/product/get-recipe` | GET | **404** | **NOT FOUND** | Legacy alias also missing |
| — | `/product/recipe/{id}` | GET | **404** | **NOT FOUND** | Single recipe detail missing |
| — | `/product/store-recipe` | POST | **404** | **NOT FOUND** | Create recipe missing |
| — | `/product/update-recipe/{id}` | PUT | — | **NOT FOUND** | Update recipe missing |
| — | `/product/delete-recipe/{id}` | DELETE | — | **NOT FOUND** | Delete recipe missing |

#### Sub-Recipe Catalogue — BLOCKER

| # | Endpoint | Method | HTTP | Status | Notes |
|---|----------|--------|------|--------|-------|
| V7 | `/product/sub-recipes` | GET | **404** | **NOT FOUND** | Route NOT registered |
| V25 | `/product/store-sub-recipe` | POST | **404** | **NOT FOUND** | Route NOT registered |
| — | `/product/update-sub-recipe/{id}` | PUT | — | **NOT FOUND** | Assumed NOT registered |

#### Addon-Recipe Catalogue

| # | Endpoint | Method | HTTP | Status | Notes |
|---|----------|--------|------|--------|-------|
| V8 | `/product/addon-recipe-list` | GET | 200 | **WORKING** | `{recipes: [{recipe_id, addon_id, name, ingredients:[...]}]}` |
| V20 | `/product/addon-recipe/{id}` | GET | 200 | **WORKING** | `{recipe: {recipe_id, addon_name, ingredients:[...]}}` |
| V9 | `/product/addons-without-recipe` | GET | 200 | **WORKING** | `{addons: []}` (0 orphans currently) |
| V22 | `/product/store-addon-recipe` | POST | 422 | **WORKING** | Validates addon_id, preparation_time, serves_people, ingredients |
| V30 | `/product/update-addon-recipe/{id}` | PUT | 422 | **WORKING** | Same validation as store |
| — | `/product/delete-addon-recipe/{id}` | DELETE | — | **ASSUMED** | Route pattern consistent |

### CRITICAL BLOCKER: Recipe + Sub-Recipe Routes Not Registered

**All 8 recipe and sub-recipe endpoints return 404** (Laravel `NotFoundHttpException`). These routes are NOT registered in the vendoremployee V2 route group on the current preprod build.

**Impact:**
- Phase 3 (Recipe Management) is **BLOCKED** until POS backend registers these routes
- Phase 3 Sub-recipe management is **BLOCKED**
- Addon-recipe management (Phase 4) is NOT blocked — those routes work independently

**Recommendation:** Proceed with Phase 1 (Inventory) + Phase 2 (Product) + Phase 4 (Addon-Recipe). Defer Phase 3 until recipe routes are confirmed registered.

---

## 1. Response Shape Analysis

### 1.1 Inventory Stock Categories

**List:** `{success: true, data: [{id, category_name, restaurant_id, type, p_catid, created_at, updated_at}]}`
**Get:** `{success: true, data: {id, category_name, ...}}`
**Store validation:** `{message, errors: {category_name: [...]}}`
**Update validation:** Same shape as store
**Delete (not found):** `{success: false, message: "Category not found"}`

**Normalization needs:** Wrapped in `{success, data}` — extract `.data` from response.

### 1.2 Food Items

**List:** `{foods: [{id, name, category:{id,name}, price, item_type, status, image, description, discount_type, discount, available_time_starts, available_time_ends, prepration_time_min, serve_time_in_min, live_web, pack_charges, takeaway_charge, delivery_charge, tax, tax_type, item_unit, item_unit_price, give_discount, variation:[], addons:[], food_for, allergens:[], kcal, portion_size, item_code, dinein, delivery, takeaway, food_order, complementary, complementary_price}], restaurant_settings: {vat:{status,code}}}`

**Key fields for UI:**
- `id` — food ID
- `name` — display name
- `category.id` + `category.name` — nested object (not flat ID)
- `price` — number (not string)
- `status` — 1 = active
- `item_type` — 1 = veg? (needs clarification)
- `variation[]` — array of variation groups with values
- `addons[]` — linked addon IDs
- `image` — URL (default placeholder when none set)

**Add validation requires:** `category_id`, `price`
**Update validation requires:** `price` only (partial update possible)

**Normalization needs:** Response wrapped in `{foods: [...]}` — extract `.foods`. Category is nested object. Numeric strings mixed (`"0.00"` vs `0`).

### 1.3 Product Categories (Food Categories)

**List:** Raw array `[{id, name, image, parent_id, position, status, slug, business_type, tax_type, tax_calc, gst_percent, print_option, discount_type, cat_type, cat_order, station_name, restaurant_printer_id}]`

**Normalization needs:** RAW ARRAY — no wrapper. Different from stock-item-categories (`{success, data}`).

### 1.4 Addons

**List:** `{addons: [{id, name, price, status}]}`

**Very lightweight shape.** No category, no image, no description.

### 1.5 Addon-Recipes

**List:** `{recipes: [{recipe_id, addon_id, name, addon_name, food_name, addon_price, preparation_time, serve_time, unit, serve_people, qty, type, ingredients:[{ingredient_id, ingredient_name, ingredient_unit, ingredient_qty}]}]}`

**Detail:** `{recipe: {recipe_id, addon_name, addon_price, preparation_time, serve_time, unit, serve_people, qty, ingredients:[...]}}`

**Orphans:** `{addons: []}` — addons without any recipe mapping

**Store validation requires:** `addon_id`, `preparation_time`, `serves_people`, `ingredients`

### 1.6 Response Wrapper Inconsistency Map

| Endpoint Group | Wrapper | Extract Pattern |
|---------------|---------|----------------|
| Stock categories | `{success, data: [...]}` | `resp.data.data` |
| Foods | `{foods: [...]}` | `resp.data.foods` |
| Product categories | Raw array `[...]` | `resp.data` |
| Addons | `{addons: [...]}` | `resp.data.addons` |
| Addon-recipes | `{recipes: [...]}` | `resp.data.recipes` |
| Addons-without-recipe | `{addons: [...]}` | `resp.data.addons` |
| Addon-recipe detail | `{recipe: {...}}` | `resp.data.recipe` |

**Frontend normalization layer MUST handle each shape independently.** No universal extractor.

---

## 2. Role-Based Access Findings

### Backend Behavior (Live-Tested)

| Endpoint | Master (rid=1) | Central (rid=782) | Franchise (rid=786) |
|----------|:---:|:---:|:---:|
| stock-item-categories | 200 (2 items) | 200 (items) | 200 (items) |
| foods-list | 200 (2 foods) | 200 (2 foods) | 200 (2 foods) |
| addon-recipe-list | 200 (1 recipe) | 200 (1 recipe) | 200 (1 recipe) |

**Finding:** POS does NOT enforce role-based access on catalogue READ endpoints. All roles can read all catalogue data. The plan doc specifies **frontend-only gating**: show catalogue UI only for `master` + `normal` role flags.

### UI Visibility Policy

Per plan doc:
> Show catalogue UI only for `master` + `normal` role flags. No backend role-guard change is part of this phase.

**Implementation:** Gate catalogue nav items and routes using `screenVisibility.js`. Central/franchise cannot see nav items but the API will respond if called directly.

```js
"scr-catalogue": { master: FULL, central: HIDDEN, franchise: HIDDEN }
```

**QUESTION:** What is "normal" role flag? The plan mentions `master` + `normal`. We've seen `master`, `central`, `franchise` as `restaurant_type_flag` values. "normal" may refer to a separate user role field (employee_role), not restaurant_type. **Clarification needed from product owner.** For now, assume `master` only.

---

## 3. UX / Product Planning

### 3.1 Navigation Architecture

```
Sidebar
  ├── Operations Hub        /
  ├── Stock Inventory       /inventory      (P20)
  ├── Hierarchy Summary     /hierarchy
  ├── Pending Queues        /queues
  ├── History & Ledger      /history
  ├── ── Catalogue ──────── (section header, master only)
  │   ├── Ingredients       /catalogue/ingredients
  │   ├── Products          /catalogue/products
  │   └── Addon Recipes     /catalogue/addon-recipes
  ├── Vendors               /vendors
  └── Settings              /settings
```

**Why group under "Catalogue":** Separates operational flows (transfers, inventory) from master-data management (ingredients, products, recipes). Catalogue is setup/config; operations is daily workflow.

### 3.2 Inventory Catalogue — Ingredients

**Route:** `/catalogue/ingredients`

**Tabs:**
- **Ingredients** — full list from `stock-inventory` (P20) merged with `get-inventory-master`
- **Categories** — CRUD for stock-item-categories

#### Ingredients Tab

```
┌─────────────────────────────────────────────────────────────────┐
│  Ingredients                                    [+ Add Item]    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Search...                      [All Categories ▾]          ││
│  ├───────┬──────────┬──────┬──────────┬──────────┬───────────┤│
│  │ Name  │ Category │ Qty  │ Unit     │ Min Alert│ Actions   ││
│  ├───────┼──────────┼──────┼──────────┼──────────┼───────────┤│
│  │ maida │ veggies  │108.15│ kg       │ 500 gm   │ [Edit]    ││
│  │ ...   │ ...      │ ...  │ ...      │ ...      │ ...       ││
│  └───────┴──────────┴──────┴──────────┴──────────┴───────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**"+ Add Item"** opens a form dialog:
- `stock_title` (required)
- `category_id` (dropdown from stock-item-categories)
- `unit` (select: kg, ltr, pcs)
- `small_unit` (auto-derived: kg→gm, ltr→ml)
- `minimun_stock_alert` (number)
- `min_unit_alert` (unit selector)

**"Edit"** opens update dialog for:
- `unit`, `quantity` (read-only display), `min_qty_alert`, `min_unit_alert`
- Via `PUT /inventory/update-stock/{id}`

#### Categories Tab

Simple CRUD table:
- List from `GET /stock-item-categories`
- Add via `POST /stock-item-categories/store` → `{category_name}`
- Edit via `PUT /stock-item-categories/update/{id}` → `{category_name}`
- Delete via `DELETE /stock-item-categories/delete/{id}`
- Inline edit or dialog — categories are simple (just a name)

### 3.3 Product Catalogue — Foods

**Route:** `/catalogue/products`

**Tabs:**
- **Products** — food items
- **Categories** — food categories (from `/product/categories`)
- **Addons** — addon items (from `/product/addon-list`)

#### Products Tab

```
┌──────────────────────────────────────────────────────────────────┐
│  Products                                       [+ Add Food]    │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Search...              [All Categories ▾]  [Active/All ▾]   ││
│  ├──────┬──────────┬───────┬────────┬──────────┬──────────────┤│
│  │ Name │ Category │ Price │ Status │ Type     │ Actions      ││
│  ├──────┼──────────┼───────┼────────┼──────────┼──────────────┤│
│  │ aloo │ toast    │ ₹101  │ Active │ Veg      │ [Edit] [Del] ││
│  │ ...  │ ...      │ ...   │ ...    │ ...      │ ...          ││
│  └──────┴──────────┴───────┴────────┴──────────┴──────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

**Add/Edit Food Dialog:**
- Basic: `name`, `category_id` (dropdown), `price`, `description`
- Settings: `item_type` (veg/non-veg), `dinein`/`delivery`/`takeaway` toggles
- Pricing: `discount_type`, `discount`, `tax`, `tax_type`
- Availability: `available_time_starts/ends`, `prepration_time_min`
- Advanced (collapsible): `variation[]`, `addons[]`, `allergens[]`, `kcal`, `item_code`

**IMPORTANT: Food items have a very rich payload.** Phase 2 MVP should only expose: name, category, price, status, description, item_type. Variations/addons/advanced fields are Phase 2+.

#### Categories Tab (Food Categories)

Read-only list from `GET /product/categories` (this endpoint may not have write operations via vendoremployee routes — needs verification if store/update/delete exist for food categories).

#### Addons Tab

List from `GET /product/addon-list`. Lightweight (id, name, price, status).
**Write operations for addons** not documented in plan doc — may need separate investigation.

### 3.4 Addon-Recipe Management

**Route:** `/catalogue/addon-recipes`

```
┌─────────────────────────────────────────────────────────────────┐
│  Addon Recipes                            [+ Create Recipe]     │
│                                                                 │
│  ┌── Mapped Addons ────────────────────────────────────────────┐│
│  │ rossa → Recipe: patri (50 gm)              [Edit] [Delete] ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌── Unmapped Addons (0) ──────────────────────────────────────┐│
│  │ All addons have recipes assigned ✓                          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Create/Edit Recipe Dialog:**
- `addon_id` (dropdown from addon-list, filtered to unmapped for create)
- `preparation_time` (minutes)
- `serves_people` (number)
- `unit`, `qty`
- **Ingredients** — multi-row:
  - `ingredient_id` (dropdown from inventory master items)
  - `ingredient_qty` (number)
  - `ingredient_unit` (auto from ingredient)
  - [+ Add Ingredient] / [Remove]

**"Unmapped Addons" section** uses `/product/addons-without-recipe` to show orphan addons needing recipe assignment.

### 3.5 Recipe / Sub-Recipe Management (BLOCKED)

**Status:** All 8 recipe + sub-recipe endpoints return 404. These routes are not registered on the current POS build.

**Plan:** Stub the UI routes and show a "Coming Soon" or "Not Available" state. Implement once POS backend confirms route registration.

```js
// Placeholder route
<Route path="/catalogue/recipes" element={<RecipeManagement />} />
// RecipeManagement.jsx → shows EmptyState: "Recipe management requires API activation. Contact POS admin."
```

---

## 4. Architecture Planning

### 4.1 Route Structure

```js
// App.js additions
<Route path="/catalogue/ingredients" element={<IngredientCatalogue />} />
<Route path="/catalogue/products" element={<ProductCatalogue />} />
<Route path="/catalogue/addon-recipes" element={<AddonRecipeCatalogue />} />
<Route path="/catalogue/recipes" element={<RecipePlaceholder />} />
```

### 4.2 API Layer Additions (api.js)

```js
// ── P21 Catalogue APIs ────────────────────────────────────────

// Inventory Categories
function getStockItemCategories() { ... }
function getStockItemCategoryById(id) { ... }
function createStockItemCategory(payload) { ... }
function updateStockItemCategory(id, payload) { ... }
function deleteStockItemCategory(id) { ... }

// Inventory Items
function addInventoryItem(items) { ... }   // POST array
function updateStockItem(id, payload) { ... }

// Product / Food
function getFoodsList() { ... }
function getFoodCategories() { ... }
function addFood(payload) { ... }
function updateFood(id, payload) { ... }
function deleteFood(id) { ... }
function getAddonList() { ... }

// Addon-Recipes
function getAddonRecipes() { ... }
function getAddonRecipeById(id) { ... }
function getAddonsWithoutRecipe() { ... }
function createAddonRecipe(payload) { ... }
function updateAddonRecipe(id, payload) { ... }
function deleteAddonRecipe(id) { ... }
```

**Total: 17 new api.js methods.** Each needs response normalization per the inconsistent wrapper patterns documented in Section 1.6.

### 4.3 Normalization Layer

Each endpoint group needs a dedicated normalizer:

```js
// Stock categories: {success, data} → data
function normalizeStockCategoriesResp(resp) {
  return resp.data?.data || [];
}

// Foods: {foods} → foods, with numeric parsing
function normalizeFoodsResp(resp) {
  const foods = resp.data?.foods || [];
  return foods.map(f => ({
    ...f,
    price: Number(f.price) || 0,
    tax: parseFloat(f.tax) || 0,
  }));
}

// Product categories: raw array
function normalizeFoodCategoriesResp(resp) {
  return Array.isArray(resp.data) ? resp.data : [];
}

// Addons: {addons} → addons
function normalizeAddonsResp(resp) {
  return resp.data?.addons || [];
}

// Addon-recipes: {recipes} → recipes
function normalizeAddonRecipesResp(resp) {
  return resp.data?.recipes || [];
}
```

### 4.4 Hooks

```
hooks/useStockItemCategories.js    — CRUD + list for inventory categories
hooks/useFoodCatalogue.js          — food list + categories + CRUD
hooks/useAddonRecipes.js           — addon-recipe list + orphans + CRUD
```

Each hook pattern:
- Fetch list on mount
- Expose `create()`, `update()`, `remove()` that call API + refetch list
- Track `loading`, `error`, `submitting` states
- **Hard refresh after mutation** (no optimistic updates — POS validation may reject)

### 4.5 Component Map

```
/catalogue/ingredients
  └── IngredientCatalogue.jsx
        ├── Tabs: [Ingredients | Categories]
        ├── IngredientTable           — stock items with search/filter/sort
        ├── IngredientFormDialog       — add/edit ingredient
        ├── CategoryTable             — stock categories CRUD
        └── CategoryFormDialog        — add/edit category (just name)

/catalogue/products
  └── ProductCatalogue.jsx
        ├── Tabs: [Products | Categories | Addons]
        ├── FoodTable                 — food items with search/filter
        ├── FoodFormDialog            — add/edit food (rich payload)
        ├── FoodCategoryTable         — food categories (read-only list)
        └── AddonTable                — addon items (read-only list)

/catalogue/addon-recipes
  └── AddonRecipeCatalogue.jsx
        ├── AddonRecipeTable          — mapped addon-recipes with ingredients
        ├── AddonRecipeFormDialog     — create/edit with ingredient rows
        └── OrphanAddonsBanner        — unmapped addons alert

/catalogue/recipes (BLOCKED)
  └── RecipePlaceholder.jsx           — "Not available" state
```

### 4.6 Shared Components

| Component | Used By | Notes |
|-----------|---------|-------|
| `IngredientSelector` | AddonRecipeFormDialog, (future) RecipeFormDialog | Dropdown from `get-inventory-master` |
| `CategorySelector` | IngredientFormDialog | Dropdown from `stock-item-categories` |
| `FoodCategorySelector` | FoodFormDialog | Dropdown from `product/categories` |
| `ConfirmDeleteDialog` | All delete actions | Reuse existing `ConfirmActionDialog` |

### 4.7 Permission Gating

```js
// screenVisibility.js
"scr-catalogue-ingredients": { master: FULL, central: HIDDEN, franchise: HIDDEN },
"scr-catalogue-products":    { master: FULL, central: HIDDEN, franchise: HIDDEN },
"scr-catalogue-addon-recipes": { master: FULL, central: HIDDEN, franchise: HIDDEN },

// NAV_ITEMS — grouped under "Catalogue" section
{ id: "catalogue-ingredients", screen: "scr-catalogue-ingredients", label: "Ingredients", path: "/catalogue/ingredients", icon: "Beaker" },
{ id: "catalogue-products", screen: "scr-catalogue-products", label: "Products", path: "/catalogue/products", icon: "UtensilsCrossed" },
{ id: "catalogue-addon-recipes", screen: "scr-catalogue-addon-recipes", label: "Addon Recipes", path: "/catalogue/addon-recipes", icon: "BookOpen" },
```

### 4.8 Validation Strategy

| Endpoint | Validation Style | Frontend Handling |
|----------|-----------------|-------------------|
| stock-item-categories/store | `{message, errors: {field: [msgs]}}` | Map `errors` object to inline field errors |
| add-food | `{errors: [{code, message}]}` | Map `errors` array by `code` to field name |
| store-addon-recipe | `{message, errors: {field: [msgs]}}` | Map `errors` object |
| update-stock | `{message: "No changes made."}` | Toast info message |
| add-inventory | `{Message, success}` | Check `success` boolean |

**INCONSISTENCY:** `add-food` returns `errors` as ARRAY of `{code, message}`, while other endpoints return `errors` as OBJECT of `{field: [messages]}`. Frontend error mapper must handle both shapes.

---

## 5. Phase Breakdown

### Phase 1: Inventory Catalogue (~5-6h)
**Scope:** Stock item categories CRUD + ingredient list with edit + add-inventory
**Files:** `IngredientCatalogue.jsx`, `IngredientFormDialog.jsx`, `CategoryFormDialog.jsx`, hooks, api.js
**Risk:** ZERO — new screens, existing endpoints
**ROI:** Master can manage ingredient catalogue without POS admin panel

### Phase 2: Product Catalogue (~5-6h)
**Scope:** Food CRUD + food categories list + addon list
**Files:** `ProductCatalogue.jsx`, `FoodFormDialog.jsx`, hooks, api.js
**Risk:** LOW — food payload is complex; Phase 2 MVP covers core fields only
**ROI:** Master can add/edit/remove menu items

### Phase 3: Recipe / Sub-Recipe — BLOCKED
**Scope:** Recipe CRUD + sub-recipe CRUD + ingredient composition
**Status:** All endpoints return 404. Blocked on POS backend route registration.
**Action:** Stub route with placeholder. Implement when routes confirmed.
**Risk:** N/A until unblocked

### Phase 4: Addon-Recipe Ecosystem (~4-5h)
**Scope:** Addon-recipe CRUD with ingredient composition + orphan detection
**Files:** `AddonRecipeCatalogue.jsx`, `AddonRecipeFormDialog.jsx`, hooks, api.js
**Risk:** LOW — endpoints validated, ingredient picker reuses inventory master
**ROI:** Master can manage cost-tracking recipes for addons

### Summary

| Phase | Scope | Effort | Risk | Depends On | Status |
|-------|-------|--------|------|------------|--------|
| 1 | Inventory Catalogue | 5-6h | ZERO | None | **READY** |
| 2 | Product Catalogue | 5-6h | LOW | Phase 1 (shared patterns) | **READY** |
| 3 | Recipe/Sub-recipe | 5-6h | BLOCKED | POS route registration | **BLOCKED** |
| 4 | Addon-Recipe | 4-5h | LOW | Phase 1 (ingredient selector) | **READY** |

**Recommended order:** Phase 1 → Phase 4 → Phase 2 (Phase 4 before Phase 2 because addon-recipes have the cleanest API contract and link directly to inventory ingredients)

---

## 6. Risk Analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| Recipe + Sub-recipe routes return 404 | **HIGH (BLOCKER)** | Defer Phase 3. Stub UI with placeholder. Escalate to POS team. |
| Food payload complexity (35+ fields) | MEDIUM | Phase 2 MVP: only core fields (name, category, price, status, description). Advanced fields in Phase 2+. |
| Inconsistent response wrappers across endpoints | MEDIUM | Per-endpoint normalizer in api.js. No universal extractor. |
| Inconsistent validation error shapes (`array` vs `object`) | LOW | Dual-format error mapper utility. |
| No pagination on any list endpoint | MEDIUM | Ok for small catalogues (<100 items). Virtual scrolling needed if >200 items. |
| `add-food` validation returns `debug_request_data` with full auth context | LOW (security) | Don't expose debug fields to UI. Strip on normalization. |
| Food categories may not have write endpoints via vendoremployee | LOW | Show as read-only list in Phase 2. Investigate write routes later. |
| `update-stock` returns 400 "No changes made" on empty body (not 422) | LOW | Handle 400 as validation feedback, not server error. |
| Category delete may cascade-delete linked ingredients | HIGH | Add confirmation dialog with warning: "Deleting this category may affect X ingredients." |

---

## 7. Open Questions

1. **"normal" role flag:** Plan doc says "master + normal." What is "normal"? Is it `restaurant_type_flag` or a separate employee role? (Assumption: `master` only until clarified.)

2. **Food categories write ops:** Are `POST/PUT/DELETE` routes registered for food categories under vendoremployee? (Current data: read-only confirmed. Write routes need probing.)

3. **Addon write ops (not addon-recipe):** Can addons be created/edited via vendoremployee routes? Only `addon-list` (read) is documented. (May need separate investigation.)

4. **Recipe route registration timeline:** When will POS team register recipe/sub-recipe routes on vendoremployee V2? (Blocks Phase 3.)

5. **Category delete cascade behavior:** Does deleting a stock-item-category orphan its ingredients? Or does POS prevent deletion of categories with linked items?

6. **Image upload for foods:** `add-food` response shows default image URL. Does the create/update endpoint accept image upload (multipart) or image URL? (Phase 2+.)

7. **Ingredient quantity vs display_qty:** `add-inventory` accepts `unit` + no quantity. Does quantity start at 0? Or is there an initial stock field? (Clarify with POS docs.)
