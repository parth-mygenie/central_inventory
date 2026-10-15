# BUG-017 — Impact Analysis (Artifact #2)

---

## Files Affected

| # | File | Lines | Change | Risk |
|---|------|:-----:|--------|:----:|
| 1 | `RecipeCatalogue.jsx` | 317 | Filter dropdown options per row | LOW |
| 2 | `SubRecipeMaster.jsx` | 363 | Same filter | LOW |

**Total: 2 files, ~5 lines each.**

## Change Detail

### Current (both files)

```jsx
<SelectContent className="max-h-48">
  {inventoryMaster.map(m => <SelectItem key={m.id} value={String(m.id)}>...</SelectItem>)}
</SelectContent>
```

### Target (both files)

```jsx
<SelectContent className="max-h-48">
  {inventoryMaster
    .filter(m => {
      const selectedIds = ingredients
        .map((ing, j) => j !== idx ? String(ing.ingredient_id) : null)
        .filter(Boolean);
      return !selectedIds.includes(String(m.id));
    })
    .map(m => <SelectItem key={m.id} value={String(m.id)}>...</SelectItem>)}
</SelectContent>
```

Logic: For each row at index `idx`, collect all `ingredient_id` values from OTHER rows. Filter out those IDs from the dropdown. The current row's own ID is excluded from the filter so it remains visible.

## Risk

LOW — purely presentation filter. Does not affect payload construction, save logic, or API calls.

## No Regression

- Adding ingredients still works
- Removing ingredients returns them to the pool
- Editing a row's ingredient swaps correctly
- Save payload unchanged
