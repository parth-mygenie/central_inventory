# Central Inventory — Comprehensive E2E + Phase 2 Test Report

> **Date:** January 2026 (final run on refreshed DB, all migrations applied)  
> **Environment:** preprod.mygenie.online  
> **Accounts tested:** All 7 (Master + 2 Centrals + 4 Franchises)  
> **Items tested:** Cooking Oil (ltr), maida (kg), red meat (kg), patri (kg)  
> **Test script:** `e2e_final_test.py` (same folder)  

---

## Final Score: 52/52 PASSED (100%)

---

### Section A: Direct Dispatch (12/12 PASS)
| Test | Flow | Result |
|---|---|---|
| A1 | Master→Central1 (Cooking Oil 2ltr) + Receive | PASS |
| A2 | Master→Central2 (maida 5kg) + Receive | PASS |
| A3 | Master→Franchise3 direct (red meat 2kg, skip middle) + Receive | PASS |
| A4 | Master→Franchise4 direct (patri 1kg, skip middle) + Receive | PASS |
| A5 | Central1→Franchise1 (Cooking Oil 0.5ltr) + Receive | PASS |
| A6 | Central2→Franchise3 (maida 1kg) + Receive | PASS |

### Section B: Request→Approve→Dispatch→Receive (8/8 PASS)
| Test | Flow | Result |
|---|---|---|
| B1 | Franchise1→Central1 request→approve→dispatch→receive (Oil 0.3ltr) | PASS |
| B2 | Central2→Master request→approve→dispatch→receive (Oil 1ltr) | PASS |

### Section C: Reject + Cancel + Partial Receive (8/8 PASS)
| Test | Flow | Result |
|---|---|---|
| C1 | Pre-dispatch reject (F3→C2 request, C2 rejects) | PASS |
| C2 | Post-dispatch cancel + stock restore (Master cancels) | PASS |
| C3 | Partial receive with damaged resolution (70% accept, 30% damaged) | PASS |
| C4 | Post-dispatch reject by destination (F1 refuses delivery) | PASS |

### Section D: Hierarchy Reporting + Queues (10/10 PASS)
| Test | Result |
|---|---|
| Hierarchy Summary (central stores) | PASS |
| Hierarchy Summary (franchise stores) | PASS |
| Hierarchy Detail — Master (id=1) | PASS |
| Hierarchy Detail — Central1 (id=781) | PASS |
| Hierarchy Detail — Franchise1 (id=783) | PASS |
| Hierarchy Detail — Franchise3 (id=785) | PASS |
| Pending Queues — Master | PASS |
| Pending Queues — Central1 | PASS |
| Pending Queues — Franchise1 | PASS |
| Transfer History — Master | PASS |

### Section E: Phase 2 Ops APIs (14/14 PASS)
| Test | Result | Notes |
|---|---|---|
| Operational Settings GET | PASS | Returns all P0–P11 settings |
| Reconciliation Summary | PASS | Segment vs master drift |
| Ops Dashboard | PASS | Hub KPIs |
| Stale Transfers | PASS | Escalation list |
| Near-expiry Alerts | PASS | Segment expiry window |
| Cost Valuation (FIFO) | PASS | |
| Wastage Report | PASS | Multi-restaurant scope |
| Decrease Adjustment | PASS | segment_id selector |
| Record Wastage | PASS | segment_id selector |
| Session Status | PASS | restaurant_ids[] param |
| Lateral Transfer (C1→C2) | PASS | After enabling allow_lateral_central_transfer |
| Reconciliation Request Create | PASS | |
| Return Initiate | PASS | `lines` field, correct line_id from details |
| Inward Audit | PASS | Destination token, bill_pdf migration applied |

### Section F: Stock Verification (All 7 stores)
| Store | Stock After All Tests |
|---|---|
| Master (id=1) | Cooking Oil=24.8ltr, maida=59.8kg, patri=13kg, red meat=32kg |
| Central1 (id=781) | Cooking Oil=2.7ltr |
| Central2 (id=782) | Cooking Oil=1ltr, maida=8kg, red meat=2.8kg |
| Franchise1 (id=783) | Cooking Oil=1.3ltr |
| Franchise2 (id=784) | no stock (no transfers sent to this store) |
| Franchise3 (id=785) | maida=2kg, red meat=4kg |
| Franchise4 (id=786) | patri=2kg |

---

## Key Fixes Applied in Final Script (vs earlier 48/50 version)

| Issue | Root Cause | Fix |
|---|---|---|
| B1+B2 Dispatch failed | Used `filter_bucket` selector but stock only exists as segments (created with batch/expiry) | Changed to `segment_id` selector from source-options |
| Decrease Adj + Record Wastage failed | Same bucket selector issue | Changed to `segment_id` selector |
| Session Status failed | Sent `restaurant_id` (singular) | Changed to `restaurant_ids[]` (array) |
| Lateral Initiate failed | `allow_lateral_central_transfer` was false | Enabled setting before test |
| Return Initiate failed | Used `return_lines` field name | Changed to `lines` per actual API contract |
| Inward Audit failed | Used Master token (source) | Changed to Central1 token (destination — only destination can audit) |
| Inward Audit SQL error | `bill_pdf` column missing | Owner ran migration — now working |

---

## Franchise Bundle Push Status

| From | To | Status |
|---|---|---|
| Master (1) | DemoCentral1 (781) | Done (by owner) |
| Master (1) | DemoCentral2 (782) | Done |
| DemoCentral1 (781) | DemoFranchise1 (783) | Done |
| DemoCentral1 (781) | DemoFranchise2 (784) | Done |
| DemoCentral2 (782) | DemoFranchise3 (785) | Done |
| DemoCentral2 (782) | DemoFranchise4 (786) | Done |

---

## How to Re-run

```bash
python3 /app/memory/central_inventory/api_evidence/e2e_final_test.py
```

Seeds fresh stock, runs all 52 tests, prints pass/fail summary.
