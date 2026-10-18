# Investigation Report — No Food Dropdown in Recipe Create Form

> **Date:** 2026-07-16  
> **Agent Role:** INVESTIGATION  
> **Issue:** When creating a recipe on palm collection (812, master), the "Linked Food" field shows "—" with no dropdown to select a food  
> **Account:** `captain@palmcollection.com` (master, RID 812)

---

## Root Cause Classification

| Category | Action |
|----------|--------|
| **Frontend bug** | The `RecipeDetail` component in `RecipeCatalogue.jsx` lacks a food selection `<Select>` dropdown in add mode. The "Linked Food" field is a read-only `<p>` tag. |

---

## Investigation Steps

### Step 1: API Probe — Foods Exist

```
GET /api/proxy/v2/product/foods-list → 344 foods returned ✅
```

The POS API returns **344 food items** for master 812. The data is available — this is NOT a backend issue.

### Step 2: Frontend Code Trace

**File:** `frontend/src/components/central-inventory/RecipeCatalogue.jsx`

**Data flow:**
1. Parent component fetches foods via `api.getFoodsList()` (line 37)
2. Passes `foods` prop (344 items) to `RecipeDetail` (line 122)
3. `RecipeDetail` receives `foods` prop (line 138) but **never renders a dropdown for it**

**The bug — Line 326-327:**
```jsx
<div>
  <Label className="text-[10px] text-muted-foreground">Linked Food</Label>
  <p className="h-8 text-xs flex items-center font-medium">{name || "—"}</p>
</div>
```

This is a **read-only `<p>` tag**, not a `<Select>` dropdown. In add mode:
- `name` is `""` (initialized at line 139)  
- `foodId` is `""` (initialized at line 140)
- `useEffect` on line 159 only runs when `recipe` is not null (edit mode)
- No UI element sets `name` or `foodId` in add mode

**Save validation (line 241-243):**
```javascript
if (!foodId) {
  toast({ title: "Please select a linked food item first", variant: "destructive" });
  return;
}
```

The save button is also disabled via `disabled={saving || !name.trim() || !foodId}` (line 465).

**Result:** The user can never select a food, so `foodId` stays empty, and the recipe can never be saved.

### Step 3: What Should Happen

In add mode (`isAddMode=true`), line 326-327 should render a `<Select>` dropdown populated with:
- The `foods` prop (344 items)
- Filtered to show only foods without existing recipes (unlinked foods)
- When a food is selected, both `name` and `foodId` should be set

---

## Root Cause

**Frontend code defect in `RecipeCatalogue.jsx`**. The `RecipeDetail` component renders the "Linked Food" field as a static `<p>` tag in ALL modes (both add and edit). It should render a `<Select>` dropdown when `isAddMode=true`.

The `foods` data (344 items) is correctly fetched from the API and passed as a prop, but is never used to render a selectable UI element.

---

## Recommended Fix

**File:** `frontend/src/components/central-inventory/RecipeCatalogue.jsx`  
**Location:** Lines 326-328  
**Change:** Replace the static `<p>` with a `<Select>` dropdown in add mode

```jsx
// CURRENT (broken):
<Label>Linked Food</Label>
<p>{name || "—"}</p>

// SHOULD BE:
<Label>Linked Food</Label>
{isAddMode ? (
  <Select value={foodId} onValueChange={(v) => {
    setFoodId(v);
    const f = foods.find(f => String(f.id) === v);
    setName(f?.name || f?.food_name || "");
  }}>
    <SelectTrigger><SelectValue placeholder="Select food..." /></SelectTrigger>
    <SelectContent>
      {foods
        .filter(f => !recipes.some(r => String(r.food_id) === String(f.id)))
        .map(f => <SelectItem key={f.id} value={String(f.id)}>{f.name || f.food_name}</SelectItem>)
      }
    </SelectContent>
  </Select>
) : (
  <p>{name || "—"}</p>
)}
```

**Dependencies:** The `RecipeDetail` would need the full recipes list to filter out already-linked foods, or the parent should pass `unlinkedFoods` as a pre-filtered prop.

---

## Impact

- **Severity:** P1 — Core feature broken (cannot create recipes at all)
- **Scope:** Affects all master/central stores using the Product Catalog → Recipes → Add Recipe flow
- **Workaround:** None via UI. Recipes can only be created via direct API call (`POST /api/proxy/v2/recipe/store-recipe`)
