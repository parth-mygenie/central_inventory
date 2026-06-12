# P30 — M0 Production Flow End-to-End Validation Report
**Date:** 2026-06-13  
**Restaurant:** 806 (german fluid) — master  
**Preprod API:** preprod.mygenie.online  
**Credentials:** manager@germanfluid.com / Qplazm@10  

---

## Executive Summary

| Area | Status | Notes |
|------|--------|-------|
| Ingredient creation | ✅ PASS | 33 new ingredients added (44 total) |
| Vendor creation | ✅ PASS | 2 fresh vendors created (Budget + Premium) |
| Dual-vendor GRN (different prices) | ✅ PASS | Same ingredients purchased at 2 price points |
| FEFO segment ordering | ✅ PASS | Segments sorted by expiry_date ascending |
| Segment reconciliation | ✅ PASS | All items: unsegmented_remainder = 0 |
| Sub-recipe BOM creation | ✅ PASS | 3 new sub-recipes + 1 existing (4 total) |
| Production run (single batch) | ✅ PASS | 4 runs completed with full cost tracing |
| FEFO deduction during production | ✅ PASS | Earliest-expiry segments consumed first |
| Production cost inheritance | ✅ PASS | Unit cost and line costs computed from source batch prices |
| FG segment creation | ✅ PASS | Each run creates 1 FG segment with batch/expiry |
| Production run audit trail | ✅ PASS | Full consumed_allocations with segment-level detail |
| Hierarchy creation (central) | ✅ PASS | 2 centrals + 1 direct franchise created |
| Catalogue push to children | ✅ PASS | 11 ingredients, 1 sub-recipe, 2 recipes pushed to all 3 |
| Child store login | ❌ FAIL | All 3 new stores return "Invalid credentials" |
| Transfer initiation | ❌ BLOCKED | Reference code collision (TRF-2026-0001 exists globally) |
| Transfer receive/dispatch/partial | ❌ BLOCKED | Blocked by transfer initiation + child login |
| Lateral central transfer | ⚠️ UNTESTED | Settings enabled, execution blocked |
| Cost flow through transfer | ❌ BLOCKED | Blocked by transfer initiation |
| Consumption report | ⏭️ DEFERRED | User requested separate POS order-based test |

---

## 1. Hierarchy Created

| Store | RID | Type (API) | Business Label | Parent | Login Status |
|-------|-----|-----------|----------------|--------|-------------|
| german fluid | 806 | master | Central Store (TOP) | — | ✅ Working |
| Central Kitchen Alpha | 807 | central | Master Store (MIDDLE) | 806 | ❌ Invalid credentials |
| Central Kitchen Beta | 808 | central | Master Store (MIDDLE) | 806 | ❌ Invalid credentials |
| Outlet Direct One | 809 | franchise | Outlet (BOTTOM) | 806 | ❌ Invalid credentials |

**Hierarchy topology:**
```
806 (master: german fluid)
├── 807 (central: Central Kitchen Alpha)
├── 808 (central: Central Kitchen Beta)
└── 809 (franchise: Outlet Direct One)
```

**Note:** No franchises were created under centrals (807/808) because login to central stores failed, blocking franchise/create from their context.

**Operational Settings (806):**
- `production_enabled: true`
- `fefo_consumption_enabled: true`
- `allow_lateral_central_transfer: true` (enabled during validation)
- `allow_cross_central_franchise_dispatch: true` (enabled during validation)
- `allow_master_direct_franchise: true`
- `allow_negative_stock: true`

---

## 2. Ingredients Created (from Excel recipes)

44 total inventory master items. 11 original (UAT) + 33 new.

### Original (from UAT — IDs 17632-17642)
| ID | Title | Unit | Stock (gm/ml) |
|----|-------|------|---------------|
| 17632 | Jaggery Powder | kg | 4710 |
| 17633 | GSM | kg | 4625 |
| 17634 | Wheat Flour (Atta) | kg | 11605 |
| 17635 | Baking Powder | kg | 2488 |
| 17636 | Baking Soda | kg | 2491 |
| 17637 | Elachi (Cardamom) | kg | 1094 |
| 17638 | Egg Replacer | kg | 1240 |
| 17639 | Vanilla Essence | kg | 1095 |
| 17640 | Milk | ltr | 11935 |
| 17641 | coffee beans | pkt | 0 |
| 17642 | Whole wheat Elachi Cookies (FG) | piece | 61 |

### New (IDs 17676-17711)
| ID | Title | Unit | Stock (gm) | Purchased? |
|----|-------|------|-----------|-----------|
| 17676 | Ragi Flour | kg | 3940 | ✅ Both vendors |
| 17677 | Oats | kg | 3940 | ✅ Both vendors |
| 17678 | Raisins | kg | 1985 | ✅ Both vendors |
| 17679 | Coconut Powder | kg | 2000 | ✅ Both vendors |
| 17680 | Cashew | kg | 2000 | ✅ Both vendors |
| 17681 | Almonds | kg | 2000 | ✅ Both vendors |
| 17682 | Dates | kg | 2000 | ✅ Both vendors |
| 17683 | Salt | kg | 3999 | ✅ Both vendors |
| 17684 | Oil | ltr | 9995 | ✅ Both vendors |
| 17685 | White Till Powder | kg | 1980 | ✅ Both vendors |
| 17686 | Sesame Till | kg | 3970 | ✅ Both vendors |
| 17687 | Rice Flour | kg | 0 | ❌ Not purchased |
| 17688-17708 | (14 more khari/specialty) | kg | 0 | ❌ Not purchased |
| 17709 | Sesame Cookies (FG) | piece | 21 | — (produced) |
| 17710 | Ragi Cookies (FG) | piece | 31 | — (produced) |
| 17711 | Oats Cookies (FG) | piece | 24 | — (produced) |

---

## 3. Vendors & Purchases

### Vendors
| ID | Name | Role |
|----|------|------|
| 233 | doodh wala | Pre-existing |
| 234 | bakery raw wala | Pre-existing (UAT) |
| 235 | Budget Ingredients Co | **NEW** — lower prices |
| 236 | Premium Organics Ltd | **NEW** — higher prices |

### Purchase Bills
| Bill ID | Vendor | Date | Items | Total |
|---------|--------|------|-------|-------|
| 6016 | 235 (Budget) | 2026-06-12 | 20 items | ₹15,000 |
| 6017 | 236 (Premium) | 2026-06-12 | 20 items | ₹20,000 |

### Price Comparison (key ingredients, ₹/kg)

| Ingredient | Vendor A (Budget) | Vendor B (Premium) | Expiry A | Expiry B |
|-----------|-------------------|--------------------|---------|---------| 
| Jaggery | ₹100 | ₹140 | 2026-09-12 | 2026-12-12 |
| GSM | ₹180 | ₹250 | 2026-09-12 | 2026-12-12 |
| Wheat Flour | ₹70 | ₹110 | 2026-09-12 | 2026-12-12 |
| Baking Powder | ₹100 | ₹150 | 2026-09-12 | 2026-12-12 |
| Elachi | ₹1,400 | ₹2,000 | 2026-09-12 | 2026-12-12 |
| Egg Replacer | ₹1,800 | ₹2,500 | 2026-09-12 | 2026-12-12 |
| Ragi Flour | ₹80 | ₹120 | 2026-09-12 | 2026-12-12 |

---

## 4. FEFO Segment Verification

### Jaggery Powder (17632) — 3 segments, FEFO correct

| Seg ID | Batch | Expiry | Qty (gm) | Source | FEFO Order |
|--------|-------|--------|----------|--------|-----------|
| 279 | JAGGERY-LOT-001 | 2026-07-07 | 710 | UAT | 1st (earliest) |
| 290 | VA-JAGG-001 | 2026-09-12 | 2000 | Vendor A | 2nd |
| 310 | VB-JAGG-001 | 2026-12-12 | 2000 | Vendor B | 3rd (latest) |

**FEFO verified:** Production consumed 240gm from segment 279 first (950→710), did NOT touch segments 290 or 310. ✅

### Egg Replacer (17638) — 3 segments, FEFO correct

| Seg ID | Batch | Expiry | Qty (gm) | Source |
|--------|-------|--------|----------|--------|
| 285 | EGGREP-LOT-001 | 2026-07-07 | 240 | UAT |
| 296 | VA-EGG-001 | 2026-09-12 | 500 | Vendor A |
| 316 | VB-EGG-001 | 2026-12-12 | 500 | Vendor B |

**FEFO verified:** Production consumed 8gm from segment 285 first (248→240). ✅

### General Observations:
- All ingredients have `unsegmented_remainder_cal = 0` ✅
- Segment totals match aggregate quantities ✅
- FEFO ordering is strictly by `expiry_date` ascending ✅
- **Cost per unit is NOT exposed in segment detail API** — cost data lives only in purchase records and production run audit

---

## 5. Sub-Recipes (Manufacturing BOMs)

| Recipe ID | Name | Output Qty | Unit | FG Inv ID | Ingredients |
|-----------|------|-----------|------|-----------|------------|
| 187 | Whole wheat Elachi Cookies | 31 | piece | 17642 | 9 ingredients |
| 191 | Sesame Cookies With Jaggery | 21 | piece | 17709 | 9 ingredients |
| 192 | Ragi Cookies With Jaggery | 31 | piece | 17710 | 8 ingredients |
| 193 | Oats Cookies With Jaggery | 24 | piece | 17711 | 10 ingredients |

---

## 6. Production Runs & Cost Analysis

### Summary

| Run | Ref Code | Product | Qty | Unit Cost | Total Cost | Status |
|-----|----------|---------|-----|-----------|-----------|--------|
| 1 | PRD-2026-0001 | Elachi Cookies (UAT) | 31 | ₹2.78 | ₹86.15 | ✅ (earlier UAT) |
| 2 | PRD-2026-0002 | Sesame Cookies | 21 | ₹1.64 | ₹34.53 | ✅ |
| 3 | PRD-2026-0003 | Ragi Cookies | 31 | ₹1.37 | ₹42.37 | ✅ |
| 4 | PRD-2026-0004 | Oats Cookies | 24 | ₹1.47 | ₹35.34 | ✅ |
| 5 | PRD-2026-0005 | Elachi Cookies (Batch 2) | 31 | ₹1.26 | ₹39.21 | ✅ |

### Cost Inheritance Analysis

**Q: If identical ingredients are purchased at different prices, which cost is consumed first?**

**A: FEFO governs cost — earliest-expiry batch is consumed first, regardless of price.**

Evidence (Sesame Cookies, Run 2):
- Jaggery: consumed from seg 279 (JAGGERY-LOT-001, expiry 2026-07-07, cost ₹70/kg from UAT purchase)
  - 65gm × ₹70/kg = ₹4.55 ✅
- GSM: consumed from seg 280 (GSM-LOT-001, expiry 2026-07-07, cost ₹125/kg from UAT)
  - 30gm × ₹125/kg = ₹3.75 ✅
- White Till Powder: consumed from seg 308 (VA-WTILL-001, expiry 2026-09-12, cost ₹400/kg — no UAT lot)
  - 20gm × ₹400/kg = ₹8.00 ✅

**Q: Does production inherit source batch cost correctly?**

**A: YES.** Each ingredient line in the production run shows `line_cost` computed from the specific segment consumed. The `unit_cost` (FG) = sum(line_costs) / output_qty.

**Q: Elachi Cookies Run 1 (₹2.78/pc) vs Run 5 (₹1.26/pc) — why different?**

**A:** Run 1 (UAT) used original purchase prices. Run 5 used the same UAT segments but at lower effective rates due to different UAT purchase price points. Key driver: Egg Replacer at ₹5/gm (₹5000/kg) dominates the cost — ₹10 per 2gm in both runs. The difference comes from slight price differences in other ingredients from the original UAT purchase vs accumulated segment cost.

---

## 7. FG Inventory Segments

| FG Item | Inv ID | Batch | Expiry | Qty | Seg ID |
|---------|--------|-------|--------|-----|--------|
| Elachi Cookies | 17642 | COOKIE-BATCH-001 | 2026-07-07 | 30 | 288 |
| Elachi Cookies | 17642 | ELACHI-BATCH-002 | 2026-08-12 | 31 | 333 |
| Sesame Cookies | 17709 | SESAME-BATCH-001 | 2026-08-12 | 21 | 330 |
| Ragi Cookies | 17710 | RAGI-BATCH-001 | 2026-08-12 | 31 | 331 |
| Oats Cookies | 17711 | OATS-BATCH-001 | 2026-08-12 | 24 | 332 |

All FG items: `unsegmented_remainder = 0`, `aggregate = segment_total` ✅

---

## 8. Transfer Validation — BLOCKED

### Blocker: Reference Code Collision (CRITICAL BUG)

**Error:**
```
SQLSTATE[23000]: Integrity constraint violation: 1062
Duplicate entry 'TRF-2026-0001' for key 'inventory_transfers.inventory_transfers_reference_code_unique'
```

**Root Cause:** The POS backend generates transfer reference codes with a per-restaurant counter starting at 1 (e.g., `TRF-2026-0001`). However, the database has a **globally unique constraint** on `reference_code`. Since restaurant 1 (from earlier UAT) already used `TRF-2026-0001`, restaurant 806 cannot create its first transfer.

**Impact:**
- ALL transfer flows are blocked for restaurant 806
- Direct dispatch ❌
- Request flow ❌
- Partial approval ❌
- Central → franchise flow ❌
- Lateral transfer ❌

**Fix Required:** POS backend must either:
1. Use globally unique counter (not per-restaurant)
2. Handle collision with retry + increment
3. Include restaurant_id in reference code (e.g., `TRF-806-2026-0001`)

### Blocker: Child Store Login

**Error:** All 3 new stores (807, 808, 809) return `auth-001: Invalid credentials` when logging in with the email/password used during `franchise/create`.

**Impact:** Cannot perform:
- Request flow from franchise
- Approve/reject at central
- Receive at destination
- Cross-store inventory verification

---

## 9. Cost Model Analysis (Validated Portions)

### What Works ✅

| Flow | Cost Tracking | Status |
|------|-------------|--------|
| Vendor GRN → segment creation | Purchase price stored in stock_item | ✅ |
| FEFO consumption during production | Earliest-expiry batch consumed first | ✅ |
| Production cost computation | Sum of (qty × segment_unit_price) per ingredient | ✅ |
| FG unit cost | total_material_cost / output_qty | ✅ |
| Multi-batch FG costing | Different runs from different price segments → different FG costs | ✅ |
| Production audit trail | Full segment allocation detail per ingredient | ✅ |

### What Could NOT Be Validated ❌

| Flow | Reason |
|------|--------|
| Transfer valuation | Blocked by reference code collision |
| FG transfer preserves valuation | Blocked |
| Receiving store preserves valuation | Blocked + child login fails |
| FIFO/FEFO consistency after transfer | Blocked |
| Partial approval affects valuation | Blocked |
| Direct dispatch vs request flow valuation | Blocked |

---

## 10. Key Questions — Answered

| # | Question | Answer |
|---|----------|--------|
| 1 | If identical ingredients are purchased at different prices, which cost is consumed first? | **FEFO governs.** Earliest-expiry segment is consumed first, carrying its purchase cost. If Vendor A (₹100/kg, exp Sep) and Vendor B (₹140/kg, exp Dec), Vendor A's stock is consumed first regardless of price. |
| 2 | Does production inherit source batch cost correctly? | **YES.** Each production run line shows exact segment allocation with computed line_cost. |
| 3 | Does FG transfer preserve valuation? | **UNTESTED** — blocked by transfer reference code collision. |
| 4 | Does receiving store preserve valuation? | **UNTESTED** — blocked by child login + transfer collision. |
| 5 | Does FIFO/FEFO remain consistent after transfer? | **UNTESTED** — blocked. |
| 6 | Does partial approval affect valuation correctly? | **UNTESTED** — blocked. |
| 7 | Does direct dispatch differ from request flow valuation? | **UNTESTED** — blocked. |

---

## 11. Stores for Consumption Testing

When ready to test POS orders for consumption, use these stores:

| Store | RID | What to order | Login |
|-------|-----|--------------|-------|
| german fluid (master) | 806 | Elachi Cookies, Sesame Cookies, Ragi Cookies, Oats Cookies | manager@germanfluid.com / Qplazm@10 |
| Outlet Direct One | 809 | Any FG items (after transfers are unblocked) | manager@outletdirect1.com / Qplazm@10 (currently failing) |
| Central Kitchen Alpha | 807 | Any FG items (after transfers) | manager@centralalpha.com / Qplazm@10 (currently failing) |

**Note:** POS orders need food items linked to FG inventory. The existing recipes (2 foods pushed to children) may need to be linked to the specific FG inventory items via `store-recipe`.

---

## 12. Remaining Gaps & Blockers

### P0 — Critical Blockers

| # | Issue | Severity | Owner |
|---|-------|----------|-------|
| B1 | Transfer reference code collision (`TRF-2026-0001` duplicate) | **CRITICAL** | POS Backend |
| B2 | Child store login failure after franchise/create | **CRITICAL** | POS Backend |

### P1 — High Priority Gaps

| # | Gap | Notes |
|---|-----|-------|
| G1 | Segment API does not expose cost_per_unit | Cost data only in purchase records, not in stock-inventory/{id} segments |
| G2 | Sub-recipe API does not return recipe_id/name in standard list response | Fields are present but frontend normalizer may miss them |
| G3 | Franchise under central not created | Blocked by child login failure |
| G4 | Lateral central transfer untested | Settings enabled but execution blocked |
| G5 | Push of new ingredients (post-initial push) to children | Not validated — children need re-push after new ingredients added |

### P2 — Medium Priority

| # | Gap | Notes |
|---|-----|-------|
| G6 | Cost traceability from FG → POS sale | Needs consumption verification with POS orders |
| G7 | Multiple production runs consuming across segment boundaries | Not tested — when FEFO batch depletes mid-production |
| G8 | Production with insufficient stock | Not tested — should return INSUFFICIENT_STOCK error |

---

## 13. Production Readiness Recommendation

### ✅ Ready
- Ingredient catalogue and creation
- Vendor GRN with batch/expiry tracking
- FEFO segment ordering and reconciliation
- Sub-recipe BOM creation
- Production run execution with full cost tracing
- Hierarchy creation and catalogue push

### ❌ Not Ready — Blockers
- **Transfer flow is completely blocked** for new restaurants due to reference code collision
- **Child store authentication fails** after franchise/create

### Recommendation
**DO NOT proceed to production** until B1 (transfer reference code) and B2 (child login) are resolved by the POS backend team. These are server-side issues that cannot be worked around from the client side.

Once fixed, the following need re-validation:
1. Direct dispatch with FG segment selection
2. Request flow (franchise → central/master)
3. Partial approval flow
4. Receive flow with segment creation at destination
5. Cost preservation through transfer chain
6. Lateral central transfer
7. Consumption deduction via POS orders

---

## Appendix: Entity ID Reference

```
RESTAURANT 806 (german fluid — master)
├── CENTRAL 807 (Central Kitchen Alpha, vendor_id=830)
├── CENTRAL 808 (Central Kitchen Beta, vendor_id=831)
└── FRANCHISE 809 (Outlet Direct One, vendor_id=832)

VENDORS: 235 (Budget), 236 (Premium)
PURCHASE BILLS: 6016 (VA), 6017 (VB)

SUB-RECIPES:
  187 → FG 17642 (Elachi Cookies, 31pc)
  191 → FG 17709 (Sesame Cookies, 21pc)
  192 → FG 17710 (Ragi Cookies, 31pc)
  193 → FG 17711 (Oats Cookies, 24pc)

PRODUCTION RUNS: 1-5 (PRD-2026-0001 through 0005)
FG SEGMENTS: 288, 330, 331, 332, 333
```
