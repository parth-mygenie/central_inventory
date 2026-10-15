# Central Inventory Full Seed Dependency Audit and Shutdown Plan

> **Date:** 24 May 2026
> **Agent:** Senior Central Inventory Seed Dependency Elimination Audit + Implementation Planning Agent
> **Scope:** Audit + Implementation Planning only — no code modifications

---

## 1. Audit Status

### `full_seed_dependency_map_complete_shutdown_plan_ready`

Every seed dependency in both backend and frontend is identified and mapped. All previously-blocked POS API endpoints (`hierarchy-detail`, `pending-queues`, `transfer/history`) are now confirmed **WORKING** with real data. Full seed shutdown is technically feasible.

---

## 2. Owner Decision

**No seed data from local DB, Mongo seed, or seed_data.py should be used as source of truth. Seed gate must be turned off forever for real flows.**

---

## 3. Inputs Reviewed

| # | Input | Reviewed |
|---|-------|----------|
| 1 | PRD.md | YES |
| 2 | Phase 1 Implementation Report | YES |
| 3 | POS API Context Migration Plan | YES |
| 4 | POS API Source-of-Truth Verification Report | YES |
| 5 | API Verification Report (api_evidence/) | YES |
| 6 | `/app/backend/server.py` — full code | YES |
| 7 | `/app/backend/seed_data.py` — all functions/constants | YES |
| 8 | `/app/frontend/src/services/api.js` — all API methods | YES |
| 9 | `/app/frontend/src/hooks/useLoginContext.js` | YES |
| 10 | `/app/frontend/src/components/central-inventory/RequestStockForm.jsx` | YES |
| 11 | `/app/frontend/src/components/central-inventory/DirectDispatchForm.jsx` | YES |

**Runtime POS API probes: 7 endpoints tested**

---

## 4. Executive Summary

**Phase 1 removed only login/profile seed dependency.** Five other backend endpoints still serve 100% seed data for hierarchy, pending-queues, transfer-detail, transfer-history, and hierarchy-detail. Additionally, one frontend component has hardcoded seed restaurant IDs.

**However: ALL previously-blocked POS APIs are NOW WORKING.** This was the blocker that justified keeping seed. It no longer exists. Full seed shutdown can proceed immediately.

| Category | Status |
|---|---|
| Login context | POS API (Phase 1 complete) |
| Hierarchy summary | **STILL SEED-MERGED** — but POS API now works |
| Hierarchy detail | **100% SEED** — but POS API now works |
| Pending queues | **100% SEED** — but POS API now works |
| Transfer detail | **SEED-FIRST** with POS fallback — should be flipped |
| Transfer history | **100% SEED** — but POS API now returns 16 real transfers |
| Write operations | POS API pass-through (correct) |
| Frontend hardcoded IDs | 2 instances in RequestStockForm.jsx |

---

## 5. Current Architecture After Phase 1

| Flow | Source After Phase 1 | Seed Used? |
|---|---|---|
| Login → token | POS API | NO |
| Login → restaurant context | POS API profile | NO (seed gated behind disabled flag) |
| Hierarchy Summary | SEED + POS merge | **YES** |
| Hierarchy Detail | 100% SEED | **YES** |
| Pending Queues | 100% SEED | **YES** |
| Transfer Detail | SEED-first, POS fallback | **YES** |
| Transfer History | 100% SEED | **YES** |
| Write ops (dispatch, approve, etc.) | POS API pass-through | NO |
| Source Options, Inventory Master | POS API pass-through | NO |
| Franchise List/History | POS API pass-through | NO |
| Stock Adjustment/Wastage | POS API pass-through | NO |

---

## 6. Complete Seed Dependency Map

### Backend Dependencies (8 total)

| ID | File | Line(s) | Function/Endpoint | Seed Function Used | Real API Replacement | Status |
|---|---|---|---|---|---|---|
| SD-01 | server.py | 15 | Module import | `import seed_data` | Remove after all deps removed | Active |
| SD-02 | server.py | 125-146 | Login seed fallback | `EMAIL_RESTAURANT_MAP`, `RESTAURANTS` | Already replaced by POS profile; gated behind `SEED_FALLBACK_ENABLED=false` | **Gated (disabled)** |
| SD-03 | server.py | 189 | hierarchy-summary | `seed_data.get_hierarchy_summary()` | `POST /api/v2/.../hierarchy-summary` — **NOW WORKING** (returns real stores) | **Active — must remove** |
| SD-04 | server.py | 224 | hierarchy-detail | `seed_data.get_hierarchy_detail()` | `POST /api/v2/.../hierarchy-detail` — **NOW WORKING** (returns real stock data) | **Active — must remove** |
| SD-05 | server.py | 231 | pending-queues | `seed_data.get_pending_queues()` | `POST /api/v2/.../pending-queues` — **NOW WORKING** (returns real queue data) | **Active — must remove** |
| SD-06 | server.py | 259 | transfer-detail (seed first) | `seed_data.get_transfer_detail()` | `GET /api/v2/.../details/{id}` — already exists as fallback | **Active — must flip to POS-first** |
| SD-07 | server.py | 279 | transfer-history | `seed_data.get_transfer_history()` | `POST /api/v2/.../history` — **NOW WORKING** (returns 16 real transfers) | **Active — must remove** |
| SD-08 | server.py | 155-156, 162-163 | `_get_actor_restaurant` fallback | Returns `1` when token not found | Should return error or derive from POS | **Active — hardcoded default** |

### Frontend Dependencies (2 total)

| ID | File | Line(s) | Component | Hardcoded Value | Required Fix |
|---|---|---|---|---|---|
| FD-01 | RequestStockForm.jsx | 40 | Request Stock form | `{ restaurant_id: 1, restaurant_name: "My Genie", restaurant_type: "master" }` | Replace with dynamic parent from `useLoginContext` or hierarchy API |
| FD-02 | RequestStockForm.jsx | 49 | Request Stock form | `{ restaurant_id: 781, restaurant_name: "Parent Store", restaurant_type: "central" }` | Replace with dynamic parent resolution |

### seed_data.py Data Structures Still Referenced

| Constant | Used By | Real API Replacement |
|---|---|---|
| `RESTAURANTS` | SD-02 (gated) | POS profile `restaurants[0]` |
| `EMAIL_RESTAURANT_MAP` | SD-02 (gated) | POS profile |
| `INVENTORY_ITEMS` | SD-04 via `get_hierarchy_detail` | POS `get-inventory-master` API |
| `TRANSFERS` | SD-05, SD-06, SD-07 | POS transfer endpoints |
| `TRANSFER_MAP` | SD-06 | POS transfer detail endpoint |

---

## 7. Source Classification Matrix

| # | Flow / Screen / Endpoint | Current Source | Seed Used? | Real API Available? | Required Future Source | Action Required | Blocker Level |
|---|---|---|---|---|---|---|---|
| 1 | Login/auth token | POS API | NO | YES | POS API | None | Done |
| 2 | Profile/restaurant context | POS API profile | NO (gated) | YES | POS API profile | Remove seed fallback code | P0 remove before smoke |
| 3 | Restaurant/store type | POS API profile | NO (gated) | YES | POS API profile | Done | Done |
| 4 | Hierarchy Summary list | **SEED merge** | **YES** | **YES (4 stores)** | POS API direct | **Remove seed merge** | P0 remove before smoke |
| 5 | Context Selector (store picker) | SEED via hierarchy-detail | **YES** | **YES** | POS API hierarchy-detail | **Remove seed** | P0 remove before smoke |
| 6 | Operations Hub counts | SEED via pending-queues | **YES** | **YES (0 pending)** | POS API pending-queues | **Remove seed** | P0 remove before smoke |
| 7 | Store Detail stock | SEED via hierarchy-detail | **YES** | **YES (4 items)** | POS API hierarchy-detail | **Remove seed** | P0 remove before smoke |
| 8 | Pending Approvals | SEED via pending-queues | **YES** | **YES** | POS API pending-queues | **Remove seed** | P0 remove before smoke |
| 9 | Ready to Dispatch | SEED via history | **YES** | **YES** | POS API history | **Remove seed** | P0 remove before smoke |
| 10 | Pending Receives | SEED via pending-queues | **YES** | **YES** | POS API pending-queues | **Remove seed** | P0 remove before smoke |
| 11 | Transfer Detail | SEED-first | **YES** | YES (fallback exists) | POS API direct | **Flip to POS-first** | P0 remove before smoke |
| 12 | Create Transfer (Dispatch) | POS API pass-through | NO | YES | POS API | None | Done |
| 13 | Approve Transfer | POS API pass-through | NO | YES | POS API | None | Done |
| 14 | Dispatch Transfer | POS API pass-through | NO | YES | POS API | None | Done |
| 15 | Receive Transfer | POS API pass-through | NO | YES | POS API | None | Done |
| 16 | Transfer History | **100% SEED** | **YES** | **YES (16 transfers)** | POS API direct | **Remove seed** | P0 remove before smoke |
| 17 | Stock Ledger | Frontend-derived from history | YES (via history) | YES | POS API history | Fix when history fixed | P0 |
| 18 | Stock Adjustment form | POS API pass-through | NO | YES | POS API | None | Done |
| 19 | Wastage Entry form | POS API pass-through | NO | YES | POS API | None | Done |
| 20 | Wastage Report | POS API pass-through | NO | YES | POS API | None | Done |
| 21 | Role/permission guard | Frontend config (from login) | NO | N/A | Frontend config | None | Done |
| 22 | Screen visibility | Frontend config | NO | N/A | Frontend config | None | Done |
| 23 | Source/dest store selector | POS API (franchise/list) | NO | YES | POS API | None | Done |
| 24 | RequestStockForm parent | **Hardcoded IDs** | **YES** | YES (via hierarchy) | Dynamic from API | **Fix hardcoded** | P0 frontend fix |
| 25 | localStorage/session | Frontend (from login) | NO | N/A | N/A | None | Done |

---

## 8. Real API Replacement Map

| Seed-backed Flow | Required Replacement API | Exists Today? | Evidence | Action |
|---|---|---|---|---|
| `get_hierarchy_summary()` | `POST /v2/.../hierarchy-summary` | **YES** | Returns 2 stores (central filter) or 4 stores (franchise filter) | Make POS API sole source — remove seed merge |
| `get_hierarchy_detail()` | `POST /v2/.../hierarchy-detail` | **YES** | Returns restaurants, child_stock_summary (4 items), batches | Pure POS API pass-through |
| `get_pending_queues()` | `POST /v2/.../pending-queues` | **YES** | Returns approval_pending, receive_pending, my_requests | Pure POS API pass-through |
| `get_transfer_detail()` | `GET /v2/.../details/{id}` | **YES** | Returns 404 for non-existent; works for real transfers | POS API primary, remove seed-first logic |
| `get_transfer_history()` | `POST /v2/.../history` | **YES** | Returns 16 real transfer records | Pure POS API pass-through |
| RequestStockForm hardcoded parent | `useLoginContext` parent_restaurant_id + hierarchy API | **YES** | parent_restaurant_id available from POS profile | Dynamic resolution |

**ALL replacement APIs confirmed working. Zero missing APIs.**

---

## 9. Seed Shutdown Strategy

### Recommended: Strategy A — Remove all seed code from real endpoints immediately

**Rationale:**
- ALL POS APIs are confirmed working (hierarchy-summary, hierarchy-detail, pending-queues, transfer-history)
- Phase 1 already showed POS profile works for login context
- The generic V2 pass-through proxy (line 300) already handles all these endpoints correctly when no dedicated handler intercepts them
- Removing the 5 dedicated seed-backed handlers will cause all requests to fall through to the generic pass-through, which forwards directly to the real POS API
- This is the simplest, cleanest, and safest approach

**Key insight:** The generic proxy `@api_router.api_route("/proxy/v2/{path:path}")` at line 300 already handles ALL V2 endpoints as a pass-through. The 5 dedicated seed-backed handlers (hierarchy-summary, hierarchy-detail, pending-queues, transfer-detail, transfer-history) **intercept** requests that would otherwise go to the real POS API. Removing these handlers causes the correct pass-through behavior automatically.

---

## 10. Implementation Phases

### Phase 0 — Remove dedicated seed-backed endpoint handlers (BACKEND)

**What:** Remove/disable 5 dedicated endpoint handlers from `server.py`:
1. `proxy_hierarchy_summary` (lines 168-213) — remove; generic proxy handles it
2. `proxy_hierarchy_detail` (lines 216-225) — remove; generic proxy handles it
3. `proxy_pending_queues` (lines 228-254) — remove; generic proxy handles it
4. `proxy_transfer_detail` (lines 257-273) — remove; generic proxy handles it
5. `proxy_transfer_history` (lines 276-296) — remove; generic proxy handles it

**Result:** All 5 endpoints now handled by generic pass-through to POS API. Zero seed data involved.

### Phase 1 — Remove login seed fallback code (BACKEND)

**What:** Remove the `SEED_FALLBACK_ENABLED` block and `import seed_data` from `server.py`:
1. Remove lines 124-146 (seed fallback in login)
2. Remove line 15 (`import seed_data`)
3. Remove line 27 (`SEED_FALLBACK_ENABLED`)
4. Remove `_get_actor_restaurant` function (no longer needed — no seed endpoints use it)

### Phase 2 — Fix frontend hardcoded values (FRONTEND)

**What:** Fix 2 hardcoded seed references in `RequestStockForm.jsx`:
1. Line 40: Replace `{ restaurant_id: 1, restaurant_name: "My Genie" }` with dynamic parent from `useLoginContext` or POS profile's `parent_restaurant_id`
2. Line 49: Replace `{ restaurant_id: 781, restaurant_name: "Parent Store" }` with dynamic resolution or fail-closed

### Phase 3 — QA zero-seed verification

Verify all screens work with real POS API data:
- Hierarchy Summary shows real stores
- Hierarchy Detail shows real stock
- Pending Queues shows real queue counts
- Transfer History shows real transfers (16 items)
- Transfer Detail loads real transfer data
- All write operations still work
- All role/permission guards still correct

### Phase 4 — Owner smoke after zero-seed confirmation

Run full owner smoke checklist with confidence that no seed data is involved.

---

## 11. Fail-Closed Rules

| Screen/Flow | If POS API Returns Empty | If POS API Returns Error |
|---|---|---|
| Hierarchy Summary | Show "No stores found" empty state | Show error with Retry button |
| Hierarchy Detail | Show "No stock data" empty state | Show error with Retry button |
| Pending Queues | Show 0 counts (correct if nothing pending) | Show error with Retry button |
| Transfer Detail | Show "Transfer not found" | Show error state |
| Transfer History | Show "No transfers" empty state | Show error with Retry button |
| Login context | Frontend fail-closed (P1 hardening) | "Store type unavailable" warning |
| Request Stock parent | Show "Unable to determine parent store" | Block submission |

**NEVER show fake/seed data. Empty real data is honest. Fake seed data is misleading.**

---

## 12. Blocking Assessment

| Item | Status | Reason |
|---|---|---|
| Context migration QA | **not_blocking_if_fail_closed** | Phase 1 login context works with POS API |
| Slice 5 owner smoke | **blocks_owner_smoke** | Owner explicitly said "no seed data" — 5 endpoints still use seed |
| Slice 5 closure | **blocks_closure** | Cannot close with seed as data source |
| Slice 6 planning | **not blocking** | Independent |
| Production readiness | **blocks_production_only** | All seed must be removed before production |

---

## 13. Open Questions

| # | Question | Why Needed | Blocking Level | Recommended Answer |
|---|---|---|---|---|
| Q1 | Should `seed_data.py` file be deleted or kept but unused? | Cleanup decision | Non-blocking | Keep file but remove `import` — can be deleted later |
| Q2 | Should `_get_actor_restaurant` be kept for any future use? | It's only used by seed endpoints | Non-blocking | Remove — no longer needed once seed endpoints are removed |
| Q3 | How to resolve RequestStockForm parent store dynamically? | Hardcoded IDs must go | P0 for frontend | Use `parent_restaurant_id` from login context + hierarchy API lookup |

---

## 14. Recommended Next Agent

### `Central Inventory Seed Shutdown Implementation Agent`

Scope:
1. Remove 5 dedicated seed-backed endpoint handlers from server.py
2. Remove login seed fallback code
3. Remove `import seed_data` and `SEED_FALLBACK_ENABLED`
4. Remove `_get_actor_restaurant` helper
5. Fix 2 hardcoded frontend values in RequestStockForm.jsx
6. Verify all flows use real POS API data
7. Run QA

---

## 15. Final Verdict

### `seed_shutdown_ready_for_implementation`

All previously-blocked POS APIs are now working. The generic V2 pass-through proxy already handles all endpoint paths correctly. Removing the 5 dedicated seed-backed handlers is the simplest path to full seed elimination. Zero API contract changes needed. Implementation is straightforward: remove intercepting handlers → requests fall through to real POS API pass-through.

---

*End of Seed Dependency Audit and Shutdown Plan*
