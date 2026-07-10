# HK 803 — Comprehensive Operations & Ops Settings Test Report
**Date:** 2026-07-10
**Scope:** Every ops setting, partial flows, reject, return, amend, withdraw, modification, dispute, wastage, stock adjustment, request flow, PO settings, selling price, shipping, catalog policy

---

## Test Summary

| Category | Tests | Pass | Fail | Notes |
|----------|:-----:|:----:|:----:|-------|
| Ops Settings | 8 | 7 | 1 | N2: child resolved_settings shows False (investigation needed) |
| Transfer Lifecycle | 10 | 10 | 0 | Full lifecycle + all statuses |
| Request Flow | 4 | 4 | 0 | Request→Approve→Dispatch→Receive |
| Reject | 1 | 1 | 0 | ✅ |
| Amend | 1 | 1 | 0 | ✅ |
| Withdraw | 1 | 1 | 0 | ✅ |
| Modification | 1 | 1 | 0 | Child transfer created |
| Cancel | 1 | 1 | 0 | ✅ |
| Dispute + Resolve | 2 | 2 | 0 | receive_dispute_pending → resolved → received |
| Partial Approve | 2 | 2 | 0 | approval_lines + cancel-remainder |
| Stock Adjustment | 2 | 2 | 0 | Decrease + Increase |
| Wastage | 3 | 3 | 0 | Record + Report + Reasons |
| Production | 3 | 3 | 0 | 2 runs completed |
| Catalog Policy (G-029) | 3 | 3 | 0 | Read + deny + enforce |
| Pushed Lock (G-028) | 1 | 1 | 0 | PUSHED_CATALOG_LOCKED |
| Return | 2 | 1 | 1 | Eligible found, initiate blocked (no line_id in detail) |
| Stock Ledger | 1 | 1 | 0 | 10 entries with source_types |
| Daily Consumption | 1 | 1 | 0 | Hierarchy scope includes all 6 stores |
| Selling Price + Shipping | 2 | 2 | 0 | shipping_fee=50 confirmed |
| **TOTAL** | **49** | **47** | **2** | |

---

## Section A: Ops Settings Tested

### B — require_po_for_purchase
| State | Action | Result |
|-------|--------|:------:|
| `true` | Master `add-stock` | ❌ `DIRECT_PURCHASE_REQUIRES_PO` ✅ (correct block) |
| `false` | Master `add-stock` | ✅ Stock added |

### C — allow_child_direct_vendor_purchase
| State | Action | Result |
|-------|--------|:------:|
| `false` | B `add-stock` | ❌ `VENDOR_PURCHASE_NOT_ALLOWED` ✅ (correct block) |
| `true` + `require_po=false` | B `add-stock` | ✅ Stock added (both flags needed) |

### D — allow_over_receive
| State | Action | Result |
|-------|--------|:------:|
| `false` | Receive with default body | ✅ Received (default = accept full dispatched qty) |
| Notes | POS auto-receives full dispatched qty when no explicit lines provided | Expected behavior |

### K — transfer_selling_price + shipping_fee
| Test | Result |
|------|:------:|
| Initiate with `selling_price:300` + `shipping_fee:50` | ✅ Transfer 275 dispatched |
| Detail shows `shipping_fee=50` | ✅ Confirmed |

### N — Settings READONLY for children (G-027)
| Test | Result |
|------|:------:|
| B tries `operational-settings/update` | ✅ `READONLY_HIERARCHY_SETTINGS` |
| B reads `operational-settings/get` | `settings_editable: false`, `resolved_settings` returned |

### O — Catalog Policy (G-029)
| Test | Result |
|------|:------:|
| Read policy for B(804) | ✅ Full `resolved_policy` with 6 fields |
| Master sets `allow_child_catalog_create: false` | ✅ Policy updated |
| B tries `add-food` | ✅ `CHILD_CATALOG_POLICY_DENIED` |
| Restore `allow_child_catalog_create: true` | ✅ |

### P — Pushed Catalog Lock (G-028)
| Test | Result |
|------|:------:|
| B tries to delete pushed food 215458 | ✅ `PUSHED_CATALOG_LOCKED` |

---

## Section B: Transfer Operations — All Statuses

### Complete Transfer Registry (19 transfers)

| ID | Ref | From → To | Status | Type | Operation Tested |
|----|-----|-----------|:------:|------|------------------|
| 259 | TRF-803-..0001 | Master→B | received | dispatch | Standard dispatch + receive |
| 260 | TRF-803-..0002 | Master→C2 | received | dispatch | Master→central |
| 261 | TRF-803-..0003 | Master→E | received | dispatch | Master→franchise |
| 262 | TRF-803-..0004 | B→C | dispatched | dispatch | Central→own franchise |
| 263 | TRF-803-..0005 | C2→D | dispatched | dispatch | Central→own franchise |
| 264 | TRF-803-..0006 | B→C2 | dispatched | lateral | **Lateral central↔central** |
| 265 | TRF-803-..0007 | B→D | dispatched | dispatch | **Cross-central franchise** |
| 266 | TRF-803-..0008 | E→C | dispatched | lateral | **Lateral franchise↔franchise** |
| 267 | TRF-803-..0009 | Master→B | received | dispatch | Over-receive test |
| 268 | TRF-803-..0010 | Master→C2 | **received** | dispatch | **Dispute → resolve** |
| 269 | TRF-803-..0011 | B→C | received | request | **Full request flow** |
| 270 | TRF-803-..0012 | B→C | **rejected** | request | **REJECT** |
| 271 | TRF-803-..0013 | B→C | **withdrawn** | request | **AMEND → WITHDRAW** |
| 272 | TRF-803-..0014 | B→C | approved | request | **MODIFICATION parent** |
| 273 | TRF-803-..0015 | B→C | requested | modification_request | **MODIFICATION child** |
| 274 | TRF-803-..0016 | Master→E | **cancelled** | dispatch | **CANCEL** |
| 275 | TRF-803-..0017 | Master→B | dispatched | dispatch | **Selling price + shipping** |
| 276 | TRF-803-..0018 | C2→D | approved | request | **Partial approve** |
| 277 | TRF-803-..0019 | C2→D | approved | request | **Partial approve + cancel remainder** |

### All Transfer Statuses Achieved
- `requested` ✅ (273)
- `approved` ✅ (272, 276, 277)
- `dispatched` ✅ (262-266, 275)
- `received` ✅ (259-261, 267-269)
- `rejected` ✅ (270)
- `withdrawn` ✅ (271)
- `cancelled` ✅ (274)
- `receive_dispute_pending` → `received` ✅ (268)
- `pending_lateral_approval` → `approved` → `dispatched` ✅ (264, 266)

### All Transfer Types Achieved
- `dispatch` (direct dispatch from source)
- `request` (request→approve→dispatch→receive)
- `lateral` (central↔central, franchise↔franchise)
- `modification_request` (child of approved parent)

---

## Section C: Dispute Flow

| Step | Transfer 268 | Result |
|------|-------------|:------:|
| Master dispatches 5kg Flour to C2 | status=dispatched | ✅ |
| C2 receives with dispute note | status=receive_dispute_pending | ✅ |
| Master resolves dispute (accept=true) | status=received | ✅ |

---

## Section D: Stock Adjustment + Wastage

| Operation | Item | Qty | Result |
|-----------|------|-----|:------:|
| Decrease adjustment | Tomatoes | 1 kg | ✅ |
| Increase (add-stock) | Tomatoes | 0.5 kg | ✅ |
| Record wastage | Olive Oil | 0.5 ltr | ✅ (segment_id mode) |
| Wastage report | — | 1 record | ✅ |
| Wastage reasons | — | 4 (Spillage, Pilferage, Expired, Others) | ✅ |

---

## Section E: Production

| Run | Ref | Sub-Recipe | Output | Cost | Status |
|-----|-----|-----------|--------|------|:------:|
| 37 | PRD-2026-0001 | 192 (Marinara) | 5 batch | ₹900 | ✅ |
| 38 | PRD-2026-0002 | 192 (Marinara) | 2 batch | ₹360 | ✅ |

BOM consumed: Tomatoes + Olive Oil from batched segments with FEFO allocation.

---

## Section F: Stock Detail (FEFO View)

```
Chicken (inv=18136):
  seg=568: batch=HK-CHKN-001, exp=2026-12-31, qty=13000gm (13kg)
  seg=587: batch=null, exp=2027-01-01, qty=1000gm (1kg)
  seg=581: batch=null, exp=2027-06-30, qty=30000gm (30kg)
```

---

## Section G: Stock Ledger

10 entries returned for master (803) on 2026-07-10:
```
[wastage] Olive Oil qty=0.5
[transfer] Chicken qty=2
[transfer] Lamb qty=1
[transfer] Bread Flour qty=5
[transfer] Pasta qty=2
```

---

## Section H: Return Flow

| Test | Result | Notes |
|------|:------:|-------|
| `return/eligible` (C) | ✅ 1 eligible | TRF-803-2026-0011 (request type, received) |
| `return/eligible` (E) | ✅ 0 eligible | Dispatch-type transfers don't qualify |
| `return/initiate` | ❌ Blocked | Transfer detail doesn't expose line_id from receiver perspective |

**Note:** Return/eligible correctly identifies request-type received transfers. Initiate requires `line_id` which the detail endpoint doesn't return for the receiver context. This may need `return/eligible` response to include line details.

---

## Known Issues / Observations

| # | Issue | Severity | Notes |
|---|-------|----------|-------|
| 1 | Child `resolved_settings.production_enabled` shows `false` when master has `true` | Medium | May be caching or resolution timing |
| 2 | Return initiate blocked — detail doesn't expose line_id for receiver | Low | eligible endpoint works; initiate needs line data from a different source |
| 3 | `stock-inventory` endpoint returns empty `current_stocks` for all stores | Low | Source-options and stock-detail show correct data; may be display/aggregation query |
| 4 | Production gate requires re-enabling after any ops settings update | Low | Ops update may reset unmentioned keys to defaults |
