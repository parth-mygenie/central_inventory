# CR-035 — Intake (Artifact #1)

# Store Creation — 2-Step Create & Push Flow + Outlet Visibility

---

## Problem Statement

### Issue 1: 2-Step Store Creation
Currently, creating a new store requires **two separate user actions**: create store, then manually push catalog. Owner wants a **single 2-step UI flow**: Step 1 captures details, Step 2 shows push preview, one button does both.

### Issue 2: Outlets Not Visible from Central Store
Central Store (813) shows "2 direct children" and "Outlet (0)". The 12 outlets (children of Masters) are invisible from Central. The hierarchy API only returns **direct children**, so Central can't see or manage outlets.

**Expected:** Central should see the full hierarchy — Masters AND their Outlets.

---

## Current Flow

### Store Creation
```
[Create Store] → Inline form → "Create Store" → store appears (no catalog)
[Push button per store] → catalog synced (separate action)
```

### Hierarchy Visibility
```
Central (813) sees: 2 Masters (814, 815) — Outlet (0)
Master North (814) sees: 6 Outlets (816-821)
Master South (815) sees: 6 Outlets (822-827)
Central CANNOT see any of the 12 outlets
```

---

## Requirements

### R1: 2-Step Create & Push UI
- Step 1: Store details form (name, type, email, phone, password, address) → "Next"
- Step 2: Summary + catalog count cards (Categories, Ingredients, Products, Recipes, Sub-Recipes, Addons, Addon Recipes) → "Create & Push"
- One action creates store + pushes catalog

### R2: Full Hierarchy Visibility at Central
- Central Store must see Masters AND Outlets in the Store Management list
- Outlets should be visually grouped under their parent Master
- Filter tabs: All / Master / Outlet — all populated with correct counts

### R3: No Regression
- Existing Push button per store stays
- Master-level view unchanged (still sees only its direct outlets)
- Stock health columns (OOS/Low/OK) work for all visible stores

---

## Scope

### In Scope
| # | Item | File |
|---|------|------|
| 1 | 2-step create wizard | `StoreManagement.jsx` |
| 2 | Outlet visibility from Central | `StoreManagement.jsx` + possibly `useHierarchyManagement.js` |

### Out of Scope
- Backend API changes (proxy-only architecture)
- Store edit/delete
- Selective push (all-or-nothing)

---

## API Contract Reference

| API | Returns | Limitation |
|-----|---------|-----------|
| `GET /franchise/list` (via getHierarchyList) | Direct children only | Central sees Masters, not Outlets |
| `GET /franchise/create` | `available_entities` with catalog counts | Used for Step 2 preview |
| `POST /franchise/create` | New child data with ID | Used for create |
| `POST /franchise/push/{id}` | Push result | Used for push |
| `GET /franchise/push-form/{id}` | Source vs child entity counts | Used for push status |

### Outlet Visibility Solution Options
1. **Fetch nested:** After getting Masters, fetch each Master's children → flatten into single list with parent info
2. **Use hierarchy-summary:** `getHierarchySummary` may return all stores in the tree
3. **Frontend aggregation:** Multiple API calls, merge client-side

---

## UI Sketch — Step 2

```
YOUR CATALOG WILL BE PUSHED

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│    3     │ │    75    │ │    19    │ │    19    │
│Categories│ │Ingredients│ │ Products │ │ Recipes  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐
│    31    │ │     0    │ │     0    │
│Sub-Recipes│ │ Addons  │ │Addon     │
│          │ │         │ │Recipes   │
└──────────┘ └──────────┘ └──────────┘
```

Label mapping: API `foods` → display "Products"

---

## Estimated Effort

| Task | Time |
|------|------|
| 2-step wizard UI | 30 min |
| Outlet visibility (nested fetch) | 30 min |
| Testing | 15 min |
| **Total** | ~75 min |
