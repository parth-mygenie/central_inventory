# Central Inventory POS API Context Migration Phase 1 QA Report

> **Date:** 28 May 2026
> **Agent:** Batch A QA — Seed Shutdown + POS Migration
> **Input:** `CENTRAL_INVENTORY_POS_API_CONTEXT_MIGRATION_PHASE_1_QA_HANDOFF.md`, `CENTRAL_INVENTORY_POS_API_CONTEXT_MIGRATION_PHASE_1_IMPLEMENTATION_REPORT.md`
> **Code Branch:** `28_5_26_ux`

---

## 1. QA Status

### `pos_migration_p1_qa_passed`

All 17 checks pass. All 4 test users receive login context from POS API profile (`GET /api/v1/vendoremployee/profile → restaurants[0]`). MongoDB `token_sessions` persisted correctly. No seed fallback active. Zero failures.

---

## 2. QA Environment

| Field | Value |
|-------|-------|
| App URL | `https://asset-tracker-637.preview.emergentagent.com` |
| Backend | FastAPI on port 8001 |
| POS API | `preprod.mygenie.online` (V1 auth + V2 vendoremployee) |
| Roles tested | Central, Master, Outlet + duplicate Central |
| Mutation tests | NONE |

---

## 3. Login Context Validation (4 users)

| # | User | Expected | Actual | Result |
|---|------|----------|--------|--------|
| PM-01 | killua@zoldyck.com | rid=1, type=master, name=My Genie, parent=null | rid=1, type=master, name=My Genie, parent=None | **PASS** |
| PM-02 | abhishek@kalabahia.com | rid=1, type=master, name=My Genie, parent=null | rid=1, type=master, parent=None | **PASS** |
| PM-03 | owner@democentral1.com | rid=781, type=central, name=DemoCentral1, parent=1 | rid=781, type=central, parent=1 | **PASS** |
| PM-04 | owner@demofranchise1.com | rid=783, type=franchise, name=DemoFranchise1, parent=781 | rid=783, type=franchise, parent=781 | **PASS** |

### PM-05: parent_restaurant_id correctness

| User | Expected parent_rid | Actual parent_rid | Result |
|------|--------------------|--------------------|--------|
| killua (master/Central) | null | None | **PASS** |
| abhishek (master/Central) | null | None | **PASS** |
| democentral1 (central/Master) | 1 | 1 | **PASS** |
| demofranchise1 (franchise/Outlet) | 781 | 781 | **PASS** |

---

## 4. Backend Log Verification

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| PM-06 | "POS profile context resolved" after each login | **PASS** | 4 log lines confirmed: `rid=1, type=master` (×2), `rid=781, type=central`, `rid=783, type=franchise` |
| PM-07 | No "Seed fallback context used" messages | **PASS** | 0 matches in backend logs |

**Exact log evidence:**
```
POS profile context resolved for killua@zoldyck.com: rid=1, type=master
POS profile context resolved for abhishek@kalabahia.com: rid=1, type=master
POS profile context resolved for owner@democentral1.com: rid=781, type=central
POS profile context resolved for owner@demofranchise1.com: rid=783, type=franchise
```

---

## 5. MongoDB Persistence

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| PM-08 | `token_sessions` has entries for all 4 users | **PASS** | 4 entries: rid=1/master (×2), rid=781/central, rid=783/franchise |

---

## 6. Browser Validation

| # | Check | Role | Result | Evidence |
|---|-------|------|--------|----------|
| PM-09 | Central hub with correct badge | killua@zoldyck.com | **PASS** | "My Genie" + "Central Store" badge, full nav (8 items), all action buttons visible |
| PM-10 | Master hub with correct badge | owner@democentral1.com | **PASS** | "DemoCentral1" + "Master Store" badge, full nav, Dispatch+Request+Wastage buttons |
| PM-11 | Outlet hub with correct badge | owner@demofranchise1.com | **PASS** | "DemoFranchise1" + "Outlet" badge, "locked to own store", no Dispatch/Adjust buttons |
| PM-12 | Central hierarchy visibility | killua | **PASS** | Hierarchy Summary accessible, shows all stores |
| PM-13 | Outlet locked to self | demofranchise1 | **PASS** | "Context locked" displayed, no store switching |
| PM-14 | Stock Adjustment role-gated | 3 roles | **PASS** | Central: "Adjust Stock" button visible; Master/Outlet: hidden (Request Stock + Record Wastage only) |
| PM-15 | User switching no collision | killua → democentral1 → demofranchise1 | **PASS** | Each login shows correct context, no stale data |

---

## 7. Safety Checks

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| PM-16 | No secrets in responses | **PASS** | Token in login response only (expected). No raw tokens in proxy data. |
| PM-17 | SEED_FALLBACK_ENABLED permanently off | **PASS** | Not in .env, not in server.py. No code path exists to enable seed. |

---

## 8. POS Profile Flow Verified

```
Frontend → POST /api/proxy/auth/login
  → Backend proxies to POS V1 common-login → gets token
  → Backend calls GET /api/v1/vendoremployee/profile (with Bearer token)
  → Extracts restaurants[0]: id, name, restaurant_type_flag, parent_restaurant_id
  → Enriches login response with POS context
  → Persists token→restaurant mapping in MongoDB token_sessions
  → Returns enriched response to frontend
  → Frontend useLoginContext extracts role, permissions, nav items
```

All steps verified operational for all 4 users.

---

## 9. Final Verdict

### `pos_migration_p1_qa_passed`

All 17 checks pass. POS API profile is the sole source of login context. MongoDB persistence confirmed. Frontend correctly derives roles and permissions from POS-sourced `restaurant_type_flag`. No seed fallback exists anywhere in the codebase.

---

*End of POS API Context Migration Phase 1 QA Report*
