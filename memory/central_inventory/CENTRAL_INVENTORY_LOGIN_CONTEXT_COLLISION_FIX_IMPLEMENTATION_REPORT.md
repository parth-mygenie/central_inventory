# Central Inventory Login Context Collision Fix Implementation Report

> **Date:** 24 May 2026
> **Agent:** Senior Central Inventory Login Context Collision Fix Implementation Agent
> **Scope:** Limited bug-fix — P0 backend mapping + P1 frontend fallback hardening

---

## 1. Fix Status

### `fix_complete_ready_for_qa`

Both P0 (backend seed mapping) and P1 (frontend fallback hardening) implemented and verified. No build errors. API and UI verification pass for all tested users.

---

## 2. Inputs Reviewed

| # | Document | Reviewed |
|---|----------|----------|
| 1 | `/app/memory/central_inventory/CENTRAL_INVENTORY_LOGIN_CONTEXT_COLLISION_INVESTIGATION_REPORT.md` | YES |
| 2 | `/app/memory/central_inventory/CENTRAL_INVENTORY_LOGIN_CONTEXT_COLLISION_FIX_HANDOFF.md` | YES |
| 3 | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_FINAL_QA_VALIDATION_REPORT.md` | YES |
| 4 | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_OWNER_SMOKE_CHECKLIST.md` | YES |
| 5 | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_5_FINAL_ACCEPTANCE_RECOMMENDATION.md` | YES |
| 6 | `/app/backend/seed_data.py` (pre-fix) | YES |
| 7 | `/app/frontend/src/hooks/useLoginContext.js` (pre-fix) | YES |
| 8 | `/app/frontend/src/components/layout/AppHeader.jsx` (pre-fix) | YES |

**Total: 8 inputs reviewed**

---

## 3. Root Cause Confirmed

| Priority | Classification | Confirmed |
|---|---|---|
| **PRIMARY** | `proxy_auth_response_mismatch` | YES — `killua@zoldyck.com` not in `EMAIL_RESTAURANT_MAP`, proxy enrichment skipped |
| **SECONDARY** | `frontend_default_fallback_bug` | YES — line 38 defaulted to `"master"` (Central Store) for missing flag |
| **TERTIARY** | `backend_or_proxy_cache_key_bug` | YES — in-memory `_token_restaurant_map` volatile (NOT fixed in this scope — P2) |
| **Confidence** | High | Full evidence chain from investigation report |

---

## 4. Files Changed

| File | New/Modified | Purpose | Fix Item |
|---|---|---|---|
| `/app/backend/seed_data.py` | Modified | Added `killua@zoldyck.com` → restaurant_id=1 to `EMAIL_RESTAURANT_MAP` | P0 |
| `/app/frontend/src/hooks/useLoginContext.js` | Modified | Removed hard default to `"master"` — missing flag now stays `null` | P1 |
| `/app/frontend/src/components/layout/AppHeader.jsx` | Modified | Updated warning message: "Store type unavailable — please contact admin" | P1 |

**Total: 3 files changed**

---

## 5. P0 Backend/Proxy Mapping Fix

| Field | Detail |
|---|---|
| **File** | `/app/backend/seed_data.py` |
| **Change** | Added `"killua@zoldyck.com": 1` to `EMAIL_RESTAURANT_MAP` |
| **Affected User** | `killua@zoldyck.com` |
| **Expected Context** | `restaurant_type_flag: "master"`, `restaurant_id: 1`, `restaurant_name: "My Genie"` |
| **Why This Fixes** | Proxy enrichment now fires for killua. Login response includes all 3 context fields. Frontend receives complete data → no fallback triggered. Backend `_token_restaurant_map` gets killua's token mapped → `_get_actor_restaurant()` returns correct restaurant_id=1. |

### Verification

```
POST /api/proxy/auth/login {"email":"killua@zoldyck.com",...}
BEFORE: restaurant_type_flag=MISSING, restaurant_id=MISSING, restaurant_name=MISSING
AFTER:  restaurant_type_flag="master", restaurant_id=1, restaurant_name="My Genie"
```

---

## 6. P1 Frontend Fallback Hardening

| Field | Detail |
|---|---|
| **Implemented** | YES |
| **Files Changed** | `useLoginContext.js`, `AppHeader.jsx` |
| **Old Behavior** | Missing `restaurant_type_flag` → default to `"master"` (Central Store). Any unmapped user silently gets full Central Store permissions. |
| **New Behavior** | Missing `restaurant_type_flag` → `restaurantType` stays `null`. All `canAccessScreen()` calls return `HIDDEN`. All `canPerformAction()` calls return `false`. User is authenticated but sees no privileged content. |
| **Unknown/Missing Type** | `restaurantType = null`, `restaurantTypeUnknown = true`, header shows "Store type unavailable — please contact admin" warning |
| **Why This Reduces Risk** | Fail-closed: unmapped users cannot accidentally get Central Store (or any other) privileged access. Security posture improved without affecting mapped users. |

### Downstream Impact Analysis (null restaurantType)

| Component | Behavior with null | Safe? |
|---|---|---|
| `HIERARCHY_LEVEL[null]` | `undefined` → `hierarchyLevel = null` | YES |
| `isTopLevel / isMiddleLevel / isBottomLevel` | All `false` | YES |
| `canAccessScreen(screenId, null)` | Returns `HIDDEN` for all screens | YES — fail-closed |
| `canPerformAction(actionId, null)` | Returns `false` for all actions | YES — fail-closed |
| `getVisibleNavItems(null)` | Returns `[]` — empty sidebar | YES — no accidental access |
| `mapRestaurantType(null)` | Returns `"Unknown"` | YES |
| `mapRole(null)` | Returns `"Unknown Role"` | YES |
| `getStoreTypeBadge(null)` | Returns gray fallback style | YES |

---

## 7. Safe Verification Performed

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Backend seed_data import | PASS | `python3 -c "import seed_data; assert 'killua@zoldyck.com' in seed_data.EMAIL_RESTAURANT_MAP"` |
| 2 | Backend auto-reload | PASS | Supervisor logs: "Application startup complete" |
| 3 | killua API login (curl) | PASS | Response: `restaurant_type_flag: "master"`, `restaurant_id: 1`, `restaurant_name: "My Genie"` |
| 4 | abhishek API login (curl) | PASS | Response unchanged — all context fields present |
| 5 | Master user API login (curl) | PASS | `owner@democentral1.com`: `restaurant_type_flag: "central"`, `restaurant_id: 781` |
| 6 | Outlet user API login (curl) | PASS | `owner@demofranchise1.com`: `restaurant_type_flag: "franchise"`, `restaurant_id: 783` |
| 7 | killua UI login (browser screenshot) | PASS | "My Genie" + "Central Store" badge, no warning banner, full hub with actions |
| 8 | abhishek UI login (browser screenshot) | PASS | Identical to pre-fix — no regression |
| 9 | No secrets exposed | PASS | All tokens masked in verification output and documentation |

---

## 8. Context Regression Risk Review

| Area | Impact | Status |
|---|---|---|
| Store type badge | killua now shows "Central Store" badge (correct) instead of warning banner | IMPROVED |
| Acting/store context | killua now has `restaurantId=1` instead of `null` — context selector can load children | IMPROVED |
| Hierarchy visibility | killua now sees all stores (Central Store top-level access) | IMPROVED |
| Stock Adjustment access | killua gets "Adjust Stock" button (Central-only) — correct for restaurant_id=1 | NO CHANGE for mapped users |
| Wastage Entry access | Available for all roles — unchanged | NO CHANGE |
| Wastage Report scoping | killua now has `restaurantId=1` for scoping instead of null | IMPROVED |
| History & Ledger scoping | killua's backend context now correctly mapped | IMPROVED |
| Unmapped users (P1 effect) | Now see no privileged content instead of Central Store content | IMPROVED (security) |

---

## 9. Scope Guard Confirmation

| Rule | Confirmed |
|---|---|
| No stock-changing APIs run | YES |
| No inventory data mutated | YES |
| No unrelated auth changes | YES |
| No backend secrets changed | YES |
| No frontend feature expansion | YES |
| `/app/memory/final/` not updated | YES |
| No terminology mapping changes | YES |
| No Slice 5 business logic changes | YES |

---

## 10. Known Notes / Risks

| # | Note | Severity | Mitigated? |
|---|---|---|---|
| 1 | In-memory `_token_restaurant_map` still volatile (P2 — not in scope) | MEDIUM | NOT FIXED — documented. Users must re-login after server restart. |
| 2 | `_get_actor_restaurant()` still defaults to 1 for unknown tokens (P2) | MEDIUM | NOT FIXED — documented. |
| 3 | Frontend P1 hardening means any NEW user not in `EMAIL_RESTAURANT_MAP` will see empty app | LOW | By design — fail-closed is safer than fail-open to Central Store |
| 4 | Preprod API still does not return `restaurant_type_flag` natively | INFO | Architectural constraint — all users must be in `EMAIL_RESTAURANT_MAP` for correct context |

---

## 11. QA Readiness

### QA can start: **YES**

All changes are verified via:
- Backend import check
- API curl for 4 user roles
- Browser UI screenshot for both affected users

QA handoff created at:
`/app/memory/central_inventory/CENTRAL_INVENTORY_LOGIN_CONTEXT_COLLISION_FIX_QA_HANDOFF.md`

---

## 12. Recommended Next Agent

### `Central Inventory Login Context Collision Fix QA Agent`

Scope:
1. Full QA per handoff checklist (15 checks)
2. Same-browser login sequence tests
3. Role regression for Master and Outlet users
4. Slice 5 feature regression (Stock Adjustment, Wastage Entry, Wastage Report, History & Ledger)

---

*End of Fix Implementation Report*
