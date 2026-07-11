# Central Inventory POS API Source-of-Truth Verification Report

> **Date:** 24 May 2026
> **Agent:** Senior Central Inventory POS API Source-of-Truth Verification Agent
> **Scope:** Investigation + Architecture Verification only — no code modifications

---

## 1. Verification Status

### `local_seed_dependency_confirmed`

The POS API (`preprod.mygenie.online`) is used ONLY for authentication (token issuance). All restaurant context — `restaurant_type_flag`, `restaurant_id`, `restaurant_name`, hierarchy, inventory data, transfers, queues, and history — is sourced entirely from local seed data (`seed_data.py`). This is confirmed by both code inspection and direct runtime API comparison.

---

## 2. Owner Concern

The owner's concern is **confirmed**. The screenshot provided shows a user logging in and seeing:
- "My Store" (generic fallback name)
- "Unknown" badge
- "Store type unavailable — please contact admin"
- "Context locked"
- Only "Pending Receives" (0) and "My Requests" (0) visible
- No Dispatch, Adjust Stock, or other actions

This is the P1 frontend fail-closed hardening working correctly — it blocks unmapped users. But it confirms the underlying issue: **the app cannot determine restaurant context from the POS API alone**. It depends entirely on `EMAIL_RESTAURANT_MAP` in `seed_data.py`.

---

## 3. Inputs Reviewed

| # | Input | Reviewed |
|---|-------|----------|
| 1 | Owner screenshot (image.png) | YES |
| 2 | Investigation Report | YES |
| 3 | Fix Handoff | YES |
| 4 | Fix Implementation Report | YES |
| 5 | `/app/backend/server.py` — full proxy flow | YES |
| 6 | `/app/backend/seed_data.py` — EMAIL_RESTAURANT_MAP, RESTAURANTS, all seed functions | YES |
| 7 | `/app/backend/.env` — environment variables | YES |
| 8 | `/app/frontend/src/hooks/useLoginContext.js` — context derivation | YES |
| 9 | `/app/frontend/src/services/api.js` — API client | YES |
| 10 | `/app/frontend/src/lib/terminology.js` — term mapping | YES |
| 11 | `/app/frontend/src/lib/screenVisibility.js` — permission matrix | YES |

**Total: 11 inputs reviewed**

---

## 4. Current Login / Context Flow

### Step-by-Step Flow

```
1. User enters email + password in LoginPage.jsx
2. Frontend calls: POST /api/proxy/auth/login
3. Backend proxy receives request (server.py line 66)
4. Backend forwards to POS API: POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/common-login
5. POS API returns: {token, firebase_token, crm_token, first_login, role_names, permissions, zone_wise_topic, login_type}
   *** POS API does NOT return: restaurant_type_flag, restaurant_id, restaurant_name ***
6. Backend checks: is email in seed_data.EMAIL_RESTAURANT_MAP?
   - YES → enrich response with restaurant_type_flag, restaurant_id, restaurant_name from seed_data.RESTAURANTS
           + store token→restaurant_id in _token_restaurant_map
   - NO  → return POS API response as-is (missing all restaurant context)
7. Frontend receives response
8. useLoginContext extracts: token, restaurant_type_flag, restaurant_id, restaurant_name
9. If restaurant_type_flag is missing → restaurantType = null → fail-closed (P1 hardening)
10. If present → normal context derivation, screen visibility, action permissions
```

### Key Architectural Finding

The POS API login endpoint (`/api/v1/auth/vendoremployee/common-login`) returns:
- `token` (JWT for subsequent API calls)
- `permissions` (array of permission strings)
- `role_names` (e.g., "hunter", "Owner")
- `login_type` ("employee")
- `zone_wise_topic` (e.g., "zone_6_restaurant")

It does **NOT** return:
- `restaurant_type_flag` ← **NEVER present in POS API response**
- `restaurant_id` ← **NEVER present in POS API response**
- `restaurant_name` ← **NEVER present in POS API response**

These three critical fields are **always injected by the proxy** from `seed_data.py`.

---

## 5. POS API Usage Findings

### What POS API IS Used For

| Endpoint | POS API URL | Purpose | Used? |
|---|---|---|---|
| Login | `POST /api/v1/auth/vendoremployee/common-login` | Authentication + token issuance | YES — always called |
| Hierarchy Summary | `POST /api/v2/vendoremployee/inventory-transfer/hierarchy-summary` | Real store hierarchy data | YES — called, but merged with seed data |
| Transfer Detail | `GET /api/v2/vendoremployee/inventory-transfer/details/{id}` | Transfer detail fallback | YES — only as fallback when seed_data has no match |
| Generic V2 proxy | `{PREPROD_V2}/{path}` | Write operations (dispatch, approve, etc.) | YES — pass-through |

### What POS API is NOT Used For

| Data | Source Today | POS API Called? |
|---|---|---|
| `restaurant_type_flag` | `seed_data.RESTAURANTS` | **NO** — POS API doesn't return this field |
| `restaurant_id` | `seed_data.EMAIL_RESTAURANT_MAP` | **NO** — POS API doesn't return this field |
| `restaurant_name` | `seed_data.RESTAURANTS` | **NO** — POS API doesn't return this field |
| Hierarchy detail | `seed_data.get_hierarchy_detail()` | **NO** — 100% seed data |
| Pending queues | `seed_data.get_pending_queues()` | **NO** — 100% seed data |
| Transfer history | `seed_data.get_transfer_history()` | **NO** — 100% seed data |
| Transfer detail | `seed_data.get_transfer_detail()` | Seed first; POS API only as fallback |
| Inventory items | `seed_data.INVENTORY_ITEMS` | **NO** — 100% seed data |
| Stock levels | `seed_data._stock_for_store()` | **NO** — 100% seed data (randomly generated) |

---

## 6. Local Seed / DB Usage Findings

### EMAIL_RESTAURANT_MAP Controls

`seed_data.EMAIL_RESTAURANT_MAP` (8 entries) is the **sole mechanism** that maps a user email to a restaurant_id. Without this mapping:

1. Proxy does not enrich the login response
2. Frontend receives no restaurant context
3. User gets fail-closed "Unknown" state (after P1 fix) or silent Central Store default (before P1 fix)
4. Backend `_token_restaurant_map` is never populated for the user's token
5. Backend `_get_actor_restaurant()` defaults to restaurant_id=1

### Users Dependent on Seed Mapping

ALL 8 mapped users depend entirely on seed_data:

| Email | Seed Restaurant ID | Type | In Seed? |
|---|---|---|---|
| abhishek@kalabahia.com | 1 | master | YES |
| killua@zoldyck.com | 1 | master | YES (added in fix) |
| owner@democentral1.com | 781 | central | YES |
| owner@democentral2.com | 782 | central | YES |
| owner@demofranchise1.com | 783 | franchise | YES |
| owner@demofranchise2.com | 784 | franchise | YES |
| owner@demofranchise3.com | 785 | franchise | YES |
| owner@demofranchise4.com | 786 | franchise | YES |

Any user NOT in this map cannot use Central Inventory, even if they can authenticate with the POS API.

### Is It Dev-Only or Production-Path?

`seed_data.py` is **production-path**. It is:
- Imported at module level (`import seed_data` in `server.py` line 15)
- Used in every single endpoint except the generic V2 pass-through proxy
- The ONLY source of restaurant context, hierarchy, transfers, queues, history, and stock data
- Not gated behind any dev/demo flag

---

## 7. Source-of-Truth Matrix

| Data Field | Source Today | Evidence | Should Source Be POS API? | Risk | Recommendation |
|---|---|---|---|---|---|
| User identity (token) | **POS API** | Login calls `preprod.mygenie.online`, token returned by POS | YES (correct) | LOW | No change needed |
| User permissions | **POS API** | `permissions` array in POS response | YES (correct) | LOW | No change needed |
| Restaurant ID | **Local seed** | `EMAIL_RESTAURANT_MAP[email]` | YES | **P0** | Migrate to POS API profile endpoint |
| Restaurant name | **Local seed** | `RESTAURANTS[rid]["name"]` | YES | **P0** | Migrate to POS API |
| Restaurant type | **Local seed** | `RESTAURANTS[rid]["restaurant_type_flag"]` | YES | **P0** | Migrate to POS API |
| Hierarchy parent/child | **Local seed** | `RESTAURANTS[rid]["parent_restaurant_id"]` + `get_visible_restaurants()` | YES | **P1** | Migrate to POS API hierarchy endpoint |
| Screen visibility | **Frontend config** | `screenVisibility.js` matrix | Acceptable (config-driven) | LOW | Keep as frontend config |
| Stock/store context | **Local seed** | `_stock_for_store()` (randomly generated!) | YES | **P0** | Migrate to POS API stock endpoints |
| Transfer data | **Local seed** | `TRANSFERS` list in seed_data.py | YES | **P0** | Migrate to POS API transfer endpoints |
| Pending queues | **Local seed** | `get_pending_queues()` | YES | **P0** | Migrate to POS API |
| Transfer history | **Local seed** | `get_transfer_history()` | YES | **P0** | Migrate to POS API |
| Inventory items | **Local seed** | `INVENTORY_ITEMS` list | YES | **P1** | Migrate to POS API |
| Ledger/report scoping | **Local seed** | `_get_actor_restaurant()` resolves from seed map | YES | **P0** | Migrate to POS API |

---

## 8. User Comparison

### Direct POS API Response (NO proxy enrichment)

| User | In Local Seed? | POS API Called? | POS Returns restaurant_type_flag? | POS Returns restaurant_id? | POS Returns restaurant_name? |
|---|---|---|---|---|---|
| killua@zoldyck.com | YES (rid=1) | YES | **NO** | **NO** | **NO** |
| abhishek@kalabahia.com | YES (rid=1) | YES | **NO** | **NO** | **NO** |
| owner@democentral1.com | YES (rid=781) | YES | **NO** | **NO** | **NO** |
| owner@demofranchise1.com | YES (rid=783) | YES | **NO** | **NO** | **NO** |

### Proxy Response (WITH seed enrichment)

| User | restaurant_type_flag | restaurant_id | restaurant_name | Source |
|---|---|---|---|---|
| killua@zoldyck.com | `master` | `1` | `My Genie` | Seed enrichment |
| abhishek@kalabahia.com | `master` | `1` | `My Genie` | Seed enrichment |
| owner@democentral1.com | `central` | `781` | `DemoCentral1` | Seed enrichment |
| owner@demofranchise1.com | `franchise` | `783` | `DemoFranchise1` | Seed enrichment |

### Conclusion

For ALL 4 users, the POS API returns **zero** restaurant context fields. ALL restaurant context comes from `seed_data.py` enrichment. The POS API is used **only for authentication**.

---

## 9. Hypothesis Results

| Hypothesis | Status | Evidence |
|---|---|---|
| **H1:** `EMAIL_RESTAURANT_MAP` is currently the source of truth for Central Inventory restaurant context | **CONFIRMED** | Direct POS API calls return no restaurant fields. Proxy enrichment from seed_data is the ONLY source. |
| **H2:** POS API is used only partially, while restaurant/store type/hierarchy is still local seed | **CONFIRMED** | POS API: auth only. Seed data: restaurant context, hierarchy, transfers, queues, history, stock. |
| **H3:** Frontend fallback previously hid missing context by defaulting to Central Store | **CONFIRMED** | Pre-P1: `restaurantType = rawRestaurantType \|\| (user ? "master" : null)`. Post-P1: fails closed to null. |
| **H4:** Adding `killua@zoldyck.com` fixed one mapped user but does not remove architecture risk | **CONFIRMED** | Any new user not in EMAIL_RESTAURANT_MAP will still fail. The fix is user-specific, not architectural. |
| **H5:** Correct long-term fix is to fetch user/restaurant context from POS API profile response and remove local seed dependency for real users | **CONFIRMED** | POS API login endpoint doesn't return these fields. A separate POS profile/restaurant endpoint would be needed, or the login endpoint needs enhancement. |
| **H6:** Local seed may still be acceptable only for demo/dev users if clearly gated | **PARTIAL** | Acceptable for UX prototyping phase. But the current architecture does not gate seed as "demo-only" — it is the production path. |

---

## 10. Architecture Risk Assessment

| Risk Area | Severity | Description |
|---|---|---|
| **Production readiness** | **P0 BLOCKER** | No production user can be onboarded without being manually added to `EMAIL_RESTAURANT_MAP`. The POS API does not provide restaurant context. |
| **New user onboarding** | **P0 BLOCKER** | Every new user requires a code change to `seed_data.py` + deployment. This is not scalable. |
| **Same-restaurant multi-user** | **P1** | Partially mitigated by P0 fix (killua added). But all users must be explicitly mapped. |
| **Stock data accuracy** | **P0 BLOCKER** | Stock levels are randomly generated by `_stock_for_store()` with `random.seed(restaurant_id)`. Not real inventory data. |
| **Transfer data accuracy** | **P0 BLOCKER** | All transfers are hardcoded in `TRANSFERS` list. Not real transfer history. |
| **Slice 5 owner smoke** | **NON-BLOCKING** | Owner smoke uses mapped users. Seed data provides complete demo experience. |
| **Slice 5 closure** | **NON-BLOCKING** | Slice 5 is a UX/frontend feature slice. Seed data is sufficient for UX validation. |
| **Slice 6 planning** | **P1** | Slice 6 should include POS API migration planning if production deployment is intended. |

### Critical Distinction: UX Prototyping vs Production

The current architecture is **fully functional for UX prototyping and demo purposes**. The seed data provides:
- Complete restaurant hierarchy (7 stores across 3 levels)
- Realistic transfer data (12 transfers across all statuses)
- Stock levels for all stores
- All queue states (approval_pending, receive_pending, my_requests)

This is by design — the `seed_data.py` header says "Covers all screen states for UX building exercise."

**However**, for production deployment, this architecture cannot scale because:
1. Users must be manually added to code
2. Inventory data is fake/random
3. Transfer history is static

---

## 11. Recommended Fix Strategy

### Strategy B — Seed patch + frontend fail-closed hardening (CURRENT STATE)

**Already implemented.** The P0 seed mapping fix + P1 frontend hardening is the correct approach for the current UX prototyping phase.

### Strategy C — POS API source-of-truth migration (RECOMMENDED FOR PRODUCTION)

This is the correct long-term strategy but is **NOT needed for Slice 5 closure**. It should be planned for a future production-readiness slice.

**Why Strategy B is correct for now:**
1. The project is described as a "UX building exercise" (seed_data.py header)
2. Slice 1-5 are frontend/UX feature slices, not backend API integration slices
3. All owner smoke testing uses mapped demo accounts
4. The seed data provides complete, deterministic demo data for all screen states
5. POS API integration for real inventory data is a separate, larger scope item

**Why Strategy C is needed eventually:**
1. Real users cannot be onboarded without code changes
2. Real inventory data is not reflected
3. Real transfers are not visible
4. Stock levels are fabricated

---

## 12. Proposed Implementation Plan (Future — Do Not Implement Now)

### Phase A — Document and Gate Seed Dependency

- Add clear comments/documentation that seed_data is demo-only
- Add runtime warning/log when seed enrichment is used
- Document which endpoints are seed-only vs POS API pass-through

### Phase B — POS API Profile/Context Endpoint

- Investigate whether POS API has a user profile endpoint that returns restaurant context
- If yes: call it after login to get restaurant_type_flag, restaurant_id, restaurant_name
- If no: request POS API enhancement from the MyGenie backend team

### Phase C — Remove EMAIL_RESTAURANT_MAP for Real Users

- Use POS API profile response for restaurant context
- Keep EMAIL_RESTAURANT_MAP only as fallback for demo accounts
- Gate demo accounts with a flag (e.g., `is_demo: true`)

### Phase D — Migrate Inventory/Transfer Endpoints

- Replace seed-based hierarchy-detail, pending-queues, transfer-history with POS API calls
- Remove randomly generated stock data
- Use POS API as primary, seed data only as fallback for demo

### Phase E — QA with Multi-User Real Accounts

- Test with real POS API accounts (not demo accounts)
- Verify restaurant context comes from POS API
- Verify seed data is bypassed for real accounts

---

## 13. Blocking Assessment

| Item | Assessment | Reason |
|---|---|---|
| Current context fix QA | **does_not_block** | Fix is verified; QA can proceed with mapped users |
| Slice 5 owner smoke | **does_not_block** | Owner smoke uses mapped demo accounts |
| Slice 5 closure | **does_not_block_but_document** | Slice 5 is UX validation; seed dependency should be documented as known architecture |
| Slice 6 planning | **does_not_block_slice_5_but_blocks_production** | Production readiness requires POS API migration |
| Production readiness | **blocks_production** | Cannot deploy to production with seed-only architecture |

---

## 14. Recommended Next Agent

### `Central Inventory Login Context Collision Fix QA Agent`

**Rationale:** The immediate action is to complete QA on the P0+P1 fix for mapped users. POS API migration is a future production-readiness concern, not a Slice 5 blocker.

After QA → proceed to Slice 5 owner smoke → then plan POS API migration in Slice 6 or a dedicated production-readiness slice.

---

## 15. Final Verdict

### `owner_concern_confirmed_pos_api_migration_needed`

The owner's concern is **fully confirmed**:
1. The POS API login endpoint does NOT return restaurant context fields (verified by direct API call)
2. ALL restaurant context comes from `seed_data.EMAIL_RESTAURANT_MAP` + `seed_data.RESTAURANTS`
3. ALL inventory, transfer, queue, and history data comes from `seed_data.py`
4. The POS API is used ONLY for authentication (token issuance)

**However**, this is by design for the current UX prototyping phase. The seed data provides complete demo data for all screen states. POS API migration should be planned for production readiness but does NOT block Slice 5 closure.

---

*End of POS API Source-of-Truth Verification Report*
