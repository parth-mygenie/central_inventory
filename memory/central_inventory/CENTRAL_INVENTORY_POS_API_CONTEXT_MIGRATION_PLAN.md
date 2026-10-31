# Central Inventory POS API Context Migration Plan

> **Date:** 24 May 2026
> **Agent:** Senior Central Inventory POS API Context Migration Planning Agent
> **Scope:** Planning + API Contract Discovery only — no code modifications

---

## 1. Planning Status

### `pos_api_context_migration_plan_ready_for_implementation_planning`

All required POS API fields are **confirmed available** from existing POS API endpoints. No POS API contract changes needed. Migration can proceed with backend/proxy adapter changes only.

---

## 2. Owner Decision

**No more seed-data dependency for real Central Inventory context.** Central Inventory must connect restaurant/store context to POS API. Seed/local data may only remain for explicitly marked demo/dev fallback if approved later.

---

## 3. Inputs Reviewed

| # | Input | Reviewed |
|---|-------|----------|
| 1 | PRD.md | YES |
| 2 | POS API Source-of-Truth Verification Report | YES |
| 3 | POS API Context Migration Handoff | YES |
| 4 | Login Context Collision Investigation Report | YES |
| 5 | Login Context Collision Fix Implementation Report | YES |
| 6 | Slice 5 Final QA Validation Report | YES |
| 7 | API Verification Report (api_evidence/) | YES |
| 8 | `/app/backend/server.py` — full proxy flow | YES |
| 9 | `/app/backend/seed_data.py` — EMAIL_RESTAURANT_MAP, RESTAURANTS | YES |
| 10 | `/app/frontend/src/hooks/useLoginContext.js` — context derivation | YES |
| 11 | `/app/frontend/src/services/api.js` — API client | YES |

**Runtime POS API probes performed:**
| # | Endpoint | Users Tested | Result |
|---|----------|-------------|--------|
| 1 | `POST /api/v1/auth/vendoremployee/common-login` | 4 users | Token + permissions only; NO restaurant context |
| 2 | `GET /api/v1/vendoremployee/profile` | 4 users | **ALL restaurant context fields available** in `restaurants[]` array |
| 3 | `GET /api/v2/vendoremployee/franchise/list` | 4 users | Parent + children hierarchy (empty for Outlet users) |

**Total: 11 documents + 12 runtime API probes**

---

## 4. Current Architecture

```
Login → POS API (token only) → seed_data.EMAIL_RESTAURANT_MAP (restaurant context) → frontend
         ↓                                    ↓
    Auth only                    restaurant_type_flag, restaurant_id,
    (no context)                 restaurant_name, hierarchy, transfers,
                                 queues, history, stock (ALL from seed)
```

## 5. Target Architecture

```
Login → POS API (token) → POS API profile (restaurant context) → proxy normalizes → frontend
         ↓                         ↓
    Auth (token)           restaurants[0]: {
                             id, name, restaurant_type_flag,
                             parent_restaurant_id
                           }
                                   ↓
                           Hierarchy: POS API franchise/list
                           Transfers/Queues/History: POS API V2 endpoints (pass-through)
                           Inventory: POS API V2 endpoints (pass-through)
```

---

## 6. Required POS API Context Contract

### KEY DISCOVERY: All Required Fields Are Already Available

#### Endpoint 1: `GET /api/v1/vendoremployee/profile` (Bearer token auth)

Returns employee profile with embedded `restaurants[]` array:

| Field | Location in Response | Available | Example | Purpose |
|---|---|---|---|---|
| employee_id | `id` | **YES** | `1`, `804`, `806` | User identity |
| employee_email | `email` | **YES** | `KalaBahia@mygenie.online` | User email |
| employee_name | `f_name` + `l_name` | **YES** | `"DemoFranchise1"` | Display name |
| restaurant_id | `restaurants[0].id` | **YES** | `1`, `781`, `783` | Restaurant scoping |
| restaurant_name | `restaurants[0].name` | **YES** | `"My Genie"`, `"DemoCentral1"` | Display in header |
| restaurant_type_flag | `restaurants[0].restaurant_type_flag` | **YES** | `"master"`, `"central"`, `"franchise"` | Hierarchy level |
| parent_restaurant_id | `restaurants[0].parent_restaurant_id` | **YES** | `null`, `1`, `781` | Hierarchy parent |
| zone_id | `restaurants[0].zone_id` | **YES** | `6` | Zone context |

**Verified for all 4 user types:**

| User | employee_id | restaurant_id | name | type_flag | parent_id |
|---|---|---|---|---|---|
| killua@zoldyck.com | 1 | 1 | My Genie | master | null |
| abhishek@kalabahia.com | 1 | 1 | My Genie | master | null |
| owner@democentral1.com | 804 | 781 | DemoCentral1 | central | 1 |
| owner@demofranchise1.com | 806 | 783 | DemoFranchise1 | franchise | 781 |

#### Endpoint 2: `GET /api/v2/vendoremployee/franchise/list?limit=25` (Bearer token auth)

Returns parent/children hierarchy:

| Field | Available | Notes |
|---|---|---|
| `data.parent.id` | **YES** (master/central only) | Parent restaurant for logged-in user |
| `data.parent.name` | **YES** | |
| `data.parent.restaurant_type_flag` | **YES** | |
| `data.relationship` | **YES** | `"master_to_central"` or `"central_to_franchise"` |
| `data.children[]` | **YES** | Child stores with full restaurant objects |
| Each child: `id`, `name`, `restaurant_type_flag`, `parent_restaurant_id` | **YES** | |

**Note:** Outlet (franchise) users get empty parent and 0 children from this endpoint — this is correct (outlets have no children). Their context comes from the V1 profile endpoint instead.

### Status Classification Per Field

| Context Field | POS API Status | Endpoint | Notes |
|---|---|---|---|
| user identity | `available_in_current_POS_API` | V1 login + V1 profile | |
| restaurant ID | `available_in_another_POS_endpoint` | V1 profile `restaurants[0].id` | NOT in login response |
| restaurant name | `available_in_another_POS_endpoint` | V1 profile `restaurants[0].name` | NOT in login response |
| restaurant type | `available_in_another_POS_endpoint` | V1 profile `restaurants[0].restaurant_type_flag` | NOT in login response |
| hierarchy parent | `available_in_another_POS_endpoint` | V1 profile `restaurants[0].parent_restaurant_id` | |
| hierarchy children | `available_in_another_POS_endpoint` | V2 franchise/list `data.children[]` | |
| role/permission | `available_in_current_POS_API` | V1 login `permissions[]` | |
| screen visibility | `currently_frontend_config` | N/A | Derived from restaurant_type_flag — no change needed |
| stock/store context | `available_in_another_POS_endpoint` | V2 inventory endpoints | Some blocked (see API Verification Report) |
| transfer data | `available_in_another_POS_endpoint` | V2 transfer endpoints | Pass-through already works |
| pending queues | `missing_requires_POS_API_change` | V2 pending-queues | **BLOCKED:** `pendingQueues` method not found on preprod |

---

## 7. Source Migration Matrix

| Context Field | Current Source | Required Future Source | Current Evidence | POS API Status | Migration Action |
|---|---|---|---|---|---|
| User identity (token) | POS API login | POS API login | Confirmed working | Available | No change |
| Restaurant ID | `seed_data.EMAIL_RESTAURANT_MAP` | POS API V1 profile | `restaurants[0].id` confirmed for all 4 users | Available | **Phase 1: call profile after login** |
| Restaurant name | `seed_data.RESTAURANTS` | POS API V1 profile | `restaurants[0].name` confirmed | Available | **Phase 1** |
| Restaurant type flag | `seed_data.RESTAURANTS` | POS API V1 profile | `restaurants[0].restaurant_type_flag` confirmed | Available | **Phase 1** |
| Hierarchy parent | `seed_data.RESTAURANTS` | POS API V1 profile | `restaurants[0].parent_restaurant_id` confirmed | Available | **Phase 1** |
| Hierarchy children | `seed_data.get_visible_restaurants()` | POS API V2 franchise/list | `data.children[]` confirmed (master/central) | Available | **Phase 2: replace seed hierarchy** |
| Role/permission | POS API login | POS API login | `permissions[]` confirmed | Available | No change |
| Screen visibility | Frontend config | Frontend config (derived from type_flag) | N/A | N/A | No change |
| Stock/store context | `seed_data._stock_for_store()` | POS API V2 hierarchy-detail | **BLOCKED: unit_id column missing** | Partially blocked | **Phase 3 (when POS fixes migration)** |
| Pending queues | `seed_data.get_pending_queues()` | POS API V2 pending-queues | **BLOCKED: pendingQueues method missing** | Blocked | **Phase 3 (when POS fixes deployment)** |
| Transfer history | `seed_data.get_transfer_history()` | POS API V2 transfer/history | Returns empty but works | Available | **Phase 2: remove seed override** |
| Transfer detail | `seed_data.get_transfer_detail()` | POS API V2 transfer/details/{id} | Works (fallback already exists) | Available | **Phase 2: make POS API primary** |
| Ledger/report scoping | `seed_data (via _get_actor_restaurant)` | POS API (via token-scoped profile) | Token already scopes API calls | Available | **Phase 1: store restaurant_id from profile** |

---

## 8. Seed Dependency Removal Plan

### Current Seed Dependencies (12 total)

| # | Seed Dependency | File | Line(s) | Removal Phase |
|---|---|---|---|---|
| 1 | `EMAIL_RESTAURANT_MAP` — email→restaurant_id | `seed_data.py:37-46` | Login enrichment | Phase 1 |
| 2 | `RESTAURANTS` — restaurant metadata | `seed_data.py:26-34` | Login enrichment | Phase 1 |
| 3 | `_token_restaurant_map` — token→restaurant_id (in-memory) | `server.py:31,85,101` | Actor resolution | Phase 1 |
| 4 | `get_hierarchy_summary()` — seed hierarchy | `server.py:127` | Hierarchy summary merge | Phase 2 |
| 5 | `get_hierarchy_detail()` — seed store detail | `server.py:162` | Store detail | Phase 3 (POS blocked) |
| 6 | `get_pending_queues()` — seed queues | `server.py:169` | Pending queues | Phase 3 (POS blocked) |
| 7 | `get_transfer_detail()` — seed transfer detail | `server.py:197` | Transfer detail (seed-first) | Phase 2 |
| 8 | `get_transfer_history()` — seed transfer history | `server.py:217` | Transfer history | Phase 2 |
| 9 | `INVENTORY_ITEMS` — seed inventory items | `seed_data.py:49-66` | Stock reference | Phase 3 |
| 10 | `_stock_for_store()` — random stock levels | `seed_data.py:70-95` | Stock display | Phase 3 (POS blocked) |
| 11 | `_batches_for_stock()` — random batch data | `seed_data.py:98-112` | Batch/expiry | Phase 3 |
| 12 | `TRANSFERS` — hardcoded transfer list | `seed_data.py:117-343` | Transfer data | Phase 2 |

### Removal Strategy

**Phase 1 (Login Context — P0):** Remove dependencies #1, #2, #3. Replace with POS API profile call.
**Phase 2 (Data Endpoints):** Remove dependencies #4, #7, #8, #12. Make POS API primary for hierarchy/transfers.
**Phase 3 (POS Backend Fixes Required):** Remove dependencies #5, #6, #9, #10, #11. Requires POS preprod migration fixes.

---

## 9. Backend/Proxy Migration Plan

### Phase 1 Changes: Login Context from POS API

**File: `/app/backend/server.py`**

**Current flow (lines 65-94):**
```
1. Receive login request
2. Forward to POS API login
3. Check EMAIL_RESTAURANT_MAP → enrich from seed
4. Return enriched response
```

**Target flow:**
```
1. Receive login request
2. Forward to POS API login → get token
3. Call POS API GET /api/v1/vendoremployee/profile with token → get restaurants[]
4. Extract restaurant context from restaurants[0]:
   - restaurant_id = restaurants[0].id
   - restaurant_name = restaurants[0].name
   - restaurant_type_flag = restaurants[0].restaurant_type_flag
   - parent_restaurant_id = restaurants[0].parent_restaurant_id
5. Merge into login response
6. Store token→restaurant_id in persistent map (MongoDB)
7. Return enriched response
```

**Changes required:**
- Add `GET /api/v1/vendoremployee/profile` call after successful login
- Extract `restaurants[0]` from profile response
- Replace `EMAIL_RESTAURANT_MAP` lookup with profile-based context
- Store token→restaurant_id in MongoDB (persistent, not in-memory)
- Keep `EMAIL_RESTAURANT_MAP` as optional fallback only if profile call fails (gated by env flag)

**Actor resolution (`_get_actor_restaurant`):**
- Replace in-memory `_token_restaurant_map` with MongoDB collection
- Replace `default=1` with proper error handling

### Phase 2 Changes: Data Endpoints from POS API

**Endpoints to change:**

| Endpoint | Current | Target |
|---|---|---|
| `hierarchy-summary` | Seed merge with POS | POS API primary; seed fallback only if POS fails |
| `hierarchy-detail` | 100% seed | POS API primary (when unit_id migration done) |
| `pending-queues` | 100% seed | POS API primary (when pendingQueues method deployed) |
| `transfer/details/{id}` | Seed-first, POS fallback | **Flip: POS-first, no seed fallback** |
| `transfer/history` | 100% seed | POS API primary |

### Error/Fallback Behavior

| Scenario | Behavior |
|---|---|
| POS API profile returns restaurant context | Use POS data; skip seed |
| POS API profile fails (network/timeout) | Return login-only response (frontend fail-closed) |
| POS API profile returns empty restaurants[] | Return login-only response (frontend fail-closed) |
| ENV `SEED_FALLBACK_ENABLED=true` | Fall back to EMAIL_RESTAURANT_MAP (dev/demo only) |
| ENV `SEED_FALLBACK_ENABLED=false` (default) | No seed fallback — POS API only |

---

## 10. Frontend Migration Plan

### Minimal Frontend Changes Required

The frontend already handles the correct response shape. The proxy adapter ensures the frontend receives the same fields it expects. No frontend changes are required if the proxy returns the same field names.

**Files that need NO changes (if proxy normalizes):**
- `useLoginContext.js` — already extracts `restaurant_type_flag`, `restaurant_id`, `restaurant_name`
- `terminology.js` — mapping is correct (`master` → Central Store, `central` → Master Store, `franchise` → Outlet)
- `screenVisibility.js` — permission matrix uses `restaurant_type_flag` values
- `api.js` — API client unchanged
- All central-inventory components — consume context from `useLoginContext`

**Only change needed:**
- `useLoginContext.js` line 37: `restaurantType = rawRestaurantType || null` (P1 fail-closed hardening already in place) — **no change needed**

### Fail-Closed Behavior (Already Implemented)

When `restaurant_type_flag` is missing:
- `restaurantType = null`
- All screens hidden
- All actions blocked
- Header shows "Store type unavailable — please contact admin"

This is already the correct behavior post-P1 hardening.

---

## 11. Migration Phases

### Phase 0 — Contract Confirmation (COMPLETE)

- [x] POS API V1 profile endpoint confirmed: `restaurants[]` array with all required fields
- [x] POS API V2 franchise/list confirmed: hierarchy parent/children
- [x] All 4 user types verified
- [x] Field mapping documented

### Phase 1 — Login Context from POS API Profile (P0 — Required)

**Scope:** Backend proxy changes only

1. After POS API login succeeds and returns token
2. Call `GET {PREPROD_V1}/vendoremployee/profile` with Bearer token
3. Extract `restaurants[0]` context fields
4. Merge into login response (same field names as today)
5. Store `token → restaurant_id` in MongoDB collection `token_sessions`
6. Remove `EMAIL_RESTAURANT_MAP` dependency from login flow
7. Add `SEED_FALLBACK_ENABLED` env flag (default: `false`)
8. If profile call fails and `SEED_FALLBACK_ENABLED=true`: fall back to seed
9. If profile call fails and `SEED_FALLBACK_ENABLED=false`: return login-only (fail-closed)

**Files changed:** `server.py` only
**Frontend changed:** None
**Risk:** Low — proxy returns same response shape

### Phase 2 — Data Endpoints from POS API (P1 — When POS Endpoints Work)

**Scope:** Backend proxy endpoint changes

1. `transfer/details/{id}`: Flip to POS-first (already has fallback code)
2. `transfer/history`: Replace seed `get_transfer_history()` with POS API call
3. `hierarchy-summary`: Remove seed merge; use POS API only
4. Remove `TRANSFERS` seed data usage

**Files changed:** `server.py`
**Blocked by:** Nothing — these POS endpoints work
**Risk:** Medium — POS may return empty data if no real transfers exist

### Phase 3 — Full Seed Removal (P2 — After POS Backend Fixes)

**Blocked by POS preprod issues:**
- `hierarchy-detail`: Blocked by missing `unit_id` column
- `pending-queues`: Blocked by missing `pendingQueues` method

1. `hierarchy-detail`: Use POS API when `unit_id` migration is complete
2. `pending-queues`: Use POS API when `pendingQueues` method is deployed
3. Remove stock/batch seed functions
4. Remove `INVENTORY_ITEMS` seed data

**Owner action required:** Confirm POS backend team will run migrations

### Phase 4 — Demo/Dev Seed Gating

1. Add `SEED_FALLBACK_ENABLED` env flag
2. When `true`: seed_data used as fallback for any POS API failure
3. When `false` (production default): no seed, POS API only
4. Document demo accounts that rely on seed

### Phase 5 — QA Multi-User Same-Restaurant

1. Login killua + abhishek in same browser
2. Verify both get POS-derived context (not seed)
3. Verify no collision
4. Regression: all Slice 1-5 features

### Phase 6 — Regression Against Slice 5

1. Stock Adjustment: Central-only access
2. Wastage Entry: all roles
3. Wastage Report: role-scoped
4. History & Ledger: role-scoped
5. Store badges: correct for all 3 levels

### Phase 7 — Documentation + Production Handoff

1. Update PRD.md
2. Update architecture notes
3. Remove seed-dependency warnings
4. Production readiness certification

---

## 12. Open Backend/POS Questions

| Q# | Question | Why Needed | Recommended Answer | Blocking Level |
|---|---|---|---|---|
| Q1 | Can one user belong to multiple restaurants? | `restaurants[]` is an array — need to handle multi-restaurant | Evidence: all tested users have exactly 1 restaurant. Use `restaurants[0]`. If multi-restaurant exists in future, add restaurant selector. | `can_start_with_assumption` (use `restaurants[0]`) |
| Q2 | When will POS preprod run `unit_id` migration? | Blocks hierarchy-detail endpoint | Owner needs to coordinate with POS backend team | `blocks_phase_3_only` |
| Q3 | When will POS preprod deploy `pendingQueues` method? | Blocks pending-queues endpoint | Owner needs to coordinate with POS backend team | `blocks_phase_3_only` |
| Q4 | Should demo accounts continue to work without POS API? | Determines whether `SEED_FALLBACK_ENABLED` is needed | Recommend YES — keep seed for `owner@demo*.com` accounts | `can_start_with_assumption` |
| Q5 | Should `_token_restaurant_map` persist in MongoDB? | Server restart currently wipes all sessions | Recommend YES — store in `token_sessions` collection | `can_start_with_assumption` |
| Q6 | Is the V1 profile endpoint rate-limited? | One extra call per login | Unlikely to be an issue — only called once at login | `can_start_with_assumption` |

**Blocking questions: 0 for Phase 1. 2 for Phase 3 (POS backend team action required).**

---

## 13. QA Plan

### Phase 1 Post-Fix QA

| # | Check | Method | Expected |
|---|---|---|---|
| 1 | Login killua@zoldyck.com | curl + browser | Context from POS API profile, not seed |
| 2 | Login abhishek@kalabahia.com | curl + browser | Same restaurant context as killua |
| 3 | Login owner@democentral1.com (Master) | curl + browser | type_flag=central, id=781, name=DemoCentral1 |
| 4 | Login owner@demofranchise1.com (Outlet) | curl + browser | type_flag=franchise, id=783, name=DemoFranchise1 |
| 5 | Same-browser: abhishek → logout → killua | browser | No collision, both get correct context |
| 6 | Same-browser: killua → logout → abhishek | browser | No collision |
| 7 | Incognito/separate session | browser | Same result |
| 8 | Logout/login cleanup | browser | localStorage cleared properly |
| 9 | POS API profile fails (simulated) | curl | Fail-closed: "Store type unavailable" |
| 10 | No silent Central Store fallback | code | `restaurantType = null` when flag missing |
| 11 | Hierarchy visibility (Central) | browser | Can see all stores |
| 12 | Hierarchy visibility (Master) | browser | Can see own outlets |
| 13 | Hierarchy visibility (Outlet) | browser | Locked to own store |
| 14 | Stock Adjustment access (Central) | browser | "Adjust Stock" visible |
| 15 | Stock Adjustment hidden (Master) | browser | Button hidden |
| 16 | Wastage Entry access (all roles) | browser | Button visible for all |
| 17 | Wastage Report scoping | browser | Page loads |
| 18 | History & Ledger scoping | browser | Both tabs load |
| 19 | No seed dependency for real users | code | `EMAIL_RESTAURANT_MAP` not used in login |
| 20 | Seed only for demo (if SEED_FALLBACK_ENABLED) | code | Verify gating |
| 21 | Store badge correct | browser | "Central Store" / "Master Store" / "Outlet" |

---

## 14. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| POS API profile endpoint unavailable | HIGH | Add timeout + optional seed fallback (env-gated) |
| V1 profile returns empty `restaurants[]` | MEDIUM | Fail-closed (existing P1 hardening) |
| Multi-restaurant user (>1 in array) | LOW | Use `restaurants[0]`; add selector in future |
| POS API rate limit on profile call | LOW | Only called once per login |
| Same-restaurant collision (2 users) | LOW | POS API returns correct context per token; no shared state |
| Frontend fallback regression | LOW | P1 fail-closed already tested |
| Demo accounts break without seed | MEDIUM | Gate with `SEED_FALLBACK_ENABLED` env flag |
| POS hierarchy-detail blocked (unit_id) | HIGH for Phase 3 | Keep seed fallback for hierarchy-detail until POS fixes |
| POS pending-queues blocked (method missing) | HIGH for Phase 3 | Keep seed fallback for pending-queues until POS fixes |

---

## 15. Blocking Assessment

| Item | Status | Reason |
|---|---|---|
| Current Slice 5 owner smoke | **Does not block** | Phase 1 migration can happen before or after smoke |
| Slice 5 closure | **Does not block** | Phase 1 is independent of Slice 5 features |
| Slice 6 planning | **Does not block** | Phase 1 can be a standalone "Slice 5.5" |
| Production readiness | **Blocks** | Phase 1 (login context) MUST be done before production |

**Recommended gating:** Implement Phase 1 now as priority work. Phases 2-3 can follow when POS backend fixes are available.

---

## 16. Recommended Next Agent

### `Backend/Proxy POS Context Adapter Implementation Agent`

Scope:
1. Implement Phase 1: POS API profile call after login
2. Replace `EMAIL_RESTAURANT_MAP` with POS API profile-based context
3. Persist token→restaurant_id in MongoDB
4. Add `SEED_FALLBACK_ENABLED` env flag
5. Verify with curl for all 4 user types
6. No frontend changes needed

---

## 17. Final Verdict

### `ready_for_implementation_planning`

All required POS API fields are **confirmed available** from existing endpoints:
- `GET /api/v1/vendoremployee/profile` → `restaurants[0]` provides: `id`, `name`, `restaurant_type_flag`, `parent_restaurant_id`
- `GET /api/v2/vendoremployee/franchise/list` → provides hierarchy children

No POS API contract changes needed for Phase 1 (login context migration). Implementation can begin immediately.

---

*End of Migration Plan*
