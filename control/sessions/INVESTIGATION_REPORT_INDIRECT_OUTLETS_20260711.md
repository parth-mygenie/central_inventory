# INVESTIGATION REPORT — New API Contract: franchise/list + hierarchy-detail Updates

> **Date:** 2026-07-11
> **Agent Role:** INVESTIGATION
> **Scope:** Verify new backend API fields, trace frontend impact, document what needs to change

---

## API Verification Results

### 1. `GET /franchise/list` — New `include_indirect` Parameter

| Scenario | Children Returned | Notes |
|----------|:-----------------:|-------|
| No param (default) | **5** | Now includes indirect outlets by default (master only) |
| `include_indirect=true` | **5** | Same as default for master |
| `include_indirect=false` | **3** | Legacy behavior — direct children only |

**New fields on franchise rows (indirect outlets only):**

| Field | Example (HK Outlet North, RID 808) |
|-------|--------------------------------------|
| `is_direct_child` | `false` |
| `hierarchy_link` | `"indirect"` |
| `managing_parent_restaurant_id` | `805` |
| `managing_parent_name` | `"HK Alpha Central"` |

**New fields on direct franchise rows:**

| Field | Example (HK Express, RID 806) |
|-------|-------------------------------|
| `is_direct_child` | `true` |
| `hierarchy_link` | `"direct"` |
| `managing_parent_restaurant_id` | `803` |
| `managing_parent_name` | `"hells kitchen"` |

**Central (type=central) rows**: No new fields — `is_direct_child`, `hierarchy_link`, `managing_parent_*` all MISSING.

**Key: Email is now available for indirect outlets:**
- HK Outlet North: `hkoutletnorth@test.com`
- HK Outlet South: `hkoutletsouth@test.com`

### 2. `POST /inventory-transfer/hierarchy-detail` — New `include_stock_health_summary`

**New opt-in field: `data.store_stock_health[]`** (appears only when `include_stock_health_summary: true`)

Structure per entry:
```json
{
  "restaurant_id": 808,
  "stock_rows": 0,
  "out_of_stock_rows": 0,
  "low_stock_rows": 0,
  "ok_stock_rows": 0
}
```

**Single call for self (803) returns health for ALL 6 restaurants:**

| Restaurant | RID | stock_rows | OOS | Low | OK |
|-----------|:---:|:----------:|:---:|:---:|:--:|
| hells kitchen | 803 | 7 | 0 | 0 | 7 |
| HK Alpha Central | 805 | 7 | 4 | 0 | 3 |
| HK Central | 804 | 7 | 5 | 0 | 2 |
| HK Express | 806 | 7 | 3 | 0 | 4 |
| HK Outlet North | 808 | 0 | 0 | 0 | 0 |
| HK Outlet South | 807 | 1 | 0 | 0 | 1 |

---

## Current Frontend Impact Analysis

### What Already Works (from previous fix)
The previous investigation added a secondary fetch for indirect outlets' push status + health. Since `franchise/list` now returns 5 children by default (instead of 3), the `children` array ALREADY includes indirect outlets. This means:
- Push status is fetched for all 5 children ✅
- Health is fetched for all 5 children ✅
- Email is available from API (but `normalizeHierarchyChild` passes it through) ✅

### What Needs to Change

#### A. `normalizeHierarchyChild` in `api.js` — Pass through new fields
Currently strips all unknown fields. New fields `is_direct_child`, `hierarchy_link`, `managing_parent_restaurant_id`, `managing_parent_name` are dropped.

**Add to normalizer:**
```javascript
isDirectChild: raw.is_direct_child,
hierarchyLink: raw.hierarchy_link,
managingParentRestaurantId: raw.managing_parent_restaurant_id,
managingParentName: raw.managing_parent_name,
```

#### B. `StoreManagement.jsx` — Remove BUG-040 shell object merge
The `displayChildren` merge logic (lines 119-134) creates shell objects for indirect outlets. Since `franchise/list` now returns them directly (with email!), this merge is redundant and creates duplicates.

**Remove:** The `allStores`-based merge in `displayChildren`. Just use `children` directly.
**Remove:** The secondary fetch for indirect outlets (my previous fix) — no longer needed since `children` already includes them.

#### C. `StoreManagement.jsx` — Use `is_direct_child` for the `↳` prefix
Replace `child.isNested` check with `child.isDirectChild === false` (or `child.hierarchyLink === "indirect"`).

#### D. `StoreManagement.jsx` — Push button always visible
**Owner requirement:** Push button should always appear, not just when status is "stale".

Current code (line 500):
```jsx
{ps?.status === "stale" && (
  <Button ...>Push</Button>
)}
```

Change to always show the Push button when `ps` exists (regardless of status).

#### E. `ExpandedStoreDetail` — Use `managingParentName` for indirect outlets
Replace "Indirect Outlet — managed by Master Store ({parentName})" with the API-provided `managing_parent_name`.

#### F. Optional optimization: Use `store_stock_health` for single-call health
Instead of N hierarchy-detail calls (one per child), make ONE call with `store_restaurant_id: self` + `include_stock_health_summary: true`. Map the pre-computed health to `childHealthMap` by `restaurant_id`. This replaces N API calls with 1.

---

## Push Button Visibility — Owner Requirement

**Current:** Push button only shows when `ps?.status === "stale"`.
**Requested:** Push button should ALWAYS appear.

For synced stores, the button could show "Push" (re-push) or be styled differently. The `push-form` API works regardless of status.

---

## Summary of Required Changes

| # | File | Change | Priority |
|---|------|--------|:--------:|
| 1 | `api.js` → `normalizeHierarchyChild` | Add 4 new fields from API | HIGH |
| 2 | `StoreManagement.jsx` | Remove `displayChildren` shell merge + secondary fetch (now redundant) | HIGH |
| 3 | `StoreManagement.jsx` | Use `isDirectChild === false` for `↳` prefix + indirect label | HIGH |
| 4 | `StoreManagement.jsx` | Push button always visible (remove `ps?.status === "stale"` guard) | HIGH |
| 5 | `StoreManagement.jsx` | Use `managingParentName` in expanded detail | MEDIUM |
| 6 | `StoreManagement.jsx` | Optional: single-call health via `include_stock_health_summary` | LOW (optimization) |

### Classification
**Frontend update needed** — backend API changes are additive and backward-compatible. Frontend needs to:
1. Pass through new fields
2. Remove now-redundant workaround code
3. Make Push button always visible
4. Leverage new `managing_parent_name` field

### Estimated Scope
- **Files:** 2 (`api.js`, `StoreManagement.jsx`)
- **Risk:** LOW — simplifying code (removing workarounds), additive field wiring
- **Complexity:** LOW-MEDIUM
