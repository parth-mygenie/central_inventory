# INVESTIGATION REPORT — Category-Scoped Forward Push
> **Date:** 2026-07-16
> **Investigator:** Agent (INVESTIGATION role)
> **Accounts:** owner@palmcentral.com (master 813), owner@palmbharat.com (franchise 815), owner@palmruby.com (franchise 814)

---

## 1. Hierarchy Verified

| Account | RID | Type | Parent |
|---------|:---:|------|:------:|
| palm central | 813 | master (TOP) | — |
| palmruby | 814 | franchise | 813 |
| palmbharat | 815 | franchise | 813 |

## 2. Test Data Created on Master 813

### Stock Item Categories
| ID | Name |
|:--:|------|
| 1690 | Dairy and Cream |
| 1691 | Dry Ingredients |
| 1692 | Fresh Produce |
| 1693 | Syrups and Sauces |

### Ingredients (Inventory Master)
| ID | Name | Unit | Category |
|:--:|------|------|----------|
| 18434 | Whole Milk | litre | 1690 |
| 18435 | Heavy Cream | litre | 1690 |
| 18436 | Butter | kg | 1690 |
| 18437 | Paneer | kg | 1690 |
| 18438 | All Purpose Flour | kg | 1691 |
| 18439 | Sugar | kg | 1691 |
| 18440 | Coffee Beans | kg | 1691 |
| 18441 | Cocoa Powder | kg | 1691 |
| 18442 | Tomatoes | kg | 1692 |
| 18443 | Onions | kg | 1692 |
| 18444 | Spinach | kg | 1692 |
| 18445 | Basil Leaves | kg | 1692 |
| 18446 | Vanilla Syrup | litre | 1693 |
| 18447 | Caramel Sauce | litre | 1693 |
| 18448 | Chocolate Sauce | litre | 1693 |

### Sub-Recipes
| Recipe ID | Name | FG Inventory ID |
|:---------:|------|:---------------:|
| 201 | Basic Milk Foam | 18449 |
| 202 | Chocolate Ganache | 18450 |
| 203 | Tomato Basil Base | 18451 |
| 199 | Basic Milk Foam (orphan, no BOM) | — |
| 200 | Chocolate Ganache (orphan, no BOM) | — |

### Recipes
| Recipe ID | Food | Food ID | Category | Category ID |
|:---------:|------|:-------:|----------|:-----------:|
| 9761 | Americano | 216146 | COFFEE | 8381 |
| 9762 | Cappuccino | 216150 | COFFEE | 8381 |
| 9763 | Banana Cake | 216274 | Cake Cabinet | 8395 |
| 9764 | Carrot Cake | 216266 | Cake Cabinet | 8395 |

---

## 3. Curl Probe Results

### Curl 1 — push-form baseline (no category_ids)
- **Endpoint:** `GET /franchise/push-form/815`
- **Status:** ✅ 200 OK
- **Behavior:** Returns full source entities (36 cats, 469 foods, 18 ingredients, 4 recipes, 5 sub-recipes)
- **`category_selection_preview`:** NOT present (correct)

### Curl 2 — push-form preview (comma-separated category_ids)
- **Endpoint:** `GET /franchise/push-form/815?category_ids=8381,8395`
- **Status:** ✅ 200 OK
- **Behavior:** Returns `category_selection_preview` with resolved dependency graph:
  - categories: 2, foods: 63, addons: 7, recipes: 4, sub_recipes: 0, ingredients: 8, stock_item_categories: 3, stock_items: 8
  - `resolved_names.categories` = `['Cake Cabinet', 'COFFEE']`

### Curl 3 — push-form preview (repeated query param)
- **Endpoint:** `GET /franchise/push-form/815?category_ids[]=8381&category_ids[]=8395`
- **Status:** ✅ 200 OK — same shape as Curl 2

### Curl 4 — full bundle push (regression, no category_ids)
- **Endpoint:** `POST /franchise/push/814` with `{"push_food_bundle": true}`
- **Status:** ✅ 200 OK
- **Behavior:** Full push, `_selection` NOT present (correct regression)
- 34 categories inserted, 331 foods, 3 sub-recipes, etc.

### Curl 5 — category-scoped push (COFFEE → Palm Bharat)
- **Endpoint:** `POST /franchise/push/815` with `{"push_food_bundle": true, "category_ids": [8381]}`
- **Status:** ✅ 200 OK
- **Behavior:** Scoped push, `_selection.mode = "category_scoped"`, resolved_counts present
- 1 cat inserted, 19 foods ins + 16 upd, 2 recipes, 3 ingredients, 2 stock item categories

### Curl 5b — category-scoped push (CAKE CABINET → Palm Bharat)
- **Endpoint:** `POST /franchise/push/815` with `{"push_food_bundle": true, "category_ids": [8395]}`
- **Status:** ✅ 200 OK
- 1 cat inserted, 28 foods, 2 recipes, 5+1 ingredients

### Curl 5c — category-scoped push (COFFEE + HOT DRINKS → Palm Ruby)
- **Endpoint:** `POST /franchise/push/814` with `{"push_food_bundle": true, "category_ids": [8381, 8382]}`
- **Status:** ✅ 200 OK
- 2 cats, 34 foods ins + 29 upd, 2 recipes, 3 ingredients

### Curl 5d — re-push (COFFEE → Palm Bharat again)
- **Status:** ✅ 200 OK — all updates, zero inserts (idempotent)

### Curl 6 — category-scoped + modules filter
- **Endpoint:** `POST /franchise/push/815` with `{"push_food_bundle": true, "category_ids": [8381], "modules": ["categories","foods","recipes"]}`
- **Status:** ✅ 200 OK
- Only categories/foods/recipes in response, others skipped by modules filter
- `_selection.resolved_counts` still shows full resolution (not limited by modules)

### Error Cases
| Scenario | HTTP | error_code | Verified |
|----------|:----:|------------|:--------:|
| Empty `category_ids: []` | 422 | CATEGORY_IDS_REQUIRED | ✅ |
| Invalid `category_ids: [99999]` | 422 | INVALID_CATEGORY_IDS | ✅ |
| Missing `push_food_bundle` | 422 | BUNDLE_ONLY_PUSH | ✅ |

---

## 4. Pre-Selection Mechanism (Key Finding)

**The push-form API already provides the data needed for pre-selection.**

### Data Available
When `GET /franchise/push-form/{childId}` is called WITHOUT `category_ids`:
- `data.source_entities.categories[]` → full list of master categories with `{id, name}`
- `data.child_existing.category_names[]` → list of category names already on the child

### Pre-Selection Algorithm
```
1. Fetch push-form (no category_ids)
2. For each category in source_entities.categories:
     if category.name ∈ child_existing.category_names:
       → pre-select this category (auto-check in UI)
3. User can deselect or add more categories
4. Submit category_ids[] for preview or push
```

### Verified Examples

**Palm Bharat (815)** — after pushing COFFEE + Cake Cabinet:
- `child_existing.category_names` = `['COFFEE', 'Cake Cabinet']`
- Pre-selected IDs: `[8381, 8395]`

**Palm Ruby (814)** — after pushing COFFEE + HOT DRINKS:
- `child_existing.category_names` = `['COFFEE', 'HOT DRINKS']`
- Pre-selected IDs: `[8381, 8382]`

### Edge Cases to Consider
1. **Name mismatch** — if master renames a category after pushing, `child_existing.category_names` won't match. Recommend case-insensitive + trimmed matching.
2. **Child has categories from other sources** — child_existing may include categories not from this master (manual creation). These should NOT be pre-selected since they won't exist in source_entities.
3. **No backend changes needed** — all data is already in the push-form response. This is a **frontend-only** feature (cross-reference child_existing names against source categories).

---

## 5. Root Cause Classification

| Aspect | Classification | Action |
|--------|---------------|--------|
| Category-scoped push API | ✅ **BACKEND LIVE** — fully functional | No backend changes needed |
| Category preview on GET | ✅ **BACKEND LIVE** — `category_selection_preview` works | No backend changes needed |
| Error handling | ✅ **BACKEND LIVE** — all error codes match spec | No backend changes needed |
| Modules filter | ✅ **BACKEND LIVE** — works with category_ids | No backend changes needed |
| Pre-selection (re-push) | **FRONTEND-ONLY** feature | Cross-reference `child_existing.category_names` with `source_entities.categories` |
| Proxy passthrough | ✅ **WORKING** — server.py generic proxy forwards category_ids correctly | No proxy changes needed |

---

## 6. Recommended Next Steps

1. **INTAKE** → Register as new CR (e.g., CR-046: Category-Scoped Push Frontend Adoption)
2. **PLANNING** → Frontend-only implementation:
   - Modify `StoreManagement.jsx` push dialog to show category multi-select
   - Wire push-form preview call with `category_ids` query param
   - Implement pre-selection from `child_existing.category_names`
   - Pass `category_ids` in POST push body
   - Show `_selection.resolved_counts` in push result
3. **No server.py changes** — proxy already forwards everything correctly (CI-R2 compliance)
4. **No backend gaps** — all endpoints are live and verified

---

## 7. Test Credentials Used

| Email | Password | Role | RID |
|-------|----------|------|:---:|
| owner@palmcentral.com | Qplazm@10 | master | 813 |
| owner@palmbharat.com | Qplazm@10 | franchise | 815 |
| owner@palmruby.com | Qplazm@10 | franchise | 814 |
