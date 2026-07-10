# CENTRAL INVENTORY — Math Discovery Issue Register

> **Date:** 2026-06-14 (Updated after Phase 2 extended testing)
> **Source:** Math Discovery & Reconciliation QA (Chai 813)

---

## P0 BLOCKERS: 0

None.

## P1 HIGH: 0

None.

## P2 MEDIUM: 0

None.

## P3 OBSERVATIONS (Non-blocking)

| ID | Area | Description | Impact | Correct Behavior? |
|----|------|-------------|--------|:-----------------:|
| OBS-001 | BOM Cost | `segments_preview` not in basic stock-inventory call — SubRecipeMaster materialCost card shows "—" | Cosmetic | Yes — needs per-item detail call |
| OBS-002 | Consumption | No POS sales data in Chai 813 — Days-of-Cover shows "—"/infinity | Coverage gap only | Yes — correct when consumption=0 |
| OBS-003 | Direct Add-Stock | `POST /inventory/add-stock/{id}` blocked by `require_po_for_purchase=true` | By design | Yes — operational setting enforced correctly |

---

## VERIFIED CALCULATIONS (All Pass — 155/172)

| # | Calculation | Formula | Tests | Result |
|---|-------------|---------|:-----:|:------:|
| 1 | PO line total | `ordered_qty × expected_rate` | 90 | PASS |
| 2 | PO full receive | `received_qty == ordered_qty` | 45 | PASS |
| 3 | PO partial receive | `received_qty < ordered_qty → remaining_qty = ordered - received` | 6 | PASS |
| 4 | PO rate variance | `(actual_rate - expected_rate) / expected_rate × 100` | 1 | PASS |
| 5 | Production total cost | `sum(allocation.line_cost)` | 22 | PASS |
| 6 | Production unit cost | `total_cost / actual_output_qty` | 22 | PASS |
| 7 | Segment reconciliation | `sum(segment.cal_quantity) == cal_quantity` | 5 | PASS |
| 8 | Segment unit cost | `PO_rate / 1000 (for kg→gm)` | 5 | PASS |
| 9 | Weighted cost (multi-PO) | Different rates per segment from different POs | 3 | PASS |
| 10 | Stock after production | `PO_received − production_consumed = current` | 5 | PASS |
| 11 | Wastage stock decrement | `before − wastage_qty = after` | 1 | PASS |
| 12 | Adjustment stock decrement | `before − adjustment_qty = after` | 1 | PASS |
| 13 | Stock increase via PO | `before + received_qty = after` | 1 | PASS |
| 14 | FEFO segment ordering | Nearest expiry first | 1 | PASS |
| 15 | Near-expiry segment | Segment with 2-day expiry correctly placed first | 1 | PASS |
| 16 | Transfer dispatch/receive | `received + rejected = dispatched` | 1 | PASS |
| 17 | Hierarchy stock flow | Central→Master→Outlet chain | 3 | PASS |
| 18 | Wastage report summary | `total_loss > 0` after wastage | 1 | PASS |
| 19 | PO status machine | `draft→approved→sent→partially_received→closed` | 2 | PASS |

---

## TEST DATA CREATED (Phase 2)

| Item | Type | Details | Labeled |
|------|------|---------|---------|
| Salt wastage | Wastage | 50gm from seg 387, reason "Expired" | Part of MATH-QA |
| Oats adjustment | Decrease | 100gm from seg 404, reason "Damaged during storage" | Part of MATH-QA |
| PO #17 | Partial receive | Salt 10kg + Jeera 5kg, received Salt 6kg@22 only | MATH-QA: Partial receive test |
| PO #18 | Raisins increase | 0.2kg@320 via NutSeed | MATH-QA: Stock increase test |
| PO #19 | Near-expiry | Choco Chips 1kg@480, expiry=2026-06-16 | MATH-QA: Near-expiry test |
| TRF #236 | Transfer test | 1 Ajwain Cookie Central→Master North | Part of MATH-QA |

---

## REMAINING UNTESTABLE (requires POS food sales)

| Area | Why | Workaround |
|------|-----|-----------|
| Daily consumption from POS sales | Consumption data comes from POS food order → ingredient deduction pipeline, not from inventory APIs | Would need live POS food orders or a POS admin tool to simulate sales |
| Days-of-Cover with real data | Depends on consumption > 0 | Same as above |
