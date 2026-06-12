# P30 — M0 Production Flow End-to-End Validation Report (UPDATED)
**Date:** 2026-06-13 (updated post-B1/B2 fix)  
**Restaurant:** 806 (german fluid) — master  
**Preprod API:** preprod.mygenie.online  
**Credentials:** manager@germanfluid.com / Qplazm@10  

---

## Executive Summary

| Area | Status | Notes |
|------|--------|-------|
| Ingredient creation | ✅ PASS | 33 new ingredients added (44 total) |
| Vendor creation | ✅ PASS | 2 fresh vendors created (Budget + Premium) |
| Dual-vendor GRN (different prices) | ✅ PASS | Same ingredients from 2 vendors at different price points |
| FEFO segment ordering | ✅ PASS | Segments sorted by expiry_date ascending |
| Segment reconciliation | ✅ PASS | All items: unsegmented_remainder = 0 |
| Sub-recipe BOM creation | ✅ PASS | 3 new sub-recipes + 1 existing (4 total) |
| Production run (single batch) | ✅ PASS | 4 runs completed with full cost tracing |
| FEFO deduction during production | ✅ PASS | Earliest-expiry segments consumed first |
| Production cost inheritance | ✅ PASS | Unit cost computed from consumed segment prices |
| FG segment creation | ✅ PASS | Each run creates 1 FG segment with batch/expiry |
| Production run audit trail | ✅ PASS | Full consumed_allocations with segment-level detail |
| Hierarchy creation | ✅ PASS | master→central×2, master→franchise, central→franchise |
| Child store login (B2 fix) | ✅ PASS | All stores login with corrected email format |
| Catalogue push | ✅ PASS | Ingredients, recipes, sub-recipes pushed to all children |
| Transfer reference code (B1 fix) | ✅ PASS | New format TRF-{masterId}-{year}-{seq} works |
| Request flow (franchise→master) | ✅ PASS | Transfer created, ref code generated |
| Full approval | ✅ PASS | Master can fully approve |
| Partial approval with segments | ✅ PASS | Line-level approval with hold/cancel |
| Cancel remainder | ✅ PASS | Held lines cancelled successfully |
| Amend request | ✅ PASS | Franchise amended qty before approval |
| Withdraw request | ✅ PASS | Terminal status, transfer withdrawn |
| Modification request | ✅ PASS | Child transfer created post-approval |
| Reject modification | ✅ PASS | Master rejected modification |
| Cross-central request | ✅ PASS | Franchise under CA requested from CB |
| Pending queues visibility | ✅ PASS | All stores see correct queues |
| **Dispatch (stock deduction)** | **❌ BLOCKED** | **UNIT_CONVERSION_NOT_DEFINED for all items** |
| **Receive at destination** | **❌ BLOCKED** | Blocked by dispatch failure |
| **Segment creation at destination** | **❌ BLOCKED** | Blocked by dispatch |
| **Cost flow through transfer** | **❌ BLOCKED** | Blocked by dispatch |
| Direct dispatch (initiate) | ❌ BLOCKED | source_selector.mode validation + unit conversion |
| Consumption report | ⏭️ DEFERRED | Per user: separate POS order test |

---

## 1. Hierarchy (FINAL)

```
806 (master: german fluid) ← manager@germanfluid.com
├── 807 (central: Central Kitchen Alpha) ← manager@centralkitchenalpha.com
│   └── 810 (franchise: Alpha Outlet One) ← manager@alphaoutletone.com
├── 808 (central: Central Kitchen Beta) ← manager@centralkitchenbeta.com
└── 809 (franchise: Outlet Direct One) ← manager@outletdirectone.com
```

All stores: Password `Qplazm@10`

**Operational Settings (806):**
- `production_enabled: true`
- `fefo_consumption_enabled: true`
- `allow_lateral_central_transfer: true`
- `allow_cross_central_franchise_dispatch: true`
- `allow_master_direct_franchise: true`
- `allow_negative_stock: true`

---

## 2. Vendors & Purchase Comparison

| Ingredient | ID | VA Price (₹/kg) | VA Expiry | VB Price (₹/kg) | VB Expiry | Ratio |
|-----------|-----|-----------|-----------|-----------|-----------|-------|
| Jaggery | 17632 | 100 | 2026-09-12 | 140 | 2026-12-12 | 1.40× |
| GSM | 17633 | 180 | 2026-09-12 | 250 | 2026-12-12 | 1.39× |
| Wheat Flour | 17634 | 70 | 2026-09-12 | 110 | 2026-12-12 | 1.57× |
| Elachi | 17637 | 1,400 | 2026-09-12 | 2,000 | 2026-12-12 | 1.43× |
| Egg Replacer | 17638 | 1,800 | 2026-09-12 | 2,500 | 2026-12-12 | 1.39× |
| Ragi Flour | 17676 | 80 | 2026-09-12 | 120 | 2026-12-12 | 1.50× |

**Key:** Vendor A (Budget, ID=235) is 30-57% cheaper than Vendor B (Premium, ID=236), with earlier expiry dates.

---

## 3. FEFO Verification (Post-Production)

### Jaggery Powder (17632) — 3 segments, FEFO order confirmed

| Seg ID | Batch | Expiry | Pre-Prod Qty | Post-Prod Qty | Consumed |
|--------|-------|--------|-------------|--------------|----------|
| 279 | JAGGERY-LOT-001 (UAT) | 2026-07-07 | 950 | 710 | 240 gm |
| 290 | VA-JAGG-001 | 2026-09-12 | 2000 | 2000 | 0 |
| 310 | VB-JAGG-001 | 2026-12-12 | 2000 | 2000 | 0 |

**FEFO confirmed:** All 240gm consumed from earliest-expiry batch (seg 279), VA/VB untouched. ✅

### Egg Replacer (17638) — Same pattern

| Seg ID | Batch | Expiry | Post-Prod Qty | Consumed |
|--------|-------|--------|--------------|----------|
| 285 | EGGREP-LOT-001 | 2026-07-07 | 240 | 8 gm |
| 296 | VA-EGG-001 | 2026-09-12 | 500 | 0 |
| 316 | VB-EGG-001 | 2026-12-12 | 500 | 0 |

---

## 4. Production Runs & Cost Analysis

| Run | Ref | Product | Qty | Unit Cost (₹) | Total (₹) | Top Cost Driver |
|-----|-----|---------|-----|-----------|-----------|----------------|
| 1 | PRD-0001 | Elachi Cookies (UAT) | 31 | 2.78 | 86.15 | Egg Replacer ₹10/2gm |
| 2 | PRD-0002 | Sesame Cookies | 21 | 1.64 | 34.53 | Egg Replacer ₹10 |
| 3 | PRD-0003 | Ragi Cookies | 31 | 1.37 | 42.37 | GSM ₹13.75 |
| 4 | PRD-0004 | Oats Cookies | 24 | 1.47 | 35.34 | Egg Replacer ₹10 |
| 5 | PRD-0005 | Elachi Cookies Batch 2 | 31 | 1.26 | 39.21 | GSM ₹12.50 |

### Cost Inheritance Evidence

**Run 2 (Sesame Cookies) — consumed_allocations audit:**
```
Jaggery: 65gm from seg 279 (LOT-001, exp 07-07) → line_cost ₹4.55 (₹70/kg)
GSM: 30gm from seg 280 (LOT-001, exp 07-07) → line_cost ₹3.75 (₹125/kg)
Wheat Flour: 45gm from seg 281 (LOT-001, exp 07-07) → line_cost ₹0.99 (₹22/kg)
White Till Powder: 20gm from seg 308 (VA, exp 09-12) → line_cost ₹8.00 (₹400/kg)
Sesame: 30gm from seg 309 (VA, exp 09-12) → line_cost ₹5.70 (₹190/kg)
```
**FEFO cost flow confirmed:** UAT lot (earliest expiry) consumed first, then Vendor A lot. Cost computed per segment's purchase price. ✅

---

## 5. Transfer Validation Results

### Transfer Lifecycle Matrix

| ID | Ref | Type | Status | From→To | Flow Tested |
|----|-----|------|--------|---------|------------|
| 207 | TRF-806-2026-0001 | request | approved | 806→809 | Request → Approve ✅ |
| 208 | TRF-806-2026-0002 | request | approved | 806→809 | Request → Approve ✅ |
| 209 | TRF-806-2026-0003 | request | partially_approved | 806→809 | Partial approve + cancel remainder ✅ |
| 210 | TRF-806-2026-0004 | request | approved | 806→809 | Request → Amend → Approve ✅ |
| 211 | TRF-806-2026-0005 | request | withdrawn | 806→809 | Request → Withdraw ✅ |
| 212 | TRF-806-2026-0006 | modification_request | rejected | 806→809 | Modification → Reject ✅ |
| 213 | TRF-806-2026-0007 | request | requested | 808→810 | Cross-central request ✅ |

### What Works ✅
- Request creation (franchise→master, franchise→cross-central)
- Full approval
- Partial approval with per-line segments + hold/cancel
- Cancel remainder on held lines
- Amend request (pre-approval qty change)
- Withdraw request (terminal status)
- Modification request (post-approval child transfer)
- Reject modification
- Cross-central request (franchise under CA → CB)
- Pending queues visible to all actors
- Reference code format `TRF-{masterId}-{year}-{seq}` ✅

### What's Blocked ❌

**UNIT_CONVERSION_NOT_DEFINED** blocks ALL dispatch operations:
- Direct dispatch (initiate from master) — also has source_selector mode validation issue
- Dispatch of approved requests
- Dispatch of partially approved requests

This error occurs for ALL unit types including `piece→piece` (same unit), proving it's not about kg→gm conversion but about **missing unit conversion table entries for restaurant 806**.

---

## 6. Critical Remaining Blocker

### B3: UNIT_CONVERSION_NOT_DEFINED (CRITICAL)

**Error:** `"error_code": "UNIT_CONVERSION_NOT_DEFINED"` on every dispatch attempt.

**Scope:** ALL dispatch operations for restaurant 806 — direct dispatch (initiate), request dispatch, partial dispatch.

**Evidence:**
- piece→piece dispatch fails (transfer 208, Elachi Cookies)
- kg→gm dispatch fails (transfer 207, Jaggery 0.5kg)
- Empty body dispatch fails (transfer 209)

**Root Cause (hypothesis):** Restaurant 806 was created via POS admin/bootstrap. The unit conversion table (`unit_conversions` or equivalent) has no entries for this restaurant. The `add-inventory` API creates items with unit metadata but does NOT populate the conversion table.

**Fix required:** POS backend must either:
1. Auto-populate unit conversion entries when restaurant is created
2. Auto-populate when inventory items are added
3. Handle missing conversions gracefully (e.g., 1:1 for same-unit transfers)

### B4: Direct Dispatch source_selector.mode validation

**Error:** `"The selected items.0.source_selector.mode is invalid."` for mode values: `segment_id`, `segment`, `auto`, `fefo`, `specific_segment`, `batch`, etc.

**Scope:** Only affects `initiate` endpoint (direct dispatch). Does NOT affect `request` endpoint.

**Note:** The frontend SourceSelector sends `{mode: "segment_id", segment_id: N}`. If the POS backend changed valid modes, the frontend needs updating too.

---

## 7. Cost Model Analysis

### Validated ✅

| Question | Answer |
|----------|--------|
| Which cost is consumed first for same ingredient at different prices? | **FEFO governs.** Earliest-expiry batch consumed first, carrying its purchase cost. |
| Does production inherit source batch cost? | **YES.** Full segment allocation audit with per-line costs. |
| Is multi-batch FG costing different? | **YES.** Run 1 (₹2.78/pc) vs Run 5 (₹1.26/pc) — same recipe, different source costs. |

### Cannot Validate ❌ (blocked by B3)

| Question | Why blocked |
|----------|------------|
| Does FG transfer preserve valuation? | Dispatch fails — no stock movement |
| Does receiving store preserve valuation? | No receive possible |
| Does FIFO/FEFO remain consistent after transfer? | No transfer completes |
| Does partial approval affect valuation? | Dispatch of partial fails |
| Direct dispatch vs request flow valuation? | Direct dispatch validation error + unit conversion |

---

## 8. Stores for Consumption Testing

| Store | RID | Login | FG Stock Available | Notes |
|-------|-----|-------|-------------------|-------|
| german fluid (master) | 806 | manager@germanfluid.com | Elachi 61pc, Sesame 21pc, Ragi 31pc, Oats 24pc | **Primary test store** |
| Outlet Direct One | 809 | manager@outletdirectone.com | 0 (transfers blocked) | Needs dispatch fix |
| Alpha Outlet One | 810 | manager@alphaoutletone.com | 0 (transfers blocked) | Needs dispatch fix |
| Central Kitchen Alpha | 807 | manager@centralkitchenalpha.com | 0 (no GRN done) | Can receive after fix |
| Central Kitchen Beta | 808 | manager@centralkitchenbeta.com | 0 (no GRN done) | Can receive after fix |

**For immediate consumption testing:** Use **RID 806** (master) which has all FG stock.

---

## 9. Production Readiness Recommendation

### ✅ Ready — No Blockers
- Ingredient catalogue CRUD
- Vendor GRN with batch/expiry/FEFO
- Sub-recipe BOM creation
- Production run execution with full cost tracing
- Hierarchy creation with catalogue push
- Transfer request lifecycle (create, approve, partial approve, amend, withdraw, modify, reject, cancel remainder)
- Cross-central request routing
- Pending queues per actor

### ❌ Not Ready — 1 Critical Blocker
- **B3: UNIT_CONVERSION_NOT_DEFINED** blocks all dispatch/stock movement
- This prevents: receive, segment creation at destination, transfer cost flow, FEFO continuity after transfer

### Recommendation
**DO NOT deploy transfer dispatch** until B3 is resolved. Production (manufacturing) is fully functional and can go live independently. Transfer request/approval lifecycle is complete but stock movement is blocked.

**Priority fix:** B3 (unit conversion) > B4 (initiate mode validation)

---

## Appendix: Entity ID Reference

```
RESTAURANTS:
  806 (master: german fluid)
  807 (central: Central Kitchen Alpha, parent=806)
  808 (central: Central Kitchen Beta, parent=806)
  809 (franchise: Outlet Direct One, parent=806)
  810 (franchise: Alpha Outlet One, parent=807)

VENDORS: 235 (Budget), 236 (Premium)
PURCHASE BILLS: 6016 (VA), 6017 (VB)

SUB-RECIPES:
  187 → FG 17642 (Elachi Cookies, 31pc)
  191 → FG 17709 (Sesame Cookies, 21pc)
  192 → FG 17710 (Ragi Cookies, 31pc)
  193 → FG 17711 (Oats Cookies, 24pc)

PRODUCTION RUNS: 1-5 (PRD-2026-0001 through PRD-2026-0005)
FG SEGMENTS: 288, 330, 331, 332, 333

TRANSFERS:
  207 (request, approved, 806→809)
  208 (request, approved, 806→809)
  209 (request, partially_approved, 806→809)
  210 (request, approved, 806→809, amended)
  211 (request, withdrawn, 806→809)
  212 (modification_request, rejected, 806→809)
  213 (request, requested, 808→810, cross-central)
```
