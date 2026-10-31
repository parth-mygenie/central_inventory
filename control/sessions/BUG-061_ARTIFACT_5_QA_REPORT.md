# BUG-061 — ARTIFACT 5: QA REPORT
> **ID:** BUG-061
> **Artifact:** 5 — QA Report (Gate 6)
> **Date:** 2026-10-20
> **QA run:** Testing agent, iteration_77
> **Result: ALL PASS — 6/6**

## Test Results

| # | Test Case | Result | Evidence |
|---|-----------|:------:|----------|
| V1 | Single-item + fare: PUR-828-20261020-8011 shows 1 row, Baby Corn, ₹1,200, +₹200 fare badge | **PASS** | `pr-txn-PUR-828-20261020-8011` exists; `pr-fare` badge visible |
| V2 | Single-item no fare: PUR-828-20261020-8012 shows 1 row, Apple ₹100, no fare badge | **PASS** | `pr-fare-PUR-828-20261020-8012` does NOT exist |
| V3 | Multi-item: PUR-828-20261019-8009 shows header "2 items" + 2 sub-rows; Payment/Invoice # only on header | **PASS** | `pr-txn-PUR-828-20261019-8009` + sub-rows verified |
| V4 | Summary bar = ₹4,598 (correct, includes fares) not ₹3,998 | **PASS** | `pr-summary-bar` shows ₹4,598 |
| V5 | Ingredient search filters correctly | **PASS** | "corn" search works (also matches American Corn — expected substring behaviour) |
| V6 | BUG-056 unit price formula preserved (Baby Corn: ₹10/kg) | **PASS** | Header unit price = ₹10 (1000÷100) |

## Summary
- Tests passed: **6/6**
- Failures: **None**
- Design note (non-blocking): "corn" search matches both "Baby Corn" and "American Corn" — correct substring behaviour, not a bug.
- Regression: **Clean** — BUG-056 unit price formula fully preserved in new layout.

## Recommendation
**PASS → proceed to SMOKE FACILITATOR (Gate 7)**
