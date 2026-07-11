# Gate 2+3: Impact Analysis & Implementation Plan — Indirect Outlets API Wiring + Push Always Visible

> **Date:** 2026-07-11
> **Agent Role:** PLANNING
> **Source:** INVESTIGATION_REPORT_INDIRECT_OUTLETS_20260711.md
> **Code Reality:** PARTIAL — BUG-040 shell merge + investigation-fix exist as workarounds; new API fields not wired yet

---

## Conflict Pre-Check

| File | Other Active Items | Conflict? |
|------|-------------------|:---------:|
| `api.js` (normalizeHierarchyChild) | None active on this function | SAFE |
| `StoreManagement.jsx` | BUG-040 (IMPLEMENTED — being replaced) | SAFE — superseding |

---

## Execution Sequence

```
1. api.js — normalizeHierarchyChild: add 4 new fields
2. StoreManagement.jsx — remove shell merge + secondary fetch (dead code)
3. StoreManagement.jsx — replace isNested with isDirectChild
4. StoreManagement.jsx — Push button always visible
5. StoreManagement.jsx — ExpandedStoreDetail use managingParentName
6. StoreManagement.jsx — ExpandedStoreDetail Push button always visible
7. StoreManagement.jsx — replace N health calls with single store_stock_health call
```

---

## Edit 1: `api.js` — normalizeHierarchyChild (line 869-890)

**Current:**
```javascript
function normalizeHierarchyChild(raw) {
  if (!raw) return raw;
  return {
    id: raw.id,
    name: raw.name,
    phone: raw.phone,
    email: raw.email,
    address: raw.address,
    status: raw.status,
    active: raw.active,
    restaurantTypeFlag: raw.restaurant_type_flag,
    parentRestaurantId: raw.parent_restaurant_id,
    slug: raw.slug,
    createdAt: raw.created_at,
    vendor: raw.vendor ? { ... } : null,
  };
}
```

**New — add 4 fields after `createdAt`:**
```javascript
    createdAt: raw.created_at,
    isDirectChild: raw.is_direct_child,           // NEW — true/false/undefined
    hierarchyLink: raw.hierarchy_link,             // NEW — "direct"/"indirect"/undefined
    managingParentRestaurantId: raw.managing_parent_restaurant_id,  // NEW
    managingParentName: raw.managing_parent_name,  // NEW
    vendor: ...
```

**Risk:** ZERO — additive fields, no consumers break if undefined.

---

## Edit 2: `StoreManagement.jsx` — Remove `allStores` state, shell merge, and secondary fetch

Since `franchise/list` now returns all 5 children (including indirect) with full data, the following are dead code:
- `const [allStores, setAllStores] = useState([])` (line 53)
- `allRestaurants` extraction in health fetch (lines 94, 99-100, 115)
- `displayChildren` shell merge (lines 119-134)
- Entire indirect outlets secondary fetch useEffect (lines 136-195)

**Replace `displayChildren` with:**
```javascript
const displayChildren = children;
```

**Remove from health fetch:** The `allRestaurants` / `setAllStores` logic (lines 94, 99-100, 115).

**Remove:** Entire useEffect block at lines 136-195.

**Update references:**
- `filtered` already uses `displayChildren` — still works since `displayChildren = children`
- `ExpandedStoreDetail` prop `allStores={allStores}` — no longer needed

---

## Edit 3: `StoreManagement.jsx` — Replace `isNested` with `isDirectChild`

| Location | Current | New |
|----------|---------|-----|
| Line 472 | `child.isNested && <span>↳</span>` | `child.isDirectChild === false && <span>↳</span>` |
| Line 548 (ExpandedStoreDetail) | `child.isNested ? (indirect view) : (full view)` | `child.isDirectChild === false ? (indirect view) : (full view)` |

---

## Edit 4: `StoreManagement.jsx` — Push button ALWAYS visible (table row)

**Current (line 500):**
```jsx
{ps?.status === "stale" && (
  <Button ...>Push</Button>
)}
```

**New:**
```jsx
{ps && (
  <Button ...>Push</Button>
)}
```

Push button shows for ALL children with push status data (stale or synced). The `push-form` API works regardless of status.

---

## Edit 5: `StoreManagement.jsx` — ExpandedStoreDetail: use `managingParentName`

**Current (line 551-558):**
```jsx
<p>This outlet is managed by a Master Store
  {child.parentRestaurantId && allStores.length > 0 && (() => {
    const parent = allStores.find(s => s.restaurant_id === child.parentRestaurantId);
    return parent ? ` (${parent.restaurant_name})` : "";
  })()}
  . View details from the parent store's management screen.
</p>
```

**New — use API field directly:**
```jsx
<p>This outlet is managed by {child.managingParentName || "a Master Store"}.
   View details from the parent store's management screen.
</p>
```

No `allStores` lookup needed. Remove `allStores` prop from `ExpandedStoreDetail`.

---

## Edit 6: `StoreManagement.jsx` — ExpandedStoreDetail: Push button always visible

**Current (line 571):**
```jsx
{pushStatus?.status === "stale" && (
  <Button>Push Now — {pushStatus.behind} items to push</Button>
)}
```

**New:**
```jsx
{pushStatus && (
  <Button>
    {pushStatus.status === "stale"
      ? `Push Now — ${pushStatus.behind} items to push`
      : "Push Now"}
  </Button>
)}
```

---

## Edit 7: `StoreManagement.jsx` — Replace N health calls with single `store_stock_health`

**Current:** N parallel `getHierarchyDetail` calls (one per child, lines 86-117).

**New:** Single call: `api.getHierarchyDetail({ storeRestaurantId: restaurantId, includeStockHealthSummary: true })` where `restaurantId` is the logged-in user's own RID. Map `store_stock_health[]` entries to `childHealthMap` by `restaurant_id`.

**Requires:** `api.js` `_getHierarchyDetail` to pass `include_stock_health_summary` param.

**api.js change (line 296-304):**
Add `includeStockHealthSummary` to the `_getHierarchyDetail` function params:
```javascript
if (includeStockHealthSummary) payload.include_stock_health_summary = true;
```

**StoreManagement health fetch replacement:**
```javascript
useEffect(() => {
  if (children.length === 0) return;
  api.getHierarchyDetail({ storeRestaurantId: restaurantId, includeStockHealthSummary: true })
    .then(resp => {
      const d = resp.data?.data || resp.data;
      const healthEntries = d?.store_stock_health || [];
      const map = {};
      healthEntries.forEach(h => {
        map[h.restaurant_id] = {
          oos: h.out_of_stock_rows || 0,
          low: h.low_stock_rows || 0,
          ok: h.ok_stock_rows || 0,
          total: h.stock_rows || 0,
          oosItems: [], oosMore: 0,
        };
      });
      setChildHealthMap(map);
    })
    .catch(() => {});
}, [children, restaurantId]);
```

**Trade-off:** Loses per-item OOS names (`oosItems`) shown in expanded detail. The `store_stock_health` only has counts, not item names. Acceptable: expanded detail can still fetch per-child detail on expand.

---

## Verification Matrix

| # | Edit | How to Verify | Automated? |
|---|------|---------------|:---:|
| 1 | normalizeHierarchyChild | `console.log(children[2])` → has `isDirectChild`, `managingParentName` | NO — browser |
| 2 | Shell merge removed | No duplicates in list (5 not 7+) | NO — browser |
| 3 | `↳` prefix on indirect | HK Outlet North/South have `↳`, HK Express does not | NO — browser |
| 4 | Push button always visible | All 5 rows have Push button (including Synced stores) | NO — browser |
| 5 | managingParentName in expanded | Expand HK Outlet North → "managed by HK Alpha Central" | NO — browser |
| 6 | Push button in expanded detail | Expand synced store → Push Now button visible | NO — browser |
| 7 | Single health call | OOS/Low/OK counts match (0/0/0 for 808, 0/0/1 for 807) | NO — browser |

## Scope Lock

**Files WILL change:**
- `frontend/src/services/api.js` — normalizeHierarchyChild + _getHierarchyDetail param
- `frontend/src/components/central-inventory/StoreManagement.jsx` — 7 edits

**Files will NOT touch:**
- `terminology.js` (FROZEN)
- `screenVisibility.js` (FROZEN)
- `server.py` (PROXY-ONLY)
- All other components

## Post-Code Registry Checklist (for IMPLEMENTATION agent)
- [ ] Code markers in every modified file
- [ ] Compile check: 0 new warnings
- [ ] L7: updated with modified files
