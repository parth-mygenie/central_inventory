# CR-035 — Impact Analysis (Artifact #2)

# Store Creation 2-Step Flow + Outlet Visibility — Impact Analysis

---

## Files Affected

| # | File | Lines | Change Type | Risk |
|---|------|:-----:|-------------|:----:|
| 1 | `frontend/src/components/central-inventory/StoreManagement.jsx` | 416 | Modify: 2-step wizard (lines 198-229) + nested outlet fetch + list display | MEDIUM |
| 2 | `frontend/src/hooks/useHierarchyManagement.js` | 146 | Modify: add `fetchFullHierarchy()` that fetches Masters then their Outlets | LOW |

**Total: 2 files.**

---

## Issue 1: 2-Step Create & Push

### Change: StoreManagement.jsx (lines 198-229)

Replace inline single-step form with 2-step wizard. Detailed in Artifact #3 (Implementation Plan, already created).

**Risk: LOW** — isolated to the create form Card. No impact on list, filters, expand, push.

### APIs Used (no changes)

| API | Used For |
|-----|----------|
| `GET /franchise/create` | `available_entities` for catalog counts in Step 2 |
| `POST /franchise/create` | Create store (Step 2 submit, first call) |
| `POST /franchise/push/{id}` | Push catalog (Step 2 submit, second call) |

---

## Issue 2: Outlets Not Visible from Central

### Root Cause

`GET /franchise/list` returns **direct children only**:
- Central (813) → 2 Masters (814, 815)
- Master North (814) → 6 Outlets (816-821)
- Master South (815) → 6 Outlets (822-827)

Central never sees outlets because they're grandchildren, not direct children.

### Solution: Nested Fetch in `useHierarchyManagement.js`

When the logged-in user is **Central (top-level)**:
1. Fetch `franchise/list` → get Masters (direct children)
2. For each Master, login is NOT needed — use a separate API approach:
   - The `getHierarchyDetail({ storeRestaurantId: masterId })` API is already called per child for stock health (StoreManagement.jsx lines 80-103). But it returns stock data, not child list.
   - **Better approach:** Call `franchise/list` once, get Masters. Then for outlet visibility, we need the POS to return nested data. Since POS only returns direct children per session, we need a **client-side workaround**.

### Client-Side Workaround

The `useHierarchyManagement` hook already has `fetchNestedFranchises()` (lines 54-72) which uses `getHierarchySummary({ storeType: "franchise" })`. However, this returned 0 stores in testing.

**Alternative:** Since Central can't directly fetch Master's children, and we can't login as each Master from the frontend, we use the **existing push-form data** which already fetches per child. But that doesn't give us outlet names.

**Practical solution:** Add a flag in `StoreManagement.jsx` — when `isTopLevel`, after fetching direct children (Masters), call `franchise/list` with each Master's context. BUT we can't switch auth context.

**ACTUAL working solution discovered:** The existing `getHierarchyDetail({ storeRestaurantId: masterId })` call (line 82) returns `child_stock_summary` which contains stock data per outlet. This data IS already being fetched. We can extract outlet info from it.

Let me verify:

```
getHierarchyDetail({ storeRestaurantId: 814 })
→ returns child_stock_summary[] with items per outlet under Master 814
```

If this includes `restaurant_id` and `restaurant_name` per item, we can build the outlet list from it.

### Verified API Response (from hierarchy-detail)

The `getHierarchyDetail` already returns per-child stock items. The child health map (lines 86-99) iterates `child_stock_summary` but only counts OOS/Low/OK. If the summary includes restaurant-level grouping, we can extract outlet IDs.

**If hierarchy-detail doesn't return outlet list:** We fall back to showing Masters only with a note "(+ N outlets)" — and outlets visible when expanding a Master row.

### Recommended Implementation

1. **useHierarchyManagement.js:** Add `fetchNestedChildren(masterIds)` function
   - For each Master ID, call the hierarchy list endpoint via a different approach
   - If POS doesn't support cross-auth nested listing, use what we have

2. **StoreManagement.jsx:** When `isTopLevel`:
   - Show Masters in the main list
   - Expand a Master → show its Outlets nested inside the expanded row
   - Outlet filter tab shows count derived from expanded data

**Simplest approach:** Keep the list as direct children (Masters), but when Central user expands a Master row, fetch and show that Master's outlets inline. Update "Outlet (0)" tab to show actual count once outlets are loaded.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| Push fails after create | LOW | MEDIUM | Warning toast + stale status + retry |
| Nested outlet fetch slow (N+1) | MEDIUM | LOW | Fetch on expand only, not on page load |
| Auth context issue (Central can't fetch Master's children) | HIGH | MEDIUM | Use expand-on-demand with hierarchy-detail data |

---

## Frozen File Check

| File | Frozen? |
|------|:-------:|
| StoreManagement.jsx | No |
| useHierarchyManagement.js | No |

---

## Estimated Effort

| Task | Time |
|------|------|
| 2-step wizard | 30 min |
| Outlet visibility (expand-to-see) | 30 min |
| Testing | 15 min |
| **Total** | ~75 min |


---

## IMPLEMENTATION DEVIATION NOTES (Added 2026-06-14)

> These notes document differences between this planning document and the actual implementation.

1. **`useHierarchyManagement.js` was NOT modified.** The `restaurants` array was extracted from the existing `getHierarchyDetail` response inside `StoreManagement.jsx` (the health fetch useEffect). No nested fetch function was needed — the existing API call already returned all stores in the hierarchy.
2. **Only 1 file changed:** `StoreManagement.jsx`. The hook was untouched.
3. **Outlet visibility approach:** Instead of "expand-to-see" or "nested fetch per Master", the implementation merges outlets from `hierarchy-detail`'s `restaurants` array into a `displayChildren` memo — showing all stores in the flat list with ↳ indicators for nested outlets.