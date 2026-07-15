# BUG-017 — Intake (Artifact #1)

# Duplicate Ingredient Selection in Recipe & Sub-Recipe BOM

---

## Problem

The ingredient dropdown in both **RecipeCatalogue.jsx** (Direct Ingredients section) and **SubRecipeMaster.jsx** (Ingredient BOM section) shows the full inventory master list without filtering out already-selected ingredients. A user can add "Ajwain" 3 times as separate rows.

**Screenshot:** User added Ajwain 3 times in Sweet Masala Cookies recipe.

## Root Cause

Both files render the dropdown as:
```javascript
inventoryMaster.map(m => <SelectItem key={m.id} value={String(m.id)}>...)
```

No filtering of `inventoryMaster` against the current `ingredients` state.

## Requirements

### R1: Exclude Selected Ingredients
- The dropdown for each row should exclude ingredient IDs already used in OTHER rows
- The current row's own selection should remain visible (so the user sees what they picked)

### R2: Re-add to Pool on Remove
- When a row is deleted or its ingredient changed, the old ingredient becomes available again

### R3: Both Editors
- Fix in RecipeCatalogue.jsx (line 317)
- Fix in SubRecipeMaster.jsx (line 363)

## Scope

| File | Line | Change |
|------|------|--------|
| `RecipeCatalogue.jsx` | 317 | Filter `inventoryMaster` to exclude IDs in `ingredients` except current row |
| `SubRecipeMaster.jsx` | 363 | Same filter |
