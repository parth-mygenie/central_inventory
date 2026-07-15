# BUG-017 — Session-Start (Artifact #0)

---

## Session Context

| Field | Value |
|-------|-------|
| **Date** | 2026-06-14 |
| **Agent / Developer** | E1 Agent |
| **Sprint** | S3 |
| **Item ID** | BUG-017 |
| **Item Title** | Duplicate Ingredient Selection Allowed in Recipe & Sub-Recipe BOM |
| **Item Type** | BUG |
| **Branch** | 14-june-1 |

## What I'm Working On

Fix ingredient dropdown in RecipeCatalogue and SubRecipeMaster to exclude already-selected ingredients from the options list, preventing duplicate ingredient rows.

## Files I Expect to Touch

| File | Action | Reason |
|------|--------|--------|
| `frontend/src/components/central-inventory/RecipeCatalogue.jsx` | modify | Filter inventoryMaster dropdown to exclude selected ingredient IDs |
| `frontend/src/components/central-inventory/SubRecipeMaster.jsx` | modify | Same fix |

## Pre-Conditions Verified

- [x] Checked `control/L7_FILE_OWNERSHIP.md` — neither file is frozen
- [x] Terminology mapping not affected

## Exit Criteria

- Cannot select the same ingredient twice in either Recipe or Sub-Recipe BOM editor
- Existing selections still work, changing an ingredient re-adds old one to available pool
