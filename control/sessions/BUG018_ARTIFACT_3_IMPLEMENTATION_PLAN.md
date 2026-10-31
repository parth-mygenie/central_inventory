# BUG-018 — Implementation Plan (Artifact #3)

> **Date:** 2026-06-14
> **Status:** READY — G-023 resolved, backend returns `push_summary`

---

## Context

Backend now returns `push_summary` in `GET /franchise/push-form/{childId}`:

```json
{
  "push_summary": {
    "total_source": 73,
    "total_child_matched": 31,
    "total_behind": 42,
    "breakdown": {
      "categories": { "source": 2, "child_matched": 2 },
      "foods": { "source": 2, "child_matched": 2 },
      "ingredients": { "source": 49, "child_matched": 11 },
      "sub_recipes": { "source": 5, "child_matched": 1 },
      "recipes": { "source": 2, "child_matched": 2 },
      "roles": { "source": 13, "child_matched": 13 }
    },
    "status": "synced" | "partial" | "stale"
  }
}
```

## File: `StoreManagement.jsx`

### Change 1: Push status fetch (lines 57-74)

**Current:** Manually computes `behind` by counting arrays in `source_entities` vs `child_existing`.

**Replace with:** Read `push_summary` directly from API response.

```javascript
// CURRENT (lines 63-73):
const src = data?.source_entities || {};
const existing = data?.child_existing || {};
let totalSrc = 0, totalChild = 0;
Object.values(src).forEach(items => { totalSrc += Array.isArray(items) ? items.length : 0; });
Object.values(existing).forEach(items => { totalChild += Array.isArray(items) ? items.length : 0; });
const behind = Math.max(0, totalSrc - totalChild);
map[child.id] = { behind, status: behind > 0 ? "stale" : "synced" };

// REPLACE WITH:
const summary = data?.push_summary;
if (summary) {
  map[child.id] = { behind: summary.total_behind, status: summary.status === "synced" ? "synced" : "stale" };
} else {
  // Fallback: old manual computation for backward compat
  const src = data?.source_entities || {};
  const existing = data?.child_existing || {};
  let totalSrc = 0, totalChild = 0;
  Object.values(src).forEach(items => { totalSrc += Array.isArray(items) ? items.length : 0; });
  Object.values(existing).forEach(items => { totalChild += Array.isArray(items) ? items.length : 0; });
  const behind = Math.max(0, totalSrc - totalChild);
  map[child.id] = { behind, status: behind > 0 ? "stale" : "synced" };
}
```

### Change 2: Same pattern in `handlePush` refresh (lines 190-197)

Same replacement — read `push_summary` first, fallback to manual.

### Change 3: Label text (line 412)

**Current:** `Stale — {ps.behind} behind`

**Replace with:** `{ps.behind} items not pushed` (clearer language per owner feedback)

Also for `partial` status (new): show amber instead of red.

### Change 4: ExpandedStoreDetail push button text (line 488)

**Current:** `Push Now — {pushStatus.behind} items behind`

**Replace with:** `Push Now — {pushStatus.behind} items to push`

---

## QA Plan

| # | Test | Pass Criteria |
|---|------|--------------|
| A1 | Store Management loads with accurate push counts | Uses push_summary.total_behind (not old 125 count) |
| A2 | "synced" status shows green "Synced" | push_summary.status === "synced" |
| A3 | "partial" status shows amber count | "42 items not pushed" in amber |
| A4 | Push button works and refreshes count | After push, count decreases |
| A5 | Label says "items not pushed" (not "items behind") | Clear language |

## Estimated Effort: ~10 min
