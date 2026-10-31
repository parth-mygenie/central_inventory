# BUG-061 — ARTIFACT 5b: QA REPORT (Option B)
> **Date:** 2026-10-20 | **Run:** iteration_78 | **Result: 6/6 PASS**

| # | Test | Result | Evidence |
|---|------|:------:|----------|
| V1 | 11 headers correct — Item Amt, Fare both present | **PASS** | All headers verified |
| V2 | Baby Corn: Item Amt=₹1,000, Fare=₹200 orange bold | **PASS** | `pr-fare-PUR-828-20261020-8011` confirmed |
| V3 | Apple: Item Amt=₹100, Fare=— | **PASS** | `pr-fare-PUR-828-20261020-8012` shows `—` |
| V4 | Multi-item header: Item Amt=—, Fare=—; sub-rows aligned | **PASS** | 11 cells confirmed per row |
| V5 | Summary total ₹4,598 | **PASS** | Summary bar confirmed |
| V6 | Unit price ₹10 (BUG-056 preserved) | **PASS** | Baby Corn row confirmed |

**PASS → Gate 7 Smoke**
