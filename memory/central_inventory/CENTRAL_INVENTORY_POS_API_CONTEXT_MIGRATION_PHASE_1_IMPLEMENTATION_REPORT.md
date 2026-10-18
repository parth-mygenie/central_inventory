# Central Inventory POS API Context Migration Phase 1 Implementation Report

> **Date:** 24 May 2026
> **Agent:** Senior Backend/Proxy POS Context Adapter Implementation Agent
> **Scope:** Phase 1 — Login context from POS API profile (backend-only)

---

## 1. Implementation Status

### `phase_1_pos_context_migration_complete_ready_for_qa`

POS API profile-based login context enrichment is fully implemented and verified. All 4 user types return correct context from POS API. Seed fallback is gated behind `SEED_FALLBACK_ENABLED` env flag (default: `false`). Token-to-restaurant mapping persisted in MongoDB. No frontend changes required.

---

## 2. Inputs Reviewed

| # | Input | Reviewed |
|---|-------|----------|
| 1 | PRD.md | YES |
| 2 | POS API Context Migration Plan | YES |
| 3 | POS API Context Migration Planning Handoff | YES |
| 4 | POS API Source-of-Truth Verification Report | YES |
| 5 | Login Context Collision Investigation Report | YES |
| 6 | Login Context Collision Fix Implementation Report | YES |
| 7 | `/app/backend/server.py` (pre-migration) | YES |
| 8 | `/app/backend/seed_data.py` | YES |
| 9 | `/app/backend/.env` | YES |

**Total: 9 inputs reviewed**

---

## 3. Scope Confirmed

Phase 1 was limited to:
- Replacing seed-based login context enrichment with POS API profile call
- Persisting token→restaurant_id in MongoDB (replacing in-memory dict)
- Gating seed fallback behind `SEED_FALLBACK_ENABLED` env flag
- Backend `server.py` changes ONLY — zero frontend changes

Not in scope (Phase 2+):
- Replacing seed-based hierarchy-detail, pending-queues, transfer-history endpoints
- Removing seed_data.py
- Frontend changes

---

## 4. Files Changed

| File | New/Modified | Purpose | Scope Item |
|---|---|---|---|
| `/app/backend/server.py` | Modified | POS profile call after login; MongoDB token sessions; async actor resolution; seed fallback gating | Phase 1 core |

**Total: 1 file changed**

---

## 5. Old Flow

```
1. Frontend → POST /api/proxy/auth/login
2. Proxy → POS API login (token only)
3. Proxy checks EMAIL_RESTAURANT_MAP (seed_data.py)
   → If email found: enrich with seed restaurant_type_flag, restaurant_id, restaurant_name
   → Store token→restaurant_id in volatile in-memory dict
4. Return enriched response to frontend
```

**Problems:** Seed-dependent; in-memory dict lost on restart; unmapped users get no context.

---

## 6. New Flow

```
1. Frontend → POST /api/proxy/auth/login
2. Proxy → POS API login (token)
3. Proxy → GET /api/v1/vendoremployee/profile (with Bearer token)
   → Extract restaurants[0] from profile response
   → Set restaurant_id, restaurant_name, restaurant_type_flag, parent_restaurant_id
   → Persist token→restaurant_id in MongoDB token_sessions collection
4. If POS profile fails AND SEED_FALLBACK_ENABLED=true:
   → Fall back to EMAIL_RESTAURANT_MAP (demo/dev only)
5. If POS profile fails AND SEED_FALLBACK_ENABLED=false (default):
   → Return login-only response (frontend fail-closed)
6. Return enriched response to frontend
```

**Improvements:** POS API is source of truth; MongoDB persistence survives restarts; seed gated behind env flag.

---

## 7. POS Profile Field Mapping

| POS Profile Field | Location | Normalized Context Field | Used For |
|---|---|---|---|
| `restaurants[0].id` | V1 profile response | `restaurant_id` | Restaurant scoping for all data |
| `restaurants[0].name` | V1 profile response | `restaurant_name` | Display in header/context |
| `restaurants[0].restaurant_type_flag` | V1 profile response | `restaurant_type_flag` | Hierarchy level (master/central/franchise) |
| `restaurants[0].parent_restaurant_id` | V1 profile response | `parent_restaurant_id` | Hierarchy parent context |

**Terminology mapping (unchanged — handled by frontend):**
- `master` → Central Store (TOP)
- `central` → Master Store (MIDDLE)
- `franchise` → Outlet (BOTTOM)

---

## 8. Seed Dependency Removal / Gating

| Item | Status |
|---|---|
| `EMAIL_RESTAURANT_MAP` bypassed for real users | **YES** — POS profile is called first; seed only if `SEED_FALLBACK_ENABLED=true` AND profile fails |
| `RESTAURANTS` bypassed for real users | **YES** — same gating |
| Seed fallback remains for demo/dev | **YES** — gated behind `SEED_FALLBACK_ENABLED` env flag |
| How seed fallback is gated | `SEED_FALLBACK_ENABLED` env var (default: `false` = no seed) |
| How missing POS context fails closed | Login response returned without restaurant context → frontend `restaurantType = null` → fail-closed (P1 hardening) |
| In-memory `_token_restaurant_map` removed | **YES** — replaced with MongoDB `token_sessions` collection |

---

## 9. Frontend Compatibility

| Check | Result |
|---|---|
| Response shape preserved | **YES** — same field names: `restaurant_id`, `restaurant_name`, `restaurant_type_flag` |
| Frontend changes made | **NO** — zero frontend changes |
| New field added | `parent_restaurant_id` — additive, does not break frontend |

---

## 10. Safe Verification Results

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Backend import | PASS | `python3 -c "import server"` — no errors |
| 2 | Backend starts | PASS | Supervisor: "Application startup complete" |
| 3 | killua@zoldyck.com login | PASS | `restaurant_type_flag: master`, `restaurant_id: 1`, `restaurant_name: My Genie` |
| 4 | abhishek@kalabahia.com login | PASS | Same as killua — both from POS profile |
| 5 | owner@democentral1.com login | PASS | `restaurant_type_flag: central`, `restaurant_id: 781`, `restaurant_name: DemoCentral1` |
| 6 | owner@demofranchise1.com login | PASS | `restaurant_type_flag: franchise`, `restaurant_id: 783`, `restaurant_name: DemoFranchise1` |
| 7 | POS profile called (logs) | PASS | All 4 show "POS profile context resolved" — zero "seed fallback" |
| 8 | MongoDB persistence | PASS | `token_sessions` collection has 4 entries with correct restaurant_id |
| 9 | UI killua login | PASS | Screenshot: "My Genie" + "Central Store" badge, full hub, no warnings |
| 10 | Seed not used | PASS | `SEED_FALLBACK_ENABLED` defaults to `false`; logs confirm POS source |

---

## 11. Users Verified

| User | POS Profile Called | Context Source | Restaurant ID | Restaurant Type | Seed Used | Result |
|---|---|---|---|---|---|---|
| killua@zoldyck.com | YES | POS API profile | 1 | master | NO | PASS |
| abhishek@kalabahia.com | YES | POS API profile | 1 | master | NO | PASS |
| owner@democentral1.com | YES | POS API profile | 781 | central | NO | PASS |
| owner@demofranchise1.com | YES | POS API profile | 783 | franchise | NO | PASS |

---

## 12. Scope Guard Confirmation

| Rule | Confirmed |
|---|---|
| No stock-changing APIs run | YES |
| No inventory data mutated | YES |
| No secrets exposed | YES |
| No unrelated auth changes | YES |
| No Slice 5 feature expansion | YES |
| `/app/memory/final/` not updated | YES |
| No frontend changes | YES |

---

## 13. Known Notes / Risks

| Note | Details |
|---|---|
| Multi-restaurant user | Uses `restaurants[0]` — if a user has multiple restaurants, only the first is used. No evidence of multi-restaurant users found. |
| Seed endpoints (Phase 2+) | `hierarchy-detail`, `pending-queues`, `transfer-history` still use seed data for their content (not login context). This is Phase 2/3 scope. |
| `_get_actor_restaurant` fallback | Still returns `1` if token not in MongoDB. This is safe for seed-based endpoints that still need an actor_id. |
| `SEED_FALLBACK_ENABLED` default | `false` — seed is NOT used unless explicitly enabled via env var. |
| POS profile timeout | 15 seconds — if POS API is slow, login will take longer but not break. |

---

## 14. QA Readiness

### QA can start: **YES**

All changes verified via:
- Backend import and startup check
- curl for 4 users (all POS profile sourced)
- MongoDB persistence verified
- UI screenshot for killua (full Central Store context)
- Backend logs confirm POS profile, not seed

---

## 15. Recommended Next Agent

### `Central Inventory POS API Context Migration Phase 1 QA Agent`

---

*End of Phase 1 Implementation Report*
