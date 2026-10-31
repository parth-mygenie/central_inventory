# BUG-061 — ARTIFACT 1: INTAKE
> **ID:** BUG-061
> **Title:** Purchase Report — Fare Column Missing + Summary Total Excludes Fare
> **Date:** 2026-10-20
> **Severity:** P2 — MEDIUM
> **Source:** OWNER-REPORTED (PUR-828-20261020-8011 example provided)
> **Confidence:** CONFIRMED (live API probe)
> **Owner instruction:** NO-CODE — SKIP GATE until owner gives GO

---

## Description
The Purchase Report shows ₹1,000 for Baby Corn (PUR-828-20261020-8011) but fare ₹200 was charged.
The Amount column shows item cost only. Summary bar total excludes all fare charges across purchases.

## Live API Probe Evidence

```
PUR-828-20261020-8011 — Baby Corn 100kg:
  line_total:  1000   ← what report shows
  tot_fair:     200   ← FARE (confirmed field name)
  tot_amount:  1200   ← correct total (items + fare)

Fare-bearing transactions in 30-day window:
  PUR-828-20261019-8006: tot_fair=300
  PUR-828-20261019-8007: tot_fair=100
  PUR-828-20261020-8011: tot_fair=200
  Total fares missing from report: ₹600

API root total_amount: "3998.00"
Correct total (dedup txn + sum tot_amount): ₹4,598
Undercount in summary bar: ₹600
```

## Root Cause

`PurchaseReport.jsx` line 252 (Amount col): `r.line_total` — items only, fare excluded.
`PurchaseReport.jsx` line 55 (summary total): `d.total_amount` — per G-038, this API field
= sum(line_totals) and excludes fare. Backend will NOT fix (G-038 remains OPEN in L9).

**Multi-item safety note:** Multi-item purchases (PUR-...-8009, -8010) have 2 rows each but
zero fare in this dataset. However: `tot_fair` repeats identically on ALL rows of a transaction.
Cannot substitute `tot_amount` per-row — would double-count fare. Fare column must show only
on FIRST row per transaction_id group.

## Blast Radius
- Files: 1 (`PurchaseReport.jsx`)
- Scope: SMALL (~15 lines)
- Hotspot files: NO

## Duplicate Check
Related: prior investigation SESSION_HANDOVER_20261019_003.md ("Priority 1 — FARE NOT SHOWN").
That handover left it as "open defect, fix pending." This intake formalises it as BUG-061.
DISTINCT from BUG-056 (unit_price per-gram fix — already QA PASS).

## Fix Approach (when owner lifts NO-CODE)
1. No change to Amount column (keep `line_total`)
2. Add Fare column after Amount:
   - Pre-compute `isFirstInTxn` map (Set of transaction_ids seen)
   - Cell: `isFirstInTxn && r.tot_fair > 0 → ₹{r.tot_fair}` else `—`
3. Summary total: deduplicate by `transaction_id`, sum unique `tot_amount` values

## Status
Gate 1 only — NO-CODE, SKIP GATE per owner.
Awaiting Gate 4 GO before any implementation.
