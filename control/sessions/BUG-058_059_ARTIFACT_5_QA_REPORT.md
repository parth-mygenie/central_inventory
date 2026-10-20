# BUG-058 + BUG-059 — ARTIFACT 5: QA REPORT
> **IDs:** BUG-058, BUG-059
> **Artifact:** 5 — QA Report (Gate 6)
> **Date:** 2026-10-20
> **QA run:** Testing agent, iteration_76
> **Result: ALL PASS — 6/6**

---

## Test Results

| # | Test Case | Result | Evidence |
|---|-----------|:------:|----------|
| V1 | BUG-058: Fare ₹100 + Invoice # "INV-TEST" appear in review header | **PASS** | Fare ₹100.00 and Invoice # INV-TEST both visible in confirm header |
| V2 | BUG-058: No Fare row / no Invoice # when fare=0 and invoice empty | **PASS** | Header shows Vendor / Date / Payment only — identical to pre-fix |
| V3 | BUG-058: Items subtotal + Fare + Grand Total breakdown with fare > 0 | **PASS** | Items subtotal ₹100.00 · Fare ₹100.00 · Grand Total ₹200.00 |
| V4 | BUG-058: No subtotal/fare breakdown when fare = 0 | **PASS** | Only Grand Total ₹100.00 shown — no extra rows |
| V5 | BUG-059: Batch Enter → expiry field stays focused (not skipped) | **PASS** | expiry-input-0 focused after batch Enter; remains focused 500ms later |
| V6 | BUG-059: Expiry Enter → next row opens | **PASS** | New row 2 added; item search popover opened for row 2 |

## Summary
- Tests passed: **6/6**
- Failures: **None**
- Regression: **Clean** — no adjacent feature breakage observed

## Minor Note (non-blocking)
Fare input has no `data-testid` attribute — testing required JS state injection. Recommend adding `data-testid="fare-input"` in a future cleanup pass. Not a blocker.

## Recommendation
**PASS → proceed to SMOKE FACILITATOR (Gate 7)**
