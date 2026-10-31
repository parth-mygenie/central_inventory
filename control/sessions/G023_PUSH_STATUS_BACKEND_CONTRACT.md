# Backend API Contract: Push Status — `GET /franchise/push-form/{childId}`

> **Date:** 2026-06-14
> **Requested by:** Central Inventory Frontend
> **Priority:** P1 — Blocks accurate push status display on Store Management screen
> **Gap ID:** G-023 (new)

---

## Problem

The `GET /api/v2/vendoremployee/franchise/push-form/{childId}` endpoint returns `source_entities` and `child_existing` with **mismatched categories**, making it impossible for the frontend to compute an accurate push status.

### Current Response

```json
{
  "source_entities": {
    "categories": [...],       // 3 objects with {id, name, ...}
    "foods": [...],            // 19 objects with {id, name, price, category_id}
    "addons": [...],           // 0 items
    "ingredients": [...],      // 75 objects with {id, stock_title, unit}
    "sub_recipes": [...],      // 31 objects with {id, name}
    "recipes": [...],          // 19 objects with {id, name}
    "roles": [...]             // 13 objects with {id, name, ...}
  },
  "child_existing": {
    "category_names": [...],   // 3 strings (name only)
    "food_names": [...],       // 19 strings (name only)
    "addon_names": [...],      // 0 items
    "role_names": [...]        // 13 strings (name only)
  }
}
```

### What's Wrong

| `source_entities` key | `child_existing` key | Status |
|----------------------|---------------------|:------:|
| `categories` (3) | `category_names` (3) | ✅ Matchable by name |
| `foods` (19) | `food_names` (19) | ✅ Matchable by name |
| `addons` (0) | `addon_names` (0) | ✅ Empty |
| **`ingredients` (75)** | **MISSING** | ❌ **Cannot determine push status** |
| **`sub_recipes` (31)** | **MISSING** | ❌ **Cannot determine push status** |
| **`recipes` (19)** | **MISSING** | ❌ **Cannot determine push status** |
| `roles` (13) | `role_names` (13) | ✅ Matchable by name |

**Result:** Frontend counts 160 source items vs 35 child items = "125 items behind" — even though all items are actually pushed. The 125 "gap" is entirely from missing `ingredients`, `sub_recipes`, and `recipes` in `child_existing`.

---

## Requested Fix

### Option A: Add missing keys to `child_existing` (Preferred — minimal change)

Add the 3 missing keys to `child_existing` so all categories can be compared:

```json
{
  "child_existing": {
    "category_names": ["Jaggery Cookies", ...],
    "food_names": ["Sesame Cookies With Jaggery", ...],
    "addon_names": [],
    "ingredient_names": ["Ajwain", "Wheat Flour", ...],     // ← ADD THIS
    "sub_recipe_names": ["Sesame Cookies", "Oats Cookies", ...],  // ← ADD THIS
    "recipe_names": ["Ajwain Cookies With Jaggery", ...],   // ← ADD THIS
    "role_names": ["Waiter", ...]
  }
}
```

**Why names?** The existing pattern uses name-based matching. Keeping it consistent.

### Option B: Return IDs instead of names (Better for accuracy)

Replace name-based arrays with ID-based arrays for exact matching:

```json
{
  "child_existing": {
    "category_ids": [7900, 7901, 7902],
    "food_ids": [206275, 206276, ...],
    "addon_ids": [],
    "ingredient_ids": [17815, 17816, ...],
    "sub_recipe_ids": [206, 207, ...],
    "recipe_ids": [9381, 9382, ...],
    "role_ids": [5805, 5806, ...]
  }
}
```

**Why IDs?** Name matching can be unreliable (case sensitivity, special characters, renamed items). IDs give exact match.

### Option C: Return a push_summary object (Best UX — new field)

Add a computed summary so the frontend doesn't need to calculate anything:

```json
{
  "source_entities": { ... },
  "child_existing": { ... },
  "push_summary": {
    "total_source": 160,
    "total_pushed": 160,
    "total_behind": 0,
    "breakdown": {
      "categories": { "source": 3, "pushed": 3 },
      "foods": { "source": 19, "pushed": 19 },
      "addons": { "source": 0, "pushed": 0 },
      "ingredients": { "source": 75, "pushed": 75 },
      "sub_recipes": { "source": 31, "pushed": 31 },
      "recipes": { "source": 19, "pushed": 19 },
      "roles": { "source": 13, "pushed": 13 }
    },
    "status": "synced"    // "synced" | "stale" | "partial"
  }
}
```

**Why?** Frontend gets status directly. No computation needed. `status` field can power badge color.

---

## What Frontend Will Do

Once the backend fix is live:

| Backend Option | Frontend Change |
|---------------|----------------|
| **Option A** | Fix key mapping in `HierarchyManagement.jsx` to match `ingredient_names`↔`ingredients`, etc. |
| **Option B** | Switch from name-count to ID-count comparison |
| **Option C** | Read `push_summary.total_behind` and `push_summary.status` directly — simplest |

### Interim Frontend Fix (before backend change)

Until backend is updated, frontend will:
- Only compare categories that exist in BOTH `source_entities` and `child_existing` (categories, foods, addons, roles)
- Skip `ingredients`, `sub_recipes`, `recipes` from the count
- Show accurate status for what's comparable, with a note that full push status requires backend update

---

## Also Needed: Transfer History `from/to` Restaurant Names

### Endpoint: `POST /inventory-transfer/history`

**Current:** Returns `from_restaurant_name: null` and `to_restaurant_name: null` for all transfers. Also missing `from_restaurant_type` and `to_restaurant_type`.

**Sample response:**
```json
{
  "from_restaurant_id": 813,
  "to_restaurant_id": 814,
  "from_restaurant_name": null,   // ← should be "chai"
  "to_restaurant_name": null,     // ← should be "Chai Master North"
  // from_restaurant_type: missing  ← should be "master"
  // to_restaurant_type: missing    ← should be "central"
}
```

**Requested fix:** Populate `from_restaurant_name`, `to_restaurant_name`, and add `from_restaurant_type`, `to_restaurant_type` from the restaurant records.

**Frontend workaround:** Using `useRestaurantMap` hook to resolve IDs from hierarchy data. Works but adds extra API calls.

---

## Summary of Backend Gaps

| # | Endpoint | Gap | Priority | Frontend Workaround |
|---|----------|-----|:--------:|:-------------------:|
| **G-023** | `GET /franchise/push-form/{id}` | `child_existing` missing ingredients, sub_recipes, recipes | **P1** | Compare only matching keys (lossy) |
| **G-003** | `POST /inventory-transfer/history` | `from_restaurant_name` / `to_restaurant_name` = null | P2 | `useRestaurantMap` hook resolves by ID |
| **G-004** | `POST /inventory-transfer/history` | Missing `from_restaurant_type` / `to_restaurant_type` | P2 | `useRestaurantMap` hook resolves by ID |

---

*This document is the contract between frontend and backend teams. Backend team: please confirm which option you'll implement and ETA.*
