# P30 v3 — Blended Segment Cost Validation (FINAL)
**Date:** 2026-06-13 (post blended-cost code fix + backfill)

---

## RESULT: BLENDED COST CONFIRMED WORKING ✅

### Test: PRD-2026-0010 (930 Elachi Cookies, 30× batch)

**GSM consumed from 3 segments across 2 vendors:**

| Segment | Batch | Vendor | Qty | Unit Cost (₹/gm) | Alloc Cost |
|---------|-------|--------|-----|-----------|-----------|
| 346 | CT-VA-GSM | Budget (new) | 915gm | 0.18 | ₹164.70 |
| 311 | VB-GSM-001 | Premium (old) | 2000gm | 0.25 | ₹500.00 |
| 355 | CT-VB-GSM | Premium (new) | 85gm | 0.25 | ₹21.25 |
| **Total** | | | **3000gm** | | **₹685.95** |

**`line_cost = SUM(alloc_costs) = ₹685.95` ✅**

4 ingredients had cross-segment consumption — all verified: sum(alloc_costs) == line_cost with ₹0.00 difference.

### Previous Bug (now fixed)
Old code would have computed: 3000gm × ₹0.18/gm = ₹540.00 (first-segment price for all).
New code computes: ₹685.95 (per-segment weighted). Correction: **+₹145.95 per 930 cookies (+₹0.16/cookie)**.

---

## Fresh GRN Forward Test ✅

Bills 6018 (VA @₹180/kg) and 6019 (VB @₹250/kg) created NEW segments with `unit_cost_at_intake` set by code fix at GRN time — no backfill needed.

| Segment | Batch | unit_id | unit_cost_at_intake |
|---------|-------|---------|-------------------|
| 346 | CT-VA-GSM | 1 (kg) | 0.18 ₹/gm |
| 355 | CT-VB-GSM | 1 (kg) | 0.25 ₹/gm |

---

## End-to-End Transfer + Receive ✅

| Transfer | Route | Items | Status |
|----------|-------|-------|--------|
| TRF-806-2026-0016 | Master 806 → Franchise 811 | 50pc ELACHI-3VENDOR-001 | received ✅ |

Franchise 811 segment: `seg 365, batch=ELACHI-3VENDOR-001, qty=50, expiry=2026-10-20, src=806`

---

## Stores for POS Consumption Test

| Store | RID | Login | Stock | Batch |
|-------|-----|-------|-------|-------|
| Cost Test Outlet | 811 | manager@costtestoutlet.com / Qplazm@10 | 50 Elachi | ELACHI-3VENDOR-001 |
| Outlet Direct One | 809 | manager@outletdirectone.com / Qplazm@10 | 59 Elachi | MIXED-COST + BATCH-003 |
| Alpha Outlet One | 810 | manager@alphaoutletone.com / Qplazm@10 | 14 Elachi | MIXED-COST + BATCH-003 |

POS food: **Elachi Cookies (₹20/pc + 5% tax)** → deducts 1pc FG via FEFO.

---

## Cost Chain Summary

```
VENDOR A (Budget)           VENDOR B (Premium)
  GSM ₹180/kg                 GSM ₹250/kg
       ↓ GRN                       ↓ GRN
  seg 346 (0.18/gm)           seg 355 (0.25/gm)
       ↓ FEFO production           ↓
       └───── PRD-0010 ─────────────┘
              930 cookies, ₹2.80/pc
              (blended material cost)
                    ↓ dispatch
              Franchise 811
              50pc, seg 365
                    ↓ POS sale
              ₹20/pc + 5% tax
              Margin: ₹17.20/pc (86%)
```
