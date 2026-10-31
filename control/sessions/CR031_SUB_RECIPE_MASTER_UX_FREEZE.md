# CR-031 — Sub-Recipe Master UX Freeze

> **Date:** 2026-06-13
> **Status:** FROZEN — Owner approved
> **Scope:** Sub-Recipe Master screen (`/sub-recipe-master`)
> **Pattern:** Master-detail (same as Vendor Management)

---

## Layout: Master-Detail (List 35% + Detail 65%)

### Structure
```
┌──────────────────────────────────────────────────────────────────────┐
│ Sub-Recipe Master                                                    │
│                                                                      │
│ ┌──────────────────┬─────────────────────────────────────────────── │
│ │ SUB-RECIPES      │  DETAIL PANEL                                  │
│ │                  │                                                │
│ │ [Search...]      │  State 1: Empty → "Select or add a recipe"    │
│ │ [+ Add Sub-Recipe]│  State 2: Edit → Form + BOM + Intelligence   │
│ │                  │  State 3: Add → Empty form + empty BOM        │
│ │ ┌──────────────┐ │                                                │
│ │ │ Elachi Cookie│ │  ┌─ Form ──────────────────────── [Delete] ─┐ │
│ │ │ 12 ing | 37pc│ │  │ Name  [Elachi Cookie    ]                │ │
│ │ ├──────────────┤ │  │ Output [1  ] Unit [piece▾] Prep [30]    │ │
│ │ │ Oats Cookie  │ │  └──────────────────────────────────────────┘ │
│ │ │ 10 ing | 24pc│ │                                                │
│ │ ├──────────────┤ │  ┌─ Ingredient BOM ─────────────────────────┐ │
│ │ │ Ragi Cookie  │ │  │ Ingredient      │ Qty   │ Unit  │ ✕     │ │
│ │ │ 8 ing | 37pc │ │  │ Wheat Flour     │ 200   │ gm    │ ✕     │ │
│ │ ├──────────────┤ │  │ Jaggery Powder  │ 100   │ gm    │ ✕     │ │
│ │ │ Sesame Cookie│ │  │ Elachi          │ 5     │ gm    │ ✕     │ │
│ │ │ 9 ing | 6pc🔴│ │  │ [+ Add Ingredient]                      │ │
│ │ └──────────────┘ │  └──────────────────────────────────────────┘ │
│ │                  │  [Save Changes]                                │
│ │                  │                                                │
│ │                  │  ┌─ Intelligence ───────────────────────────┐  │
│ │                  │  │ [₹45/batch] [Produced 2d ago] [FG: 37]  │  │
│ │                  │  └─────────────────────────────────────────┘  │
│ └──────────────────┴────────────────────────────────────────────── │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Left Panel (35%) — Recipe List

### Elements

| Element | Spec |
|---------|------|
| Search bar | Filter by recipe name |
| "+ Add Sub-Recipe" button | Clears right panel for new entry |
| Recipe cards | Name (bold), ingredient count, FG stock with color |

### Card Display

```
┌─────────────────────────┐
│ Elachi Cookie            │
│ 12 ingredients · 37 pcs  │  ← green (adequate)
└─────────────────────────┘
┌─────────────────────────┐
│ Sesame Cookie            │
│ 9 ingredients · 6 pcs    │  ← red (low stock)
└─────────────────────────┘
```

### FG Stock Color

| Condition | Color |
|-----------|-------|
| `is_low_stock = true` or FG stock = 0 | Red text + red left border |
| FG stock > 0 and not low | Green text |

---

## Right Panel (65%) — 3 States

### State 1: Empty (no selection)

```
"Select a sub-recipe to view details, or add a new one"
```
Centered with subtle icon. Shown on page load.

### State 2: Edit Existing

| Section | Content |
|---------|---------|
| **Form** | Name, Output Qty, Unit (dropdown: gm/kg/piece/ml), Prep Time, Serves |
| **Delete button** | Red, top-right corner. Confirmation: "This sub-recipe may be referenced by production runs. Deleting won't affect past runs but prevents future production." |
| **Ingredient BOM** | Table with rows: Ingredient (dropdown from inventory master), Qty (number), Unit (dropdown), Remove (×). "+ Add Ingredient" button below. |
| **Save button** | "Save Changes" — toast on success |
| **Intelligence** | 3 KPI cards (see below) |

### State 3: Add New

| Section | Content |
|---------|---------|
| **Title** | "New Sub-Recipe" with green badge |
| **Form** | Same fields, all empty with placeholders |
| **Ingredient BOM** | 2 empty rows ready to fill + "+ Add Ingredient" |
| **Intelligence** | Hidden (no data yet) |
| **Buttons** | "Cancel" (outline, returns to empty state) + "Create Sub-Recipe" (primary green) |

---

## Intelligence Section (Edit mode only)

### 3 KPI Cards

| KPI | Source | Display |
|-----|--------|---------|
| **Material Cost** | Sum of (ingredient_qty × segment unit_cost) per recipe ingredient | "₹45/batch" |
| **Last Produced** | Latest production run for this sub-recipe from `getProductionRunHistory()` | "2 days ago" / "Never" |
| **FG Stock** | `stockMap[recipe.inventory_id].cal_quantity` | "37 pieces" (green/amber/red) |

---

## Ingredient BOM Editor

### Table Columns

| Column | Type | Source |
|--------|------|--------|
| Ingredient | Searchable dropdown | `getInventoryMaster()` — show `stock_title (unit)` |
| Qty | Number input | `ingredient_qty` |
| Unit | Dropdown (gm, kg, ml, ltr, piece) | `ingredient_unit` |
| Remove | × button | Removes row |

### Add Row
"+ Add Ingredient" appends a new empty row.

### Validation
- At least 1 ingredient required
- Each ingredient must have qty > 0
- Duplicate ingredient detection: "Wheat Flour already added"

### Ingredient Name Resolution (fix P-3/P-6)
- Dropdown shows `stock_title` from inventory master
- Never show `Item #ID` — always resolve from inventory master list
- If ingredient_id not found in inventory master → show "Unknown (ID: X)" with amber warning

---

## CRUD Operations

| Action | API | Behavior |
|--------|-----|----------|
| **Create** | `api.createSubRecipe(payload)` | Toast "Sub-recipe created". Select in list. Show intelligence. |
| **Update** | `api.updateSubRecipe(id, payload)` | Toast "Sub-recipe updated". Stay selected. |
| **Delete** | `api.deleteSubRecipe(id)` — **NEW method needed** | Confirmation dialog → Toast "Sub-recipe deleted" → Select next in list or empty state. |
| **Refresh** | Button in header area | Reload list + intelligence data. |

### Delete API (needs probing)
```
DELETE /proxy/v2/recipe/delete-sub-recipe/{id}
```
If this endpoint doesn't exist → flag as gap. Show delete button as disabled with tooltip "Delete not available — contact administrator".

---

## API Calls

| Call | When | Cache TTL |
|------|------|:---------:|
| `getSubRecipeList()` | Page load | LONG (60s) |
| `getStockInventory()` | Page load (for FG stock in list + ingredient names) | LONG (60s) |
| `getInventoryMaster()` | Page load (for BOM dropdown) | LONG (60s) |
| `getProductionRunHistory()` | Page load (for "Last Produced" KPI) | SHORT (30s) |

---

## What This Replaces

| Before (current) | After (frozen) |
|-------------------|----------------|
| Table list with popup edit dialog | Master-detail (list left, detail right) |
| No add flow visible (button + popup) | "+ Add" clears right panel for inline form |
| No delete action | Delete button with confirmation |
| Ingredient names show as `Item #ID` | Resolved from inventory master |
| No intelligence | Material cost, last produced, FG stock KPIs |
| No refresh button | Refresh in header |

---

## Mock References

| Mock | Description |
|------|-------------|
| `subrecipe_empty_state` | State 1: No selection |
| `subrecipe_edit_view` | State 2: Editing Elachi Cookie with BOM + intelligence |
| `subrecipe_add_new` | State 3: Adding new sub-recipe |

---

*This document is FROZEN. Implementation proceeds against this spec. Changes require owner re-approval.*
