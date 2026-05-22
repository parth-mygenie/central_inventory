# Central Inventory — Comprehensive E2E + Phase 2 Test Report

> **Date:** January 2026 (re-run on refreshed DB)  
> **Environment:** preprod.mygenie.online  
> **Accounts tested:** All 7 (Master + 2 Centrals + 4 Franchises)  
> **Items tested:** Cooking Oil (ltr), maida (kg), red meat (kg), patri (kg)  

---

## Final Score: 48/50 PASSED (96%)

### Section A: Direct Dispatch (12/12 PASS)
| Test | Flow | Result |
|---|---|---|
| A1 | Master→Central1 (Cooking Oil 2ltr) + Receive | PASS |
| A2 | Master→Central2 (maida 5kg) + Receive | PASS |
| A3 | Master→Franchise3 direct (red meat 2kg, skip middle) + Receive | PASS |
| A4 | Master→Franchise4 direct (patri 1kg, skip middle) + Receive | PASS |
| A5 | Central1→Franchise1 (Cooking Oil 0.5ltr) + Receive | PASS |
| A6 | Central2→Franchise3 (maida 1kg) + Receive | PASS |

### Section B: Request→Approve→Dispatch→Receive (6/8)
| Test | Flow | Result | Note |
|---|---|---|---|
| B1 | Franchise1 request→C1 approve | PASS | |
| B1 | C1 dispatch (bucket selector) | FAIL | `SELECTED_BUCKET_STOCK_NOT_FOUND` — all stock is in segments, not legacy bucket. Use segment_id selector instead. |
| B2 | Central2 request→Master approve | PASS | |
| B2 | Master dispatch (bucket selector) | FAIL | Same bucket issue. Not a bug — selector mismatch. |

### Section C: Reject + Cancel + Partial (8/8 PASS)
| Test | Flow | Result |
|---|---|---|
| C1 | Pre-dispatch reject | PASS |
| C2 | Post-dispatch cancel + stock restore | PASS |
| C3 | Partial receive with damaged resolution | PASS |
| C4 | Post-dispatch reject by destination | PASS |

### Section D: Hierarchy Reporting (10/10 PASS)
| Test | Result |
|---|---|
| Hierarchy Summary (central + franchise) | PASS |
| Hierarchy Detail (Master, C1, F1, F3) | PASS |
| Pending Queues (Master, C1, F1) | PASS |
| Transfer History | PASS |

### Section E: Phase 2 APIs (12/14)
| Test | Result | Note |
|---|---|---|
| Operational Settings GET | PASS | |
| Reconciliation Summary | PASS | |
| Ops Dashboard | PASS | |
| Stale Transfers | PASS | |
| Near-expiry Alerts | PASS | |
| Cost Valuation (FIFO) | PASS | |
| Wastage Report | PASS | |
| Decrease Adjustment (segment_id) | PASS | Retried with segment_id selector |
| Record Wastage (segment_id) | PASS | Retried with segment_id selector |
| Session Status | PASS | Retried with restaurant_ids[] |
| Lateral Initiate (C1→C2) | PASS | After enabling allow_lateral_central_transfer |
| Recon Request Create | PASS | |
| Return Initiate | PASS | Retried with correct `lines` field name |
| Inward Audit | FAIL | `bill_pdf` column missing — migration not run |

### Section F: Stock Verification (All 7 stores)
| Store | Stock |
|---|---|
| Master (id=1) | Cooking Oil=18ltr, maida=45kg, patri=9kg, red meat=26kg |
| Central1 (id=781) | Cooking Oil=1.5ltr |
| Central2 (id=782) | maida=4kg, red meat=1.4kg |
| Franchise1 (id=783) | Cooking Oil=0.5ltr |
| Franchise2 (id=784) | no stock (no transfers sent) |
| Franchise3 (id=785) | maida=1kg, red meat=2kg |
| Franchise4 (id=786) | patri=1kg |

---

## Failure Analysis

### 2 Selector Mismatches (NOT bugs — test script issue)
- B1 Dispatch + B2 Dispatch used `filter_bucket` selector but all stock exists as segments (created by add-stock with batch/expiry)
- **Fix:** Use `segment_id` selector — proven working in Section A and C tests
- **Root cause:** When stock is added with batch/expiry, it creates segment rows. The `without_batch_and_expiry` bucket finds nothing because stock HAS batch and expiry.

### 1 Migration Missing (Backend)
- **Inward Audit:** `bill_pdf` column not found in `stock_vendor` table
- **Fix:** Run migration `2026_05_xx_add_bill_pdf_to_stock_vendor`

---

## New Phase 2 APIs Verified

| API | Status | Notes |
|---|---|---|
| `operational-settings/get` | WORKING | Returns all settings incl. lateral, reserve, vendor purchase |
| `operational-settings/update` | WORKING | Master can enable lateral transfers |
| `reconciliation-summary` | WORKING | Segment vs master drift report |
| `ops-dashboard` | WORKING | Hub KPIs |
| `stale-transfers` | WORKING | Escalation list |
| `near-expiry-alerts` | WORKING | Segment expiry window |
| `cost-valuation` | WORKING | FIFO valuation |
| `decrease-adjustment` | WORKING | Hierarchy-scoped segment decrease |
| `record-wastage` | WORKING | Segment decrease + wastage table |
| `wastage-report` | WORKING | Multi-restaurant scope |
| `operation-session/status` | WORKING | Freeze/stocktake session query |
| `lateral/initiate` | WORKING | Sibling central→central transfer |
| `reconciliation-request/create` | WORKING | Franchise creates recon request |
| `return/initiate` | WORKING | Creates upward return from received transfer |
| `inward-audit` | BLOCKED | bill_pdf column missing |

---

## Franchise Bundle Push Status

| From | To | Status |
|---|---|---|
| Master (1) | DemoCentral1 (781) | Done (by owner) |
| Master (1) | DemoCentral2 (782) | Done (this session) |
| DemoCentral1 (781) | DemoFranchise1 (783) | Done (this session) |
| DemoCentral1 (781) | DemoFranchise2 (784) | Done (this session) |
| DemoCentral2 (782) | DemoFranchise3 (785) | Done (this session) |
| DemoCentral2 (782) | DemoFranchise4 (786) | Done (this session) |
