# Central Inventory Seed Shutdown Implementation Report

> **Date:** 25 May 2026
> **Agent:** Senior Central Inventory Seed Shutdown Implementation Agent
> **Scope:** Seed shutdown — remove all seed data from real Central Inventory flows

---

## 1. Implementation Status

### `seed_shutdown_complete_ready_for_qa`

All 10 seed dependencies (8 backend + 2 frontend) removed/fixed. `seed_data.py` no longer imported. 5 dedicated seed-backed handlers removed. Generic V2 proxy now handles all previously-seed-backed endpoints, forwarding to real POS API. Frontend hardcoded IDs replaced with dynamic POS-derived values. Zero seed fallback in real flows.

---

## 2. Inputs Reviewed

| # | Input | Reviewed |
|---|-------|----------|
| 1 | PRD.md | YES |
| 2 | Seed Dependency Audit & Shutdown Plan | YES |
| 3 | Seed Shutdown Implementation Handoff | YES |
| 4 | POS API Context Migration Phase 1 Report | YES |
| 5 | `/app/backend/server.py` (pre-shutdown) | YES |
| 6 | `/app/frontend/src/components/central-inventory/RequestStockForm.jsx` (pre-shutdown) | YES |
| 7 | `/app/frontend/src/hooks/useLoginContext.js` | YES |

**Total: 7 inputs reviewed**

---

## 3. Owner Decision Applied

No seed data from local DB, Mongo seed, or `seed_data.py` is allowed as source of truth for real Central Inventory flows. Seed gate turned off forever.

---

## 4. Files Changed

| File | New/Modified | Change | Seed Dependency Removed |
|---|---|---|---|
| `/app/backend/server.py` | Modified (rewritten) | Removed `import seed_data`, `SEED_FALLBACK_ENABLED`, seed fallback block, `_get_actor_restaurant`, and 5 seed-backed handlers | SD-01 thru SD-08 |
| `/app/frontend/src/components/central-inventory/RequestStockForm.jsx` | Modified | Replaced hardcoded restaurant IDs with dynamic `parent_restaurant_id` from login context | FD-01, FD-02 |
| `/app/frontend/src/hooks/useLoginContext.js` | Modified | Added explicit `parent_restaurant_id` extraction to user object | Supports FD-01/FD-02 fix |

**Total: 3 files changed**

---

## 5. Seed Dependencies Removed

| ID | File | Old Seed Behavior | New Behavior | Verified |
|---|---|---|---|---|
| SD-01 | server.py | `import seed_data` at module level | Removed entirely | YES — grep confirms 0 references |
| SD-02 | server.py | `SEED_FALLBACK_ENABLED` + login seed fallback block | Removed entirely — no seed fallback | YES |
| SD-03 | server.py | `proxy_hierarchy_summary` — seed merge with POS | Removed — generic proxy forwards to real POS API (returns 4 stores) | YES — curl verified |
| SD-04 | server.py | `proxy_hierarchy_detail` — 100% seed | Removed — generic proxy forwards to real POS API (returns real stock) | YES — curl verified |
| SD-05 | server.py | `proxy_pending_queues` — 100% seed | Removed — generic proxy forwards to real POS API (returns real queues) | YES — curl verified |
| SD-06 | server.py | `proxy_transfer_detail` — seed-first | Removed — generic proxy forwards to real POS API | YES — curl verified |
| SD-07 | server.py | `proxy_transfer_history` — 100% seed | Removed — generic proxy forwards to real POS API (returns 16 real transfers) | YES — curl verified |
| SD-08 | server.py | `_get_actor_restaurant` — in-memory/MongoDB lookup for seed endpoints | Removed — no seed endpoints exist | YES |
| FD-01 | RequestStockForm.jsx | `restaurant_id: 1, restaurant_name: "My Genie"` hardcoded | Dynamic: uses `parent_restaurant_id` from login context + hierarchy API lookup | YES |
| FD-02 | RequestStockForm.jsx | `restaurant_id: 781, restaurant_name: "Parent Store"` hardcoded | Dynamic: uses `parentRid` from login context, fail-closed if unavailable | YES |

---

## 6. Dedicated Handler Removal

| Handler | Route | Was Seed-Backed | Now Handled By | POS API Verified |
|---|---|---|---|---|
| `proxy_hierarchy_summary` | `POST /proxy/v2/inventory-transfer/hierarchy-summary` | YES | Generic V2 proxy → POS API | YES (4 franchise stores returned) |
| `proxy_hierarchy_detail` | `POST /proxy/v2/inventory-transfer/hierarchy-detail` | YES | Generic V2 proxy → POS API | YES (6 restaurants, 4 stock items) |
| `proxy_pending_queues` | `POST /proxy/v2/inventory-transfer/pending-queues` | YES | Generic V2 proxy → POS API | YES (real queue counts) |
| `proxy_transfer_detail` | `GET /proxy/v2/inventory-transfer/details/{id}` | YES | Generic V2 proxy → POS API | YES (transfer #52 found) |
| `proxy_transfer_history` | `POST /proxy/v2/inventory-transfer/history` | YES | Generic V2 proxy → POS API | YES (16 real transfers) |

---

## 7. Seed Fallback Shutdown

| Item | Status |
|---|---|
| `SEED_FALLBACK_ENABLED` | **Removed** from code |
| `import seed_data` | **Removed** from code |
| Seed fallback in login | **Removed** — only POS profile |
| Seed fallback in any endpoint | **None** — all removed |
| Can seed be enabled in real flow? | **No** — no code path exists |
| Missing real API behavior | **Fail closed** — POS API error returned directly; frontend existing error/retry states handle it |

---

## 8. Frontend Hardcoded Values Fixed

| File | Old Value | New Behavior | Verified |
|---|---|---|---|
| RequestStockForm.jsx line 40 | `{ restaurant_id: 1, restaurant_name: "My Genie", restaurant_type: "master" }` | Dynamic: uses `user.parent_restaurant_id` from login context + hierarchy stores lookup | YES — no hardcoded ID |
| RequestStockForm.jsx line 49 | `{ restaurant_id: 781, restaurant_name: "Parent Store", restaurant_type: "central" }` | Dynamic: uses `parentRid` from login context; `null` (fail-closed) if unavailable | YES — no hardcoded ID |
| useLoginContext.js line 108 | `parent_restaurant_id` not explicitly captured | Added: `parent_restaurant_id` extracted from login response | YES |

---

## 9. POS Profile Context Preserved

Phase 1 POS profile call is preserved and working:
- Login → POS API token → `GET /api/v1/vendoremployee/profile` → `restaurants[0]` extraction
- `restaurant_id`, `restaurant_name`, `restaurant_type_flag`, `parent_restaurant_id` all from POS profile
- Token session stored in MongoDB `token_sessions` collection
- Verified for abhishek@kalabahia.com: `rid=1, type=master`

---

## 10. Safe Verification Results

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Backend import | PASS | `python3 -c "import server"` — no errors |
| 2 | Backend starts | PASS | Supervisor: "Application startup complete" |
| 3 | No seed_data in server.py | PASS | `grep seed_data server.py` returns 0 matches |
| 4 | No SEED_FALLBACK in server.py | PASS | `grep SEED_FALLBACK server.py` returns 0 matches |
| 5 | Login POS profile context | PASS | abhishek: restaurant_type_flag=master, restaurant_id=1 |
| 6 | hierarchy-summary via generic proxy | PASS | 4 franchise stores from real POS API |
| 7 | hierarchy-detail via generic proxy | PASS | 6 restaurants, 4 stock items from real POS API |
| 8 | pending-queues via generic proxy | PASS | Real queue counts (0/0/0) from POS API |
| 9 | transfer/history via generic proxy | PASS | 16 real transfers from POS API |
| 10 | transfer/details/52 via generic proxy | PASS | Real transfer data from POS API |
| 11 | UI Operations Hub | PASS | Screenshot: real data (0 approvals, 1 dispatch, 0 receives) |
| 12 | Frontend compile | PASS | No errors in frontend logs |
| 13 | No seed fallback in logs | PASS | Only "POS profile context resolved" messages |
| 14 | No stock-changing APIs run | PASS | Only read operations |

---

## 11. No-Seed Runtime Confirmation

| Check | Status |
|---|---|
| `seed_data.py` not imported by server.py | **CONFIRMED** |
| `EMAIL_RESTAURANT_MAP` not used | **CONFIRMED** |
| `RESTAURANTS` not used | **CONFIRMED** |
| Mongo seed/demo collections not used | **CONFIRMED** |
| Frontend hardcoded IDs removed | **CONFIRMED** |
| All data from real POS API | **CONFIRMED** |

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

---

## 13. Known Notes / Risks

| Note | Details |
|---|---|
| `seed_data.py` file still exists | Not imported or used; kept as reference only. Can be deleted separately. |
| POS API may return empty data | Frontend handles empty states with existing UI patterns (empty lists, 0 counts). This is honest behavior — not a bug. |
| Transfer history shows 16 real transfers | Previously showed seed data with 12 fake transfers. Now shows actual POS data. |
| Pending queues may show 0 | Real data — no pending items exist in preprod. Previously showed fake counts. |
| `parent_restaurant_id` for franchise users | Verified available from POS profile. Used dynamically in RequestStockForm. |

---

## 14. QA Readiness

### QA can start: **YES**

All seed dependencies removed. All endpoints verified via curl. UI verified via screenshot. Frontend compiles. Backend runs. Zero seed references in runtime path.

---

## 15. Recommended Next Agent

### `Central Inventory Seed Shutdown QA Agent`

---

*End of Seed Shutdown Implementation Report*
