# Central Inventory POS API Context Migration Handoff

> **Date:** 24 May 2026
> **From:** Senior Central Inventory POS API Source-of-Truth Verification Agent
> **Priority:** Production-readiness (NOT Slice 5 blocker)

---

## 1. Verification Report Path

`/app/memory/central_inventory/CENTRAL_INVENTORY_POS_API_SOURCE_OF_TRUTH_VERIFICATION_REPORT.md`

---

## 2. Current Architecture Finding

| Component | Current Source | Target Source |
|---|---|---|
| Authentication (token) | POS API | POS API (no change) |
| restaurant_type_flag | seed_data.RESTAURANTS | POS API profile |
| restaurant_id | seed_data.EMAIL_RESTAURANT_MAP | POS API profile |
| restaurant_name | seed_data.RESTAURANTS | POS API profile |
| Hierarchy | seed_data.get_hierarchy_detail() | POS API hierarchy endpoints |
| Transfers | seed_data.TRANSFERS | POS API transfer endpoints |
| Queues | seed_data.get_pending_queues() | POS API queue endpoints |
| History | seed_data.get_transfer_history() | POS API history endpoints |
| Stock levels | seed_data._stock_for_store() (random) | POS API stock endpoints |
| Inventory items | seed_data.INVENTORY_ITEMS | POS API inventory endpoints |

---

## 3. Recommended Migration Strategy

**Strategy C — POS API source-of-truth migration for real users, seed only for demo/dev**

Phase A: Document seed dependency (NOW — non-blocking)
Phase B: Investigate POS API profile endpoint (NEXT — discovery)
Phase C: Replace EMAIL_RESTAURANT_MAP with POS API for real users (REQUIRED for production)
Phase D: Migrate inventory/transfer endpoints to POS API (REQUIRED for production)
Phase E: QA with real multi-user accounts (REQUIRED for production)

---

## 4. Files Likely Affected

| File | Current Role | Migration Change |
|---|---|---|
| `/app/backend/seed_data.py` | Source of ALL restaurant/inventory data | Gate as demo-only; bypass for real users |
| `/app/backend/server.py` | Proxy with seed enrichment | Add POS API profile call; conditional seed bypass |
| `/app/frontend/src/hooks/useLoginContext.js` | Context derivation from proxy response | No change needed if proxy returns correct data |
| `/app/frontend/src/services/api.js` | API client | No change needed |

---

## 5. Required POS API Fields

The proxy currently enriches with these fields from seed data. A POS API profile/context endpoint must provide equivalent fields:

| Field | Example Value | Purpose |
|---|---|---|
| `restaurant_type_flag` | `"master"`, `"central"`, `"franchise"` | Role/hierarchy level determination |
| `restaurant_id` | `1`, `781`, `783` | Restaurant scoping for all data |
| `restaurant_name` | `"My Genie"`, `"DemoCentral1"` | Display in header/context |
| `parent_restaurant_id` | `null`, `1`, `781` | Hierarchy relationship (optional — may be derived from hierarchy endpoint) |

---

## 6. Fallback Rules

| Scenario | Behavior |
|---|---|
| POS API returns restaurant context | Use POS API data; skip seed enrichment |
| POS API does NOT return restaurant context | Check EMAIL_RESTAURANT_MAP as demo fallback |
| Email in EMAIL_RESTAURANT_MAP + is_demo flag | Use seed data (demo mode) |
| Email NOT in any source | Fail closed — "Store type unavailable" (P1 hardening) |

---

## 7. Demo/Dev Seed Rules

| Rule | Description |
|---|---|
| Keep seed_data.py for demo | Demo accounts (owner@demo*.com) continue to use seed |
| Gate with flag | Add `IS_DEMO_MODE` env var or check email domain |
| Real users bypass seed | Emails not in demo list use POS API only |
| Clear documentation | Comment all seed functions as "demo/dev only" |

---

## 8. QA Plan

| # | Test | Method |
|---|---|---|
| 1 | Real user login → POS API provides context | curl |
| 2 | Demo user login → seed provides context | curl |
| 3 | Unknown user → fail closed | curl |
| 4 | POS API down → graceful error | curl |
| 5 | Multi-user same restaurant → correct context | browser |
| 6 | Role regression across all 3 levels | browser |

---

## 9. Recommended Next Agent

**Immediate:** `Central Inventory Login Context Collision Fix QA Agent` (complete current fix QA)

**After Slice 5 closure:** `Central Inventory POS API Context Migration Planning Agent` (plan production migration)

---

*End of Migration Handoff*
