# Central Inventory Seed Shutdown Implementation Handoff

> **Date:** 24 May 2026
> **From:** Senior Central Inventory Seed Dependency Elimination Audit Agent
> **To:** Central Inventory Seed Shutdown Implementation Agent

---

## 1. Audit Report Path

`/app/memory/central_inventory/CENTRAL_INVENTORY_FULL_SEED_DEPENDENCY_AUDIT_AND_SHUTDOWN_PLAN.md`

---

## 2. Owner Decision

No seed data. No fallback. No exceptions for real flows. Remove everything.

---

## 3. Exact Seed Dependencies to Remove/Disable

### Backend (server.py) — 7 items to remove:

| # | What to Remove | Lines | Why |
|---|---|---|---|
| 1 | `import seed_data` | Line 15 | No longer needed |
| 2 | `SEED_FALLBACK_ENABLED` variable | Line 27 | No longer needed |
| 3 | Login seed fallback block | Lines 124-146 | Replaced by POS profile |
| 4 | `_get_actor_restaurant()` function | Lines 151-163 | Only used by seed endpoints |
| 5 | `proxy_hierarchy_summary()` handler | Lines 168-213 | Generic proxy handles it |
| 6 | `proxy_hierarchy_detail()` handler | Lines 216-225 | Generic proxy handles it |
| 7 | `proxy_pending_queues()` handler | Lines 228-254 | Generic proxy handles it |
| 8 | `proxy_transfer_detail()` handler | Lines 257-273 | Generic proxy handles it |
| 9 | `proxy_transfer_history()` handler | Lines 276-296 | Generic proxy handles it |

### Frontend (RequestStockForm.jsx) — 2 items to fix:

| # | What to Fix | Line | Current | Required |
|---|---|---|---|---|
| 1 | Hardcoded Central parent | Line 40 | `{ restaurant_id: 1, restaurant_name: "My Genie" }` | Dynamic from `parent_restaurant_id` in login context or hierarchy API |
| 2 | Hardcoded Master parent fallback | Line 49 | `{ restaurant_id: 781, restaurant_name: "Parent Store" }` | Dynamic from hierarchy data or fail-closed |

---

## 4. Implementation Phases

**Phase 0:** Remove 5 seed-backed endpoint handlers from server.py
**Phase 1:** Remove login seed fallback + import + helper function
**Phase 2:** Fix 2 frontend hardcoded values
**Phase 3:** QA all flows with real POS API
**Phase 4:** Owner smoke

---

## 5. Forbidden Fallback Behavior

- NO silent fallback to seed data
- NO default to restaurant_id=1
- NO default to "Central Store"
- NO hardcoded restaurant IDs or names
- Empty POS API data = show empty state (honest)
- POS API error = show error with Retry (honest)

---

## 6. Fail-Closed Rules

| Scenario | Behavior |
|---|---|
| POS API returns empty data | Show empty state |
| POS API returns error | Show error + Retry |
| Login profile fails | "Store type unavailable" (existing P1 hardening) |
| Parent store unknown | Block Request Stock submission |

---

## 7. QA Plan

| # | Check | Expected |
|---|---|---|
| 1 | Login all 4 users | Context from POS profile |
| 2 | Hierarchy Summary | Real stores from POS API |
| 3 | Hierarchy Detail | Real stock from POS API |
| 4 | Pending Queues | Real counts from POS API |
| 5 | Transfer History | 16 real transfers from POS API |
| 6 | Transfer Detail | Real data from POS API |
| 7 | Operations Hub | Real counts |
| 8 | Request Stock form | Dynamic parent (no hardcoded IDs) |
| 9 | All write operations | Still pass-through to POS API |
| 10 | No `seed_data` in import | Code verification |
| 11 | No seed fallback code | Code verification |

---

## 8. Recommended Next Agent

### `Central Inventory Seed Shutdown Implementation Agent`

---

*End of Implementation Handoff*
