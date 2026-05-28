
---

## Addendum: P21 Catalogue Gaps — API Investigation (28 May 2026)

> **Source:** Live POS API probing (preprod.mygenie.online) — 20+ probes
> **Actor:** Master (rid=1)
> **Test artifacts:** Created + deleted (E1 Test Cat id=7747, E1 Test Addon id=12632)

---

### GAP A: Food Category CRUD — CONFIRMED WORKING

**Previously:** `/catalogue/products` Categories tab was read-only (list from `GET /product/categories`). No create/update/delete.

**Confirmed endpoints:**

| # | Endpoint | Method | HTTP | Status | Notes |
|---|----------|--------|:---:|--------|-------|
| A1 | `/product/add-categories` | POST | 422 | **WORKING** | Validates `name` required |
| A2 | `/product/add-categories` | POST | 200 | **WORKING** | `{message: "Category created successfully.", category_id: 7747}` |
| A3 | `/product/add-categories` (dupe) | POST | 400 | **WORKING** | `{error: "Category with this name already exists in this restaurant"}` |
| A4 | `/product/categories` | GET | 200 | **WORKING** | Returns updated list (new cat visible) |
| — | `/product/update-categories/{id}` | **POST** | 200 | **WORKING** | `{message: "Category updated successfully."}` — **NOTE: POST not PUT** |
| — | `/product/delete-categories/{id}` | DELETE | 200 | **WORKING** | `{message: "Category deleted successfully."}` |

**CRITICAL ROUTE QUIRK:** Update uses **POST** method, not PUT. `PUT /product/update-categories/{id}` returns 405 "Method Not Allowed". Must use `POST`.

**Full CRUD confirmed:** Create + Read + Update + Delete all working.

**Response shapes:**
- Create: `{message, category_id}` (200)
- Update: `{message}` (200)
- Delete: `{message}` (200)
- List: raw array `[{id, name, image, cat_type, status, ...}]`
- Duplicate: `{error: "..."}` (400) — note: uses `error` key, not `errors`

**Payload for create:**
- Required: `name`
- Optional: `image`, `cat_type` (defaults to "food"), `vendor_type`, `station_name`, `restaurant_printer_id`, `cat_order`

**Payload for update:**
- Same as create (partial update — sends fields to change)

---

### GAP B: Add-on Master CRUD — PARTIALLY CONFIRMED

**Previously:** `/catalogue/products` Addons tab was read-only (list from `GET /product/addon-list`). No create/delete.

**Confirmed endpoints:**

| # | Endpoint | Method | HTTP | Status | Notes |
|---|----------|--------|:---:|--------|-------|
| B1 | `/product/add-addon` | POST | 422 | **WORKING** | Validates `name`, `price` required |
| B2 | `/product/add-addon` | POST | 201 | **WORKING** | `{id: 12632, name: "E1 Test Addon", price: 25}` |
| B3 | `/product/add-addon` (dupe) | POST | 409 | **WORKING** | `{errors: [{message: "This addon name already exists..."}]}` |
| B4 | `/product/addon-list` | GET | 200 | **WORKING** | Returns updated list |
| — | `/product/delete-addon/{id}` | DELETE | 200 | **WORKING** | `{message: "Addon deleted successfully!"}` |
| — | `/product/update-addon/{id}` | POST | **404** | **NOT FOUND** | Route not registered |
| — | `/product/update-addon/{id}` | PUT | **404** | **NOT FOUND** | Route not registered |
| — | `/product/addons/{id}` | PUT | **404** | **NOT FOUND** | Route not registered |

### GAP B: Add-on Master CRUD — FULL CRUD CONFIRMED

**Previously:** Probed wrong route (`/product/update-addon/{id}` — 404). Correct route is `/product/addon-update/{id}`.

**Confirmed endpoints:**

| # | Endpoint | Method | HTTP | Status | Notes |
|---|----------|--------|:---:|--------|-------|
| B1 | `/product/add-addon` | POST | 422 | **WORKING** | Validates `name`, `price` required |
| B2 | `/product/add-addon` | POST | 201 | **WORKING** | `{id: 12632, name: "...", price: 25}` |
| B3 | `/product/add-addon` (dupe) | POST | 409 | **WORKING** | `{errors: [{message: "This addon name already exists..."}]}` |
| B4 | `/product/addon-list` | GET | 200 | **WORKING** | `{addons: [{id, name, price, status}]}` |
| B7 | `/product/addon-update/{id}` | **PUT** | 200 | **WORKING** | `{message: "Addon updated successfully"}` |
| B8 | `/product/addon-update/{id}` (empty) | PUT | 422 | **WORKING** | Validates `name`, `price` required |
| B9 | `/product/addon-update/99999` | PUT | 404 | **WORKING** | `{errors: [{code: "not_found", message: "Addon not found"}]}` |
| B13 | `/product/delete-addon/{id}` | DELETE | 200 | **WORKING** | `{message: "Addon deleted successfully!"}` |

**Full lifecycle verified (B10-B12):** Create → Update (rename + price change) → Verify in list → Delete. All working.

**CRITICAL ROUTE NAME:** Update is `/product/addon-update/{id}` (noun-verb), NOT `/product/update-addon/{id}` (verb-noun). Previous investigation probed the wrong route.

**Response shapes:**
- Create: `{id, name, price}` (201) — flat object, no wrapper
- Update: `{message}` (200)
- Delete: `{message}` (200)
- Not found: `{errors: [{code: "not_found", message: "Addon not found"}]}` (404) — array format
- Duplicate: `{errors: [{message: "This addon name already exists..."}]}` (409) — array format
- Validation: `{message, errors: {field: [msgs]}}` (422) — object format

**Implication:** Addon update IS supported. Frontend can implement full edit dialog.

---

### GAP C: Ingredient Name Edit — CONFIRMED WORKING (Frontend Omission)

**Previously:** Edit Ingredient dialog only exposed `unit`, `min_qty_alert`, `min_unit_alert`. Ingredient name (`stock_title`) not editable.

**Confirmed:**

| # | Test | HTTP | Result |
|---|------|:---:|--------|
| C1 | `PUT /inventory/update-stock/16980` with `stock_title: "Cooking Oil Test Rename"` | 200 | `{message: "Stock updated successfully"}` |
| C2 | Verify via `GET /stock-inventory` | 200 | `stock_title` changed to "Cooking Oil Test Rename" |
| C3 | Revert: `PUT /inventory/update-stock/16980` with `stock_title: "Cooking Oil"` | 200 | Successfully reverted |
| C4 | Verify revert | 200 | `stock_title` back to "Cooking Oil" |

**FINDING: `stock_title` IS updatable via `PUT /inventory/update-stock/{id}`. This is a FRONTEND OMISSION, not a backend limitation.**

The Edit Ingredient dialog simply didn't include a `stock_title` field. Adding it is a single-line UI change.

**Accepted fields for `PUT /inventory/update-stock/{id}`:**
- `stock_title` — ingredient name (**CONFIRMED updatable**)
- `unit` — base unit
- `min_qty_alert` — threshold number
- `min_unit_alert` — threshold unit
- `quantity` — stock quantity (use cautiously — direct qty manipulation)

---

### Summary: Confirmed API Matrix

| Operation | Endpoint | Method | Status |
|-----------|----------|--------|--------|
| **Food Category Create** | `/product/add-categories` | POST | **WORKING** |
| **Food Category Update** | `/product/update-categories/{id}` | **POST** (not PUT!) | **WORKING** |
| **Food Category Delete** | `/product/delete-categories/{id}` | DELETE | **WORKING** |
| **Food Category List** | `/product/categories` | GET | **WORKING** (existing) |
| **Addon Create** | `/product/add-addon` | POST | **WORKING** |
| **Addon Update** | `/product/addon-update/{id}` | **PUT** | **WORKING** |
| **Addon Delete** | `/product/delete-addon/{id}` | DELETE | **WORKING** |
| **Addon List** | `/product/addon-list` | GET | **WORKING** (existing) |
| **Ingredient Edit Name** | `/inventory/update-stock/{id}` | PUT | **WORKING** (stock_title accepted) |

### Frontend Architecture Impact

| Gap | Fix Needed | Complexity |
|-----|-----------|------------|
| A: Food Category CRUD | Add create/edit/delete to FoodCategoriesTab. Use `POST` for update (not PUT). | LOW — 3 new api.js methods + dialog |
| B: Addon Full CRUD | Add create/edit/delete to AddonsTab. Update via `PUT /product/addon-update/{id}`. | LOW — 3 new api.js methods + dialogs |
| C: Ingredient Name | Add `stock_title` field to EditIngredientDialog. | TRIVIAL — 1 field addition |

### Normalization Implications

- Food category create returns `{message, category_id}` — not the full category object. Must refetch list after create.
- Food category update uses **POST** method — `api.js` must use `client.post()` not `client.put()`.
- Addon create returns `{id, name, price}` (201) — flat, no wrapper.
- Addon update route is `/product/addon-update/{id}` (noun-verb) — NOT `/product/update-addon/{id}`.
- Addon update uses **PUT** method — standard REST.
- Addon 404 errors return `{errors: [{code, message}]}` (array), duplicate 409 also array format.
- Addon validation 422 returns `{message, errors: {field: [msgs]}}` (object format) — same as recipes.

### Test Artifacts (Cleaned Up)

| Artifact | ID | Status |
|----------|-----|--------|
| Food category "E1 Test Cat" | 7747 | **Deleted** |
| Addon "E1 Test Addon" | 12632 | **Deleted** |
| Ingredient "Cooking Oil" rename | 16980 | **Reverted** to "Cooking Oil" |

All test data cleaned. Live POS state restored to pre-investigation baseline.
