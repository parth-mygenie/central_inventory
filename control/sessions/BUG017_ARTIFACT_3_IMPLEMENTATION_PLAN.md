# BUG-017 — Implementation Plan (Artifact #3)

---

## Plan

Two identical changes in two files. Both can be done in parallel.

### Task 1: RecipeCatalogue.jsx (line 317)

**Current:**
```jsx
<SelectContent className="max-h-48">{inventoryMaster.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.stock_title} ({m.unit})</SelectItem>)}</SelectContent>
```

**Target:**
```jsx
<SelectContent className="max-h-48">
  {inventoryMaster
    .filter(m => !ingredients.some((other, j) => j !== ing.idx && String(other.ingredient_id) === String(m.id)))
    .map(m => <SelectItem key={m.id} value={String(m.id)}>{m.stock_title} ({m.unit})</SelectItem>)}
</SelectContent>
```

**Context:** This is inside the `directIngredients.map(ing => ...)` loop (line 306). The `ing` object has `ing.idx` (the original index in the `ingredients` array). We filter `inventoryMaster` to exclude IDs already selected in other rows.

### Task 2: SubRecipeMaster.jsx (line 363)

**Current:**
```jsx
{inventoryMaster.map(m => (
  <SelectItem key={m.id} value={String(m.id)}>{m.stock_title} ({m.unit})</SelectItem>
))}
```

**Target:**
```jsx
{inventoryMaster
  .filter(m => !ingredients.some((other, j) => j !== idx && String(other.ingredient_id) === String(m.id)))
  .map(m => (
    <SelectItem key={m.id} value={String(m.id)}>{m.stock_title} ({m.unit})</SelectItem>
  ))}
```

**Context:** This is inside `ingredients.map((row, idx) => ...)` loop (line 335). The `idx` variable is the loop index.

### Execution

Both tasks are independent — execute in parallel.

### QA

| # | Test | Pass Criteria |
|---|------|--------------|
| Q1 | Recipe: add ingredient, second dropdown doesn't show it | Selected item excluded |
| Q2 | Recipe: remove ingredient, it reappears in other dropdowns | Re-added to pool |
| Q3 | Recipe: change ingredient on a row | Old one returns to pool, new one removed from pool |
| Q4 | Sub-Recipe: same tests as Q1-Q3 | Same behavior |
| Q5 | Save still works with filtered dropdown | Payload unchanged |

### Estimated Effort: ~15 min
