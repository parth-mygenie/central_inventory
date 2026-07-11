# INVESTIGATION REPORT — Store Management: Indirect Outlets Missing Data

> **Date:** 2026-07-11
> **Agent Role:** INVESTIGATION
> **Scope:** Store Management screen — master (Central Store) should see all restaurant info + stock health for indirect outlets

---

## Issue
When logged in as Central Store (master), the Store Management page shows 5 stores. Direct children (HK Alpha Central, HK Central, HK Express) display full data: email, push status, OOS/Low/OK counts. Indirect outlets (HK Outlet North, HK Outlet South — grandchildren via Master Stores) show "—" for all fields.

## Hierarchy
```
803 (hells kitchen) — master — Central Store ← LOGGED IN
├── 805 (HK Alpha Central) — central — Master Store [DIRECT]
│   └── 808 (HK Outlet North) — franchise — Outlet [INDIRECT]
├── 804 (HK Central) — central — Master Store [DIRECT]
│   └── 807 (HK Outlet South) — franchise — Outlet [INDIRECT]
└── 806 (HK Express) — franchise — Outlet [DIRECT]
```

## Root Cause

### Data Flow Trace
1. `franchise/list` → returns 3 direct children (805, 804, 806)
2. Push status fetched for `children` (direct only) → lines 58-83
3. Health (hierarchy-detail) fetched for `children` (direct only) → lines 86-116
4. `allStores` populated from hierarchy-detail → includes all 5 restaurants
5. `displayChildren` merges direct children + indirect outlets → shell objects with `email: ""`, no health, no push status

### Shell Object Structure (BUG-040)
```javascript
{ id: 808, name: "HK Outlet North", restaurantTypeFlag: "franchise", email: "", isNested: true, parentRestaurantId: 805 }
```
Missing: email, push status, health data.

## API Verification — All APIs Work for Indirect Outlets

| API | RID 808 (indirect) | Status |
|-----|-------------------|:------:|
| `push-form/808` | `push_summary: { total_behind: 19, status: "stale" }` | ✅ 200 |
| `hierarchy-detail?store_restaurant_id=808` | `child_stock_summary: 0 items` (empty stock, but valid) | ✅ 200 |
| `hierarchy-detail?store_restaurant_id=807` | `child_stock_summary: 1 item (Chicken: 2)` | ✅ 200 |

## What's Missing and Where

| Data | Source for Direct | Available for Indirect? | Fix |
|------|-------------------|:-----------------------:|-----|
| **Email** | `franchise/list` child.email | ❌ Not in hierarchy-summary or hierarchy-detail | Backend gap — show "—" or "(via {parent})" |
| **Push Status** | `push-form/{id}` | ✅ Works | Fetch for indirect outlets too |
| **OOS/Low/OK** | `hierarchy-detail` | ✅ Works | Fetch for indirect outlets too |

## Recommended Fix (Frontend)

### Approach: After discovering indirect outlets, fetch their push status + health

**File: `StoreManagement.jsx`**

Add a new `useEffect` that triggers after `allStores` is populated:
1. Identify indirect outlet IDs (in `allStores` but not in `children`)
2. Fetch `getPushForm()` for each
3. Fetch `getHierarchyDetail()` for each
4. Merge results into `pushStatusMap` and `childHealthMap`

**For email:** No API provides email for indirect outlets. Options:
- Show "—" (current behavior) — acceptable
- Show "(via HK Alpha Central)" — indicates parent relationship

### Classification
**Frontend bug** — push status and health data ARE available from POS API for indirect outlets, but the frontend doesn't fetch them. No backend changes needed for push/health. Email is a backend gap (file in L9 if desired).

### Estimated Scope
- **Files:** 1 (StoreManagement.jsx)
- **Risk:** LOW — additive change, fetch more data for already-displayed rows
- **Complexity:** LOW — pattern matches existing push/health fetch logic
