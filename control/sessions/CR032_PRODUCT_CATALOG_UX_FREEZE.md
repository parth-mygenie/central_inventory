# CR-032 — Product Catalog UX Freeze

> **Date:** 2026-06-13
> **Status:** FROZEN — Owner approved
> **Scope:** Product Catalog screen (`/product-catalog`)

---

## Layout: 5 Tabs

```
[ Foods | Food Categories | Recipes | Addons | Addon Recipes ]
```

---

## Tab 1: Foods (keep current — simple table + popup)

### Table Columns

| Column | Source | Display |
|--------|--------|---------|
| Name | `name` | Bold text |
| Category | `category.name` | Text |
| Price | `price` | "₹10" (fix O-8: add ₹ prefix) |
| Status | `status` | Badge: "Active" (green) / "Inactive" (gray) |
| Has Recipe | Cross-ref `getRecipeList()` by `food_name` | Badge: "Yes" (green) / "—" |
| Actions | Edit (pencil) + Delete (trash with confirmation) | Popup dialog for edit |

### Add Food: Popup dialog (Name, Category dropdown, Price, Description)
### No pattern change — simple CRUD, few items.

---

## Tab 2: Food Categories (keep current — simple table + popup)

### Table Columns

| Column | Source | Display |
|--------|--------|---------|
| Name | `name` | Text |
| Tax | `tax_type` + `gst_percent` | "GST 5%" |
| Status | `status` | Badge: "Active" / "Inactive" |
| Actions | Edit + Delete | Popup dialog |

### Add Category: Popup dialog (Name)
### No pattern change.

---

## Tab 3: Recipes — MASTER-DETAIL (Pattern A)

### Structure
```
┌──────────────────┬──────────────────────────────────────────────┐
│ RECIPES          │ RECIPE DETAIL                                │
│                  │                                              │
│ [Search...]      │ Recipe: Whole Wheat Elachi Cookies  [Delete] │
│ [+ Add Recipe]   │                                              │
│                  │ ┌─ Form ────────────────────────────────┐   │
│ ┌──────────────┐ │ │ Linked Food: [whole wheat...  ▾]     │   │
│ │ coffe        │ │ │ Prep Time: [30] Serves: [1]          │   │
│ │ 2 ing, 0 sub │ │ │ Output: [1] [piece ▾]                │   │
│ ├──────────────┤ │ └───────────────────────────────────────┘   │
│ │▶ whole wheat │ │                                              │
│ │  elachi ◄────│ │ ┌─ BILL OF MATERIALS ──────────────────┐   │
│ │ 1 ing, 1 sub │ │ │                                      │   │
│ └──────────────┘ │ │ ▐ SUB-RECIPES (purple border)        │   │
│                  │ │ │ ▼ Elachi Cookie Dough × 1 batch    │   │
│                  │ │ │   ├── Wheat Flour    200 gm        │   │
│                  │ │ │   ├── Jaggery Powder 100 gm        │   │
│                  │ │ │   ├── Elachi         5 gm          │   │
│                  │ │ │   ├── GSM            50 gm         │   │
│                  │ │ │   └── Baking Powder  3 gm          │   │
│                  │ │ │ [+ Add Sub-Recipe]                  │   │
│                  │ │ │                                      │   │
│                  │ │ ▐ DIRECT INGREDIENTS (green border)   │   │
│                  │ │ │ Milk  50 ml                         │   │
│                  │ │ │ [+ Add Ingredient]                  │   │
│                  │ │ └──────────────────────────────────── │   │
│                  │ │                                              │
│                  │ │ ┌─ COST BREAKDOWN ───────────────────┐   │
│                  │ │ │ Sub-Recipe Cost:    ₹45             │   │
│                  │ │ │ Direct Ingredients: ₹2              │   │
│                  │ │ │ Total Recipe Cost:  ₹47/piece       │   │
│                  │ │ └─────────────────────────────────── │   │
│                  │ │                                              │
│                  │ │ [Save Changes]                              │
└──────────────────┴──────────────────────────────────────────────┘
```

### Left Panel (35%) — Recipe List

| Element | Spec |
|---------|------|
| Search | Filter by recipe name or food name |
| "+ Add Recipe" | Clears right panel for new recipe form |
| Recipe cards | Name (bold), linked food name, ingredient count + sub-recipe count |
| Selected state | Blue left border |

### Right Panel (65%) — 3 States

**State 1: Empty** — "Select a recipe or add a new one"

**State 2: Edit Existing**

| Section | Content |
|---------|---------|
| **Form** | Linked Food (dropdown from `getFoodsList()`), Prep Time, Serves, Output Qty, Output Unit |
| **Delete** | Red button, confirmation: "This will remove the recipe. The food item will remain but won't have a recipe linked." |
| **BOM — Sub-Recipes** (purple left border) | Expandable rows. Each shows sub-recipe name + qty + unit. Click expand → shows child ingredients (read-only, from sub-recipe data). "+ Add Sub-Recipe" button. |
| **BOM — Direct Ingredients** (green left border) | Simple rows: Ingredient dropdown + Qty + Unit + Remove. "+ Add Ingredient" button. |
| **Cost Breakdown** | Sub-Recipe Cost + Direct Cost = Total ₹/unit |
| **Save** | "Save Changes" button |

**State 3: Add New** — Empty form, empty BOM sections, "Create Recipe" button

### Ingredient/Sub-Recipe Picker

Unified dropdown with two sections:

```
┌─ Search... ──────────────────────┐
│ SUB-RECIPES (4)                   │
│   Elachi Cookie Dough (12 ing)    │
│   Oats Cookie (10 ing)            │
│   Ragi Cookie (8 ing)             │
│   Sesame Cookie (9 ing)           │
│                                   │
│ RAW MATERIALS (47)                │
│   Almonds (2 kg)                  │
│   Baking Powder (3.21 kg)         │
│   Milk (15.66 ltr)                │
│   ...                             │
└───────────────────────────────────┘
```

- Pick sub-recipe → goes to purple section (expandable)
- Pick raw material → goes to green section (simple row)
- Both send `ingredient_id` to API (sub-recipe's `inventory_id` or raw material's `id`)

### How sub-recipe detection works (frontend logic)

```javascript
// On load: build a map of inventory_id → sub-recipe
const subRecipeMap = {};
subRecipes.forEach(sr => {
  if (sr.inventory_id) subRecipeMap[sr.inventory_id] = sr;
});

// When displaying recipe ingredients:
ingredient.isSubRecipe = !!subRecipeMap[ingredient.ingredient_id];
ingredient.subRecipeData = subRecipeMap[ingredient.ingredient_id] || null;
```

---

## Tab 4: Addons (keep current — simple table + popup)

### Table Columns

| Column | Source | Display |
|--------|--------|---------|
| Name | `name` | Bold text |
| Price | `price` | "₹50" (fix O-8: add ₹ prefix) |
| Status | `status` | Badge: "Active" / "Inactive" |
| Actions | Edit + Delete | Popup dialog |

### Add Addon: Popup dialog (Name, Price)
### No pattern change.

---

## Tab 5: Addon Recipes — MASTER-DETAIL (Pattern A)

Same pattern as Tab 3 (Recipes), but:

| Difference | Recipes (Tab 3) | Addon Recipes (Tab 5) |
|-----------|----------------|----------------------|
| Linked to | Food (from `getFoodsList()`) | Addon (from `getAddonList()`) |
| List source | `getRecipeList()` | `getAddonRecipes()` |
| Create API | `createRecipe()` | `createAddonRecipe()` |
| Update API | `updateRecipe()` | `updateAddonRecipe()` |
| Delete API | `deleteRecipe()` | `deleteAddonRecipe()` |
| Orphan detection | — | Shows "Addons without recipe" from `getAddonsWithoutRecipe()` |

### Left Panel shows:
- Addon recipe list + "+ Add Addon Recipe"
- Orphan section: "Addons without recipe (X)" — addons that need recipes linked

### Right Panel: Same BOM editor (purple sub-recipes + green ingredients + cost breakdown)

---

## API Calls

| Call | Tab | When | Cache TTL |
|------|-----|------|:---------:|
| `getFoodsList()` | Foods, Recipes (dropdown) | Tab load | LONG (60s) |
| `getFoodCategories()` | Food Categories | Tab load | LONG (60s) |
| `getRecipeList()` | Recipes, Foods (has-recipe cross-ref) | Tab load | LONG (60s) |
| `getSubRecipeList()` | Recipes (BOM picker + detection) | Tab load | LONG (60s) |
| `getInventoryMaster()` | Recipes, Addon Recipes (ingredient picker) | Tab load | LONG (60s) |
| `getAddonList()` | Addons, Addon Recipes (dropdown) | Tab load | LONG (60s) |
| `getAddonRecipes()` | Addon Recipes | Tab load | LONG (60s) |
| `getAddonsWithoutRecipe()` | Addon Recipes (orphan detection) | Tab load | LONG (60s) |

---

## Issues Fixed

| ID | Issue | Fix |
|----|-------|-----|
| **O-6** | Recipe tab orphaned — no access | Restored as Tab 3 with master-detail + BOM editor |
| **O-7** | Addon Recipe tab orphaned — no access | Restored as Tab 5 with same pattern |
| **O-8** | No ₹ symbol on prices | Added ₹ prefix on Foods and Addons price columns |

---

## What This Replaces

| Before (current) | After (frozen) |
|-------------------|----------------|
| 3 tabs: Foods, Categories, Addons | 5 tabs: Foods, Food Categories, Recipes, Addons, Addon Recipes |
| Recipes completely inaccessible | Master-detail with sub-recipe + ingredient BOM |
| Addon Recipes completely inaccessible | Same pattern as Recipes |
| No sub-recipe visibility in recipes | Purple/green BOM sections with expandable sub-recipe tree |
| No cost breakdown | Total recipe cost = sub-recipe cost + direct cost |
| Flat ingredient picker (no grouping) | Unified picker: Sub-Recipes section + Raw Materials section |

---

## Mock References

| Mock | Description |
|------|-------------|
| `prodcat_final_foods` | Foods tab with ₹ prefix |
| `prodcat_final_recipes` | Recipes tab table view |
| `recipe_mock_pattern_a` | Recipe master-detail with BOM editor |
| `recipe_editor_with_subrecipe` | BOM detail: purple sub-recipes + green ingredients + cost |
| `recipe_editor_add_picker` | Unified ingredient/sub-recipe picker dropdown |

---

*This document is FROZEN. Implementation proceeds against this spec. Changes require owner re-approval.*
