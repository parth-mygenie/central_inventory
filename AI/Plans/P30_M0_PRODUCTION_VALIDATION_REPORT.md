# P30 — Mixed-Vendor Cost Model Validation (FINAL)
**Date:** 2026-06-13 (post all fixes)  
**Restaurant:** 806 (german fluid)

---

## KEY FINDING: Cross-Segment Cost Bug

When a production run consumes raw material from **multiple FEFO segments** (different vendors, different prices), the `line_cost` is computed using the **first segment's unit price** for the **entire quantity** — not a weighted average.

### Evidence: PRD-2026-0008 (155 Elachi Cookies)

**GSM consumption spanned 2 segments:**

| Segment | Batch | Vendor | Qty Consumed | Unit Price | Expected Cost |
|---------|-------|--------|-------------|-----------|--------------|
| 280 | GSM-LOT-001 | UAT | 415 gm | ₹125/kg | ₹51.875 |
| 291 | VA-GSM-001 | Vendor A | 85 gm | ₹180/kg | ₹15.300 |
| **Total** | | | **500 gm** | | **₹67.175** |

**Actual `line_cost` reported: ₹62.50** (= 500gm × ₹125/kg, first segment price only)

**Under-count: ₹4.675 per batch (₹0.030/cookie)**

### Impact

- FG unit cost is understated when production spans cheaper→expensive segments
- Over-stated margin on cost reports
- Compounds at scale: 1000 cookies/day × ₹0.03 = ₹30/day under-counted
- The segment_allocations audit trail correctly records WHICH segments were consumed and how much — the data is there, the cost computation just doesn't use per-segment prices

### Recommended Fix

In `production-run/complete`, compute `line_cost` as:
```
line_cost = SUM(segment_allocation.qty_cal × segment.unit_cost) for each allocation
```
instead of:
```
line_cost = total_qty × first_segment.unit_cost
```

---

## COMPLETE COST CHAIN: Vendor → POS Sale

### Flow Diagram

```
Vendor A (Budget)  ──₹180/kg GSM──→  ┐
Vendor B (Premium) ──₹250/kg GSM──→  │  FEFO
UAT lot            ──₹125/kg GSM──→  ┘    ↓
                                    Production (PRD-0008)
                                    155 Elachi @ ₹1.26/pc
                                         ↓ dispatch
                          ┌──────────────┴──────────────┐
                     Franchise 809              Central A (807)
                     seg 342: 50pc              seg 343: 20pc
                                                     ↓ dispatch
                                               Franchise 810
                                               seg 344: 10pc
                                                     ↓ POS order
                                               ₹20/pc + 5% tax
```

### Layer-by-Layer Cost

| Layer | Description | Cost/Value | Status |
|-------|------------|-----------|--------|
| 1. Vendor Purchase | GSM: VA ₹180/kg, VB ₹250/kg, UAT ₹125/kg | Per segment | ✅ Tracked |
| 2. Manufacture | 155 Elachi: total ₹196.05, unit ₹1.26/pc | Computed (bug: not blended) | ⚠️ Under-counted |
| 3. Master→Store Transfer | selling_unit_price | **NULL** (not required) | ⚠️ Not set |
| 4. Central→Franchise | resell markup 0% | **NULL** | ⚠️ Not set |
| 5. POS Sale | ₹20/piece + 5% tax | ₹21/consumer | ✅ |
| 6. Gross Margin | ₹20 - ₹1.26 | ₹18.74 (93.7%) | ✅ (overstated by bug) |

### Transfer Selling Price Gap

The `selling_unit_price` is NULL on all transfer lines because `transfer_selling_price_required: false`. To enable full cost traceability through transfers:

1. Set `transfer_selling_price_required: true`
2. Set prices in dispatch payload
3. Central markup via `central_resell_markup_percent`

Without this, the cost chain has a **blind spot** between manufacture and POS sale — there's no intermediate transfer price recorded.

---

## CONSUMPTION EVIDENCE

| Store | Order ID | Item | Qty | Segment Consumed | Batch | FEFO |
|-------|----------|------|-----|-----------------|-------|------|
| 809 | 939863 | Elachi Cookie | 1 | seg 335 | ELACHI-BATCH-003 | ✅ earliest expiry |
| 810 | 939865 | Elachi Cookie | 1 | seg 337 | ELACHI-BATCH-003 | ✅ earliest expiry |

Both stores consumed from ELACHI-BATCH-003 (expiry 2026-09-15) before ELACHI-MIXED-COST-001 (expiry 2026-10-01) → **FEFO respected at POS consumption level** ✅

---

## CURRENT STOCK AT ALL STORES

| Store | RID | Elachi Stock | Batches | Ready for POS |
|-------|-----|-------------|---------|--------------|
| Master 806 | 806 | ~87pc | COOKIE-BATCH-001(30), ELACHI-BATCH-002(31), MIXED-COST(~85) | ✅ |
| Franchise 809 | 809 | 59pc | BATCH-003(4+5), MIXED-COST(50) | ✅ |
| Central A 807 | 807 | 15pc | BATCH-003(5), MIXED-COST(10) | ✅ |
| Franchise 810 | 810 | 14pc | BATCH-003(4), MIXED-COST(10) | ✅ |

---

## PRODUCTION READINESS — UPDATED RECOMMENDATION

| Category | Status | Notes |
|----------|--------|-------|
| Vendor GRN + FEFO | ✅ GO | Fully functional |
| Production runs | ✅ GO | Works, but see cost bug below |
| Transfer lifecycle | ✅ GO | All flows working post-fixes |
| Segment traceability | ✅ GO | Batch + expiry preserved through chain |
| POS consumption | ✅ GO | FEFO deduction confirmed |
| **Cost computation** | ⚠️ BUG | Cross-segment production uses first-segment price, not blended |
| **Transfer pricing** | ⚠️ GAP | selling_unit_price not populated |
| Old segments (pre-B3) | ⚠️ DATA | unit_id=NULL, can't dispatch |

### Go/No-Go

**GO for production with known limitations:**
1. Cost bug is minor per unit (₹0.03/cookie) but compounds at scale
2. Transfer pricing needs configuration if cost chain visibility required
3. Old segments need SQL backfill for full dispatch capability
