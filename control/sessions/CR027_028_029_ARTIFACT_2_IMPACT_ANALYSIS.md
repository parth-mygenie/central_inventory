# CR-027 / CR-028 / CR-029 — Combined Impact Analysis (Artifact 2)

> **CRs:** CR-027 (Nav Restructure), CR-028 (Product Catalog Overhaul), CR-029 (Stock Inventory Split)
> **Date:** 2026-06-13
> **Author:** E1 agent
> **Status:** DRAFT — pending owner review

---

## 1. Scope Clarification (from owner Q&A)

| Decision | Owner Answer | Impact |
|----------|-------------|--------|
| Route paths | **Change to new paths** (`/product-catalog`, `/raw-materials`, etc.) | Old routes get redirects in App.js |
| Product Catalog vs Stock | **Product Catalog = store menu** (what customers see at POS). Stock Inventory FG = produced finished goods. **Separate concerns.** | Product Catalog gets its own screen permission `scr-product-catalog` |
| RecipeCatalogue.jsx | Sub-Recipes tab → extract to `SubRecipeMaster.jsx` (PRODUCTION). Recipes tab → absorb into Product Catalog. **File can be deleted after extraction.** | 296 lines redistributed, 0 external cross-refs |
| AddonRecipeCatalogue.jsx | **Absorb into Product Catalog** as addon management per product | 181 lines absorbed, `AddonRecipeCatalogue.jsx` deleted |
| Sidebar grouping | **Collapsible accordion sections** (INWARD ▾, PRODUCTION ▾, OUTWARD ▾) | Sidebar.jsx rewrite — add section headers + collapse state |

---

## 2. File Impact Matrix — CR-027 (Navigation Restructure)

### 2.1 Files MODIFIED

| # | File | Lines Now | Change | Risk |
|---|------|:---------:|--------|:----:|
| M1 | `lib/screenVisibility.js` **(FROZEN)** | 204 | Remove 4 old nav items (Ingredients, Products, Recipes, Addon Recipes). Add new grouped nav items with section labels. Add new screen IDs: `scr-raw-material-master`, `scr-product-catalog`, `scr-sub-recipe-master`. Add new action: `manage-product-catalog`. Rename existing labels. | **HIGH** — frozen file, owner approval required |
| M2 | `components/layout/Sidebar.jsx` | 110 | **Major rewrite**: Add collapsible section headers (DASHBOARD, INWARD, PRODUCTION, OUTWARD, REPORTS, SETTINGS). Add section collapse/expand state. New icon imports. Section dividers. ~110 → ~180 lines | **MEDIUM** — visual change, regression risk on nav |
| M3 | `App.js` | 122 | Change 4 route paths. Add 3 redirect routes (old → new). Add 1 new route (`/sub-recipe-master`). Remove 2 routes (`/catalogue/recipes`, `/catalogue/addon-recipes`). Import new component `SubRecipeMaster`. | **LOW** — additive |
| M4 | `components/central-inventory/OperationsHub.jsx` | 565 | Update Quick Action labels: "Add Stock (Vendor)" → "Purchase". Update `navigate("/procurement/new")` → `navigate("/purchase")`. | **LOW** — 2 string changes |

### 2.2 Route Migration Map

| Old Route | New Route | Action |
|-----------|-----------|--------|
| `/catalogue/ingredients` | `/raw-materials` | Redirect + nav update |
| `/catalogue/products` | `/product-catalog` | Redirect + nav update |
| `/catalogue/recipes` | **DELETED** (Recipes → Product Catalog, Sub-Recipes → `/sub-recipe-master`) | Redirect to `/product-catalog` |
| `/catalogue/addon-recipes` | **DELETED** (absorbed into Product Catalog) | Redirect to `/product-catalog` |
| `/vendors` | `/vendor-management` | Redirect + nav update |
| `/procurement/new` | `/purchase` | Redirect + nav update |
| `/hierarchy` | Keep OR merge into `/store-management` | TBD — see Question Q1 below |
| `/hierarchy/manage` | `/store-management` | Redirect + nav update |

### 2.3 New Screen Permissions

| Screen ID | master | central | franchise | Notes |
|-----------|:------:|:-------:|:---------:|-------|
| `scr-raw-material-master` | FULL | HIDDEN | HIDDEN | Same as current `scr-catalogue` for ingredients |
| `scr-product-catalog` | FULL | HIDDEN | HIDDEN | Same as current `scr-catalogue` for products |
| `scr-sub-recipe-master` | FULL | HIDDEN | HIDDEN | Extracted from `scr-catalogue` |
| `scr-purchase` | FULL | FULL | HIDDEN | Same as current `scr-procurement` |
| `scr-vendor-management` | FULL | FULL | HIDDEN | Same as current `scr-vendors` |

### 2.4 NAV_ITEMS New Structure

```
SECTION: "Dashboard"
  - Operations Hub         → /                    (scr-01-operations-hub)

SECTION: "Inward"
  - Vendor Management      → /vendor-management   (scr-vendor-management)
  - Raw Material Master    → /raw-materials        (scr-raw-material-master)
  - Purchase               → /purchase             (scr-purchase)

SECTION: "Production"
  - Sub-Recipe Master      → /sub-recipe-master    (scr-sub-recipe-master)
  - Run Production         → /production/new       (scr-production)
  - Production History     → /production/history   (scr-production)

SECTION: "Outward"
  - Store Management       → /store-management     (scr-hierarchy-manage)
  - Product Catalog        → /product-catalog       (scr-product-catalog)
  - Stock Inventory        → /inventory             (scr-stock-inventory)
  - Pending Queues         → /queues                (scr-05-pending-queues)
  - History & Ledger       → /history               (scr-history-ledger)

SECTION: "Reports"
  - Consumption Report     → /reports/consumption   (scr-consumption-report)
  - Wastage Report         → /wastage/report        (scr-20-reports)

SECTION: "Settings"
  - Settings               → /settings              (scr-settings)
```

---

## 3. File Impact Matrix — CR-028 (Product Catalog Overhaul)

### 3.1 Files DELETED (after extraction)

| # | File | Lines | Absorbed Into | What's Extracted |
|---|------|:-----:|---------------|-----------------|
| D1 | `RecipeCatalogue.jsx` | 296 | Recipes tab → Product Catalog. Sub-Recipes tab → `SubRecipeMaster.jsx` | Sub-Recipes tab (~140 lines) |
| D2 | `AddonRecipeCatalogue.jsx` | 181 | Fully absorbed into Product Catalog addon management | — |

### 3.2 Files CREATED

| # | File | Est. Lines | Purpose |
|---|------|:----------:|---------|
| N1 | `SubRecipeMaster.jsx` | ~200 | Extracted Sub-Recipes tab from RecipeCatalogue + enhanced UI. Standalone page at `/sub-recipe-master` |
| N2 | `ProductCatalogEditor.jsx` | ~600-800 | **Full rewrite** of ProductCatalogue.jsx — Excel-like bulk editor with: inline cell editing, column toggles, bulk upload (Excel import), Excel export, mandatory category, search + filter, unsaved changes tracking, linked recipe/addon/sub-recipe per product, expandable row for BOM |

### 3.3 Files MODIFIED

| # | File | Change | Risk |
|---|------|--------|:----:|
| M5 | `App.js` | Replace `ProductCatalogue` import with `ProductCatalogEditor`. Add `SubRecipeMaster` import + route. Remove `RecipeCatalogue` and `AddonRecipeCatalogue` imports + routes. | LOW |
| M6 | `services/api.js` | No new endpoints. Uses existing: `getFoodsList`, `getFoodCategories`, `addFood`, `updateFood`, `deleteFood`, `getRecipeList`, `getSubRecipeList`, `getAddonList`, `getAddonRecipes`. May need batch update endpoint discovery (for bulk save). | LOW |

### 3.4 API Dependencies for Product Catalog

| API | Purpose | Exists? | Bulk Support? |
|-----|---------|:-------:|:-------------:|
| `getFoodsList()` | Load all products | YES | — (read) |
| `getFoodCategories()` | Categories for dropdown + grouping | YES | — (read) |
| `addFood(payload)` | Create single product | YES | NO — one at a time |
| `updateFood(id, payload)` | Update single product | YES | NO — one at a time |
| `deleteFood(id)` | Delete single product | YES | NO — one at a time |
| `getRecipeList()` | Recipes linked to products | YES | — (read) |
| `getSubRecipeList()` | Sub-recipes for linking | YES | — (read) |
| `getAddonList()` | Addons for products | YES | — (read) |
| `getAddonRecipes()` | Addon recipes | YES | — (read) |
| **Bulk create/update** | Save multiple product edits at once | **UNKNOWN** | **NEEDS DISCOVERY** |

**Gap: Bulk Save.** The Excel-like editor implies editing many rows → saving all at once. Current APIs are single-item. Options:
1. Frontend loops through changed items and calls `updateFood()` per item (slow but works)
2. Discover if POS API has a batch endpoint (needs probing)
3. Accept single-item saves with "Save" button per row (simpler UX, less bulk)

### 3.5 Product Catalog Data Model (per row)

| Field | Source API | Editable? | Type |
|-------|-----------|:---------:|------|
| Name | `getFoodsList().name` | YES | text |
| Category | `getFoodsList().category` | YES (mandatory) | dropdown |
| Price | `getFoodsList().price` | YES | number |
| Status | `getFoodsList().status` (1/0) | YES | toggle |
| Type (Veg/Non-Veg) | `getFoodsList().item_type` | YES | dropdown |
| Tax Type | `getFoodsList().tax_type` | YES | dropdown |
| Tax % | `getFoodsList().tax` | YES | number |
| Sold By (Unit) | `getFoodsList().unit_type` | YES | dropdown |
| Description | `getFoodsList().description` | YES | text |
| Linked Recipe | `getRecipeList()` matched by food_name | VIEW (link action) | badge |
| Linked Sub-Recipe | Via recipe → sub-recipe chain | VIEW | badge |
| Addons | `getAddonList()` matched by food_id | VIEW (manage action) | badge |

### 3.6 Mandatory Category Enforcement

| Approach | UX | Risk |
|----------|-----|:----:|
| **Inline validation** — red border on empty category cell, block save | Non-intrusive, standard pattern | LOW |
| **Category pre-selection** — when adding new row, auto-open category picker first | Forces choice upfront | LOW |
| **Group-by-category view** — products grouped under category headers (like screenshot) | Category is structurally obvious | LOW |
| **Recommended: All three combined** | Category picker first on new row + red validation + grouped view | LOW |

---

## 4. File Impact Matrix — CR-029 (Stock Inventory Split)

### 4.1 Files MODIFIED

| # | File | Lines Now | Change | Risk |
|---|------|:---------:|--------|:----:|
| M7 | `StockInventorySummary.jsx` | 547 | Add tab bar: "Finished Goods" / "Raw Materials" / "All". Filter stock list by type. Per-tab KPIs. ~547 → ~620 lines | MEDIUM |
| M8 | `hooks/useStockInventory.js` | 82 | Add `stockType` filter state ("fg" / "raw" / "all"). Filter logic: FG = `is_sub_recipe || subrecipe_id`, Raw = everything else. | LOW |

### 4.2 Stock Type Detection Logic

```
Finished Good (FG):
  item.is_sub_recipe === true
  OR item.subrecipe_id is set
  OR item.type === "sub_recipe" (if API returns this)

Raw Material (Ingredient):
  Everything else (default)
```

**Risk:** This heuristic depends on the API returning `is_sub_recipe` or `subrecipe_id` in stock-inventory items. Need to validate these fields exist in the response.

### 4.3 Per-Tab KPIs

| Tab | KPIs Shown |
|-----|-----------|
| Finished Goods | Total FG Items, FG Low Stock, FG Categories |
| Raw Materials | Total Raw Items, Raw Low Stock, Raw Categories |
| All | Total Items (combined), Low Stock (combined), Categories (combined) |

---

## 5. Cross-Cutting Concerns

### 5.1 Frozen Files Requiring Owner Approval

| File | Why Frozen | CR | Change Required |
|------|-----------|-----|----------------|
| `screenVisibility.js` | Role-based nav + access gates | CR-027 | Add 3 new screen IDs, restructure NAV_ITEMS with sections, rename labels |

### 5.2 Files Referenced by Multiple CRs

| File | CR-027 | CR-028 | CR-029 |
|------|:------:|:------:|:------:|
| `screenVisibility.js` | YES (nav restructure) | YES (new screen ID) | NO |
| `App.js` | YES (route changes) | YES (new components) | NO |
| `Sidebar.jsx` | YES (section grouping) | NO | NO |
| `api.js` | NO | MAYBE (bulk endpoint) | NO |
| `StockInventorySummary.jsx` | NO | NO | YES |
| `useStockInventory.js` | NO | NO | YES |

### 5.3 Implementation Order (Dependency Chain)

```
CR-027 (Nav Restructure) MUST go first
  ↓ — new routes, screen IDs, and sidebar exist
CR-028 (Product Catalog) depends on CR-027
  ↓ — new page replaces old ProductCatalogue at new route
CR-029 (Stock Inventory Split) is INDEPENDENT
  ↓ — can be done in parallel with CR-028
```

**Recommended order:** CR-027 → (CR-028 + CR-029 in parallel)

---

## 6. Risk Analysis

| # | Risk | Severity | CR | Mitigation |
|---|------|:--------:|:---:|------------|
| R1 | `screenVisibility.js` is frozen — changes could break role gating | HIGH | 027 | Keep all existing screen IDs working. Add new ones alongside. Test all 3 roles. |
| R2 | Sidebar rewrite breaks navigation for existing screens | HIGH | 027 | Section grouping is purely visual. All paths remain functional. Test all nav items. |
| R3 | Old route bookmarks break | LOW | 027 | Add `<Route path="/catalogue/*" element={<Navigate to="/product-catalog" />} />` redirects |
| R4 | Product Catalog bulk editor — no batch save API | MEDIUM | 028 | Fallback: sequential `updateFood()` calls with progress indicator. Probe for batch endpoint first. |
| R5 | Recipe absorption into Product Catalog — data model mismatch | MEDIUM | 028 | Recipes link to products by `food_name`. This is a string match, not ID. Must handle mismatches gracefully. |
| R6 | RecipeCatalogue.jsx deletion — lose sub-recipe management | LOW | 028 | Extract Sub-Recipes tab to `SubRecipeMaster.jsx` BEFORE deleting RecipeCatalogue. |
| R7 | Stock type detection heuristic fails — `is_sub_recipe` not in API | MEDIUM | 029 | Validate field exists in stock-inventory response. Fallback: use sub-recipe list to build FG ID set. |
| R8 | OperationsHub Quick Actions — stale route references | LOW | 027 | Update 1 navigate call (`/procurement/new` → `/purchase`). |

---

## 7. Effort Estimate

| CR | Scope | Files | Est. Hours |
|----|-------|:-----:|:----------:|
| CR-027 | Nav restructure + sidebar sections + route migration + redirects | 4 modified | 3-4h |
| CR-028 | Product Catalog rewrite + recipe absorption + addon absorption + sub-recipe extraction | 2 deleted, 2 created, 2 modified | 8-12h |
| CR-029 | Stock Inventory tab split + type detection + per-tab KPIs | 2 modified | 2-3h |
| **Total** | | **10 files** | **13-19h** |

---

## 8. Open Questions — RESOLVED

| # | Question | Answer | Date |
|---|----------|--------|------|
| Q1 | Hierarchy Summary — merge, keep, or drop? | **Merge into Store Management as a tab** | 2026-06-13 |
| Q2 | Bulk save API for Product Catalog? | **Parked** — use single-item `updateFood()` calls with progress indicator for now | 2026-06-13 |
| Q3 | Excel import template columns? | **Parked** — defer import feature to later phase | 2026-06-13 |
| Q4 | `is_sub_recipe` field in stock-inventory? | **CONFIRMED** — API returns `type` ("inventory" / "SubRecipe"), `is_sub_recipe` (bool), `subrecipe_id` (int/null), `recipe_id` (int/null). Triple-confirmed detection logic. Zero risk. | 2026-06-13 |

### Q4 Evidence (curl validation)

```
Stock-inventory item fields for type detection:

Ingredient (Raw Material):
  type: "inventory", is_sub_recipe: false, subrecipe_id: null, recipe_id: null

Finished Good (Sub-Recipe output):
  type: "SubRecipe", is_sub_recipe: true, subrecipe_id: 187, recipe_id: 187
  category_name: "Sub Recipe"
```

---

*Impact analysis complete. Pending: owner review of open questions (Q1-Q4), then proceed to Implementation Plan (Artifact 3).*
