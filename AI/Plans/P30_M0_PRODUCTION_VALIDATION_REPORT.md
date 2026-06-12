# P30 — End-to-End Cost Flow & Transfer Validation (FINAL)
**Date:** 2026-06-13 (post-B3 SQL fix)  
**Restaurant:** 806 (german fluid)  

---

## Executive Summary — ALL FLOWS WORKING

| Flow | Status | Evidence |
|------|--------|---------|
| Vendor GRN → segments | ✅ | Bills 6016/6017, 20 items each |
| FEFO segment ordering | ✅ | Earliest expiry consumed first |
| Sub-recipe BOM creation | ✅ | 4 sub-recipes |
| Production run → FG segments | ✅ | 7 runs (PRD-0001 to PRD-0007) |
| FEFO cost inheritance | ✅ | Cheapest batch cost flows to FG |
| Direct dispatch (master→franchise) | ✅ | Transfer 219 |
| Direct dispatch (master→central) | ✅ | Transfer 220 |
| Central→franchise dispatch | ✅ | Transfer 221 |
| Partial approval → dispatch | ✅ | Transfer 222 |
| Receive at destination | ✅ | All transfers received |
| Segment creation at destination | ✅ | Batch/expiry preserved |
| 2-hop transfer chain | ✅ | Master→Central→Franchise |
| Request flow | ✅ | 7 requests across all statuses |
| Amend/Withdraw/Modify/Reject | ✅ | All lifecycle states |
| Cross-central request | ✅ | Transfer 213 |
| Cancel remainder | ✅ | Transfer 209 line 204 |

---

## 1. COMPLETE COST CHAIN

### Layer 1: Vendor → Purchase Cost

| Ingredient | Vendor A (Budget) ₹/kg | Vendor B (Premium) ₹/kg | FEFO order |
|-----------|----------------------|--------------------------|-----------|
| Jaggery | 100 | 140 | A first (exp 09-12) |
| GSM | 180 | 250 | A first |
| Wheat Flour | 70 | 110 | A first |
| Baking Powder | 100 | 150 | A first |
| Elachi | 1,400 | 2,000 | A first |
| Egg Replacer | 1,800 | 2,500 | A first |
| Ragi Flour | 80 | 120 | A first |

**Finding:** FEFO governs consumption order, NOT price. Cheapest batch happens to expire first in this setup, so cheapest cost flows first. If premium batch expired earlier, it would be consumed first regardless of price.

### Layer 2: Manufacture Cost (Production Run)

| Product | Run | Unit Cost (₹) | Total (₹) | Source Batch | Key Drivers |
|---------|-----|-----------|-----------|-------------|------------|
| Elachi Cookies (UAT) | PRD-0001 | 2.78 | 86.15 | UAT lot (exp 07-07) | Egg Replacer ₹10 |
| Sesame Cookies | PRD-0002 | 1.64 | 34.53 | UAT + VA lot | Egg Replacer ₹10 |
| Ragi Cookies | PRD-0003 | 1.37 | 42.37 | UAT + VA lot | GSM ₹13.75 |
| Oats Cookies | PRD-0004 | 1.47 | 35.34 | UAT lot | Egg Replacer ₹10 |
| Elachi Cookies B2 | PRD-0005 | 1.26 | 39.21 | UAT lot | GSM ₹12.50 |
| Elachi Cookies B3 | PRD-0006 | 1.26 | 39.21 | UAT lot | GSM ₹12.50 |
| Ragi Cookies B2 | PRD-0007 | 1.37 | 42.37 | UAT + VA lot | GSM ₹13.75 |

**Finding:** Production cost correctly inherits from specific FEFO segment prices. Full audit trail in `consumed_allocations` with per-ingredient segment allocation.

### Layer 3: Master → Central/Franchise Transfer Cost

| Transfer | Ref | Route | Items | selling_unit_price |
|----------|-----|-------|-------|-------------------|
| 219 | TRF-806-2026-0009 | 806→809 | 5 Elachi | **None** |
| 220 | TRF-806-2026-0010 | 806→807 | 10 Elachi | **None** |
| 222 | TRF-806-2026-0012 | 806→809 | 5 Elachi + 10 Ragi | **None** |

**Finding:** `selling_unit_price` is NULL on all transfers because:
- `transfer_selling_price_required: false` in operational settings
- No selling price was set during dispatch

**To test transfer selling price:** Set `transfer_selling_price_required: true` or `allow_master_set_transfer_selling_price: true` (already true) and include `selling_unit_price` in the initiate payload.

### Layer 4: Central → Franchise Reselling Cost

| Transfer | Ref | Route | Items | selling_unit_price |
|----------|-----|-------|-------|-------------------|
| 221 | TRF-806-2026-0011 | 807→810 | 5 Elachi | **None** |

**Finding:** Same — no selling price set. The `central_resell_markup_percent: 0` and `central_resell_allow_override: false` settings control resale markup but are not applied since no base price exists.

### Layer 5: Frontend POS Selling Price

| Food Item | Food ID | POS Selling Price | Tax | Recipe Link |
|-----------|---------|------------------|-----|------------|
| Elachi Cookies | 206254 | **₹20/piece** | 5% | Recipe 9082 → 1pc FG (17642) |
| Coffee | 206255 | **₹10/piece** | 5% | Recipe 9083 → 1pkt beans + 50ml milk |

**Finding:** POS selling price is set on the `food` entity (₹20). When a POS order consumes 1 Elachi Cookie, it deducts 1 piece from FG inventory (17642) via recipe 9082.

---

## 2. COST FLOW SUMMARY (Elachi Cookies)

```
VENDOR PURCHASE (Layer 1)
  Budget Ingredients: Jaggery ₹100/kg, GSM ₹180/kg, Atta ₹70/kg...
  Premium Organics: Jaggery ₹140/kg, GSM ₹250/kg, Atta ₹110/kg...
         ↓ FEFO (earliest expiry first)
PRODUCTION (Layer 2)
  PRD-0006: 31 Elachi Cookies → ₹1.26/piece (total ₹39.21)
  [Jaggery ₹3.50 + GSM ₹12.50 + Atta ₹2.64 + BP ₹0.75 + BS ₹0.54 + Elachi ₹8.00 + Egg ₹10.00 + Vanilla ₹1.20 + Milk ₹0.08]
         ↓ dispatch (segment_id mode)
MASTER → FRANCHISE (Layer 3)
  TRF-806-2026-0009: 5pc dispatched, selling_unit_price=NULL
  Destination segment preserves batch (ELACHI-BATCH-003) + expiry (2026-09-15)
         ↓ or
MASTER → CENTRAL (Layer 3)
  TRF-806-2026-0010: 10pc dispatched to Central A
         ↓ dispatch
CENTRAL → FRANCHISE (Layer 4)
  TRF-806-2026-0011: 5pc to Alpha Outlet One, selling_unit_price=NULL
         ↓ POS order
FOOD SALE (Layer 5)
  Food 206254: ₹20/piece + 5% tax = ₹21/piece to consumer
  Recipe deducts 1pc from FG inventory per order
```

---

## 3. TRANSFER VALIDATION SUMMARY

### Transfer Register

| ID | Ref | Type | Status | From→To | Items |
|----|-----|------|--------|---------|-------|
| 207 | TRF-806-2026-0001 | request | approved | 806→809 | Elachi+Jaggery |
| 208 | TRF-806-2026-0002 | request | approved | 806→809 | 5 Elachi |
| 209 | TRF-806-2026-0003 | request | partially_approved | 806→809 | Sesame+Ragi+Oats |
| 210 | TRF-806-2026-0004 | request | approved | 806→809 | 10 Elachi (amended) |
| 211 | TRF-806-2026-0005 | request | withdrawn | 806→809 | Ragi |
| 212 | TRF-806-2026-0006 | modification | rejected | 806→809 | Elachi modification |
| 213 | TRF-806-2026-0007 | request | requested | 808→810 | Cross-central |
| 214 | TRF-806-2026-0008 | request | approved | 806→809 | 10 Sesame |
| 219 | TRF-806-2026-0009 | dispatch | **received** | 806→809 | 5 Elachi ✅ |
| 220 | TRF-806-2026-0010 | dispatch | **received** | 806→807 | 10 Elachi ✅ |
| 221 | TRF-806-2026-0011 | dispatch | **received** | 807→810 | 5 Elachi ✅ |
| 222 | TRF-806-2026-0012 | request | **partially_received** | 806→809 | 5 Elachi + 10 Ragi ✅ |

### Segment Verification at Destinations

| Store | Item | Segments | Batch Continuity | FEFO Preserved |
|-------|------|----------|-----------------|----------------|
| Franchise 809 | Elachi | seg 335 (5pc) + seg 339 (5pc) | ELACHI-BATCH-003 ✅ | exp 2026-09-15 ✅ |
| Franchise 809 | Ragi | seg 340 (10pc) | RAGI-BATCH-002 ✅ | exp 2026-09-20 ✅ |
| Central A 807 | Elachi | seg 336 (5pc remaining) | ELACHI-BATCH-003 ✅ | exp 2026-09-15 ✅ |
| Franchise 810 | Elachi | seg 337 (5pc) | ELACHI-BATCH-003 ✅ | exp 2026-09-15 ✅ |

---

## 4. REMAINING GAPS

### Data Gap: Old segments missing unit_id
Old segments (created before B3 fix) still have `unit_id=NULL`. These cannot be used for dispatch. Fix: SQL backfill on `inventory_stock_segments` table similar to what was done for `inventory_master`.

### Feature Gap: Transfer selling price not populated
`selling_unit_price` is NULL on all lines. To test:
1. Set `transfer_selling_price_required: true`
2. Include selling price in initiate/dispatch payload
3. Verify resell markup at central level

### B4: Direct dispatch source_selector validation
The `initiate` endpoint's source_selector validation has been partially fixed (segment_id mode now works with new segments). But filter_bucket mode still returns INVALID_SOURCE_SELECTOR.

---

## 5. STORES FOR CONSUMPTION TESTING

| Store | RID | FG Stock | Login |
|-------|-----|----------|-------|
| german fluid (master) | 806 | Elachi 77pc, Sesame ~6pc, Ragi ~37pc, Oats 24pc | manager@germanfluid.com |
| Outlet Direct One | 809 | Elachi 10pc, Ragi 10pc | manager@outletdirectone.com |
| Alpha Outlet One | 810 | Elachi 5pc | manager@alphaoutletone.com |

All passwords: `Qplazm@10`

The Elachi Cookie food item (ID 206254, ₹20/piece) is linked to FG via recipe 9082. POS orders will deduct from FG segments via FEFO.

---

## 6. ENTITY REFERENCE

```
HIERARCHY:
  806 master → 807 central(A) → 810 franchise(AO1)
  806 master → 808 central(B)
  806 master → 809 franchise(direct)

PRODUCTION RUNS: PRD-0001 to PRD-0007
VENDORS: 235 (Budget), 236 (Premium)
PURCHASES: 6016 (VA), 6017 (VB)

COMPLETED TRANSFERS: 219, 220, 221, 222 (dispatch+receive)
LIFECYCLE TRANSFERS: 207-214 (request/approve/amend/withdraw/modify/reject)

FG ITEMS:
  17642 Elachi (master) → 17653 (CA) → 17722 (AO1), 17675 (F1)
  17709 Sesame (master)
  17710 Ragi (master) → 17723 (F1)
  17711 Oats (master)
```
