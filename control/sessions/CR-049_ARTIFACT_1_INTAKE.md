# CR-049 — Intake Artifact (Gate 1)

> **ID:** CR-049
> **Type:** CR
> **Registered:** 2026-10-16
> **Agent Role:** INTAKE
> **Source:** INVESTIGATION_MASTER_PURCHASE_UX_OVERHAUL.md + INVESTIGATION_20261015_PO_FLOW_AUDIT.md

---

## Problem Statement

`PurchaseOrderDetail.jsx` receive form renders each PO line as a tall card with 4 input fields (Invoice Qty, Rate, Batch, Expiry) plus two info panels (Rate Variance, Stock Impact). For a 10-item PO this produces 10 separate scrollable cards — no keyboard flow, no auto-batch, no live total per line. The receive form should follow the same storekeeper-optimised spreadsheet-row pattern as CR-047 and CR-048.

## Scope

| Area | Change |
|------|--------|
| Layout | Card-per-item → single table row per item |
| Columns | Item | PO Qty | Unit | Rcv Qty | Var (badge) | Rate | Batch (auto) | Expiry | Total |
| Variance | Full panel card → inline badge (`+23% ⚠` or `0% ✓`) in Var column |
| Stock impact | Full panel card → single line under item name (`0 → 126 kg after`) |
| Batch | Manual → auto-generated `{ITEM}-{MON}-{DD}` via `autoBatch()` from CR-047 |
| Total | Missing → `received_qty × actual_rate`, computed live |
| Grand total bar | Missing → Invoice Total vs PO estimate + delta (`+₹399`) |
| Keyboard flow | Tab/Enter row-to-row — same as CR-047/CR-048 |
| Keep | Invoice duplicate check (CR-040), skip checkbox, variance % threshold |

## Evidence

- **Screenshot:** `control/sessions/po_flow_mockup.html` → Screen 6
- **Code evidence:** `PurchaseOrderDetail.jsx` lines 421-503 (card-per-item receive form)
- **Source:** OWNER-REPORTED (2026-10-15)
- **Confidence:** CONFIRMED

## Code Reality

**PARTIAL** — Receive form exists with card layout. Spreadsheet pattern, auto-batch, live total, grand total bar — NONE present.

```
PurchaseOrderDetail.jsx lines 421-503: receive form, card-per-item
Line 472: batch input — manual, no auto-generation
Lines 479-482: invoice total calculation commented out (// BUG-FIX)
Lines 484-499: Rate Variance as full card panel
```

## Duplicate Check

| Item | Result |
|------|--------|
| BUG-044 (payment shown before receive) | **RELATED** — payment field is in same receive form |
| All others | **DISTINCT** |

## Blast Radius

- `PurchaseOrderDetail.jsx` — receive form section only (~lines 375-527)
- Reuse from CR-047: `autoBatch()`, `computeTotal()`, `KeyboardRowHandler`
- Estimated scope: **SMALL** (~2-3 days, can run parallel to CR-047)
- Hotspot files: NO — `PurchaseOrderDetail.jsx` is not HIGH-RISK

## Severity

**P1 — HIGH**

Receive Goods is the final step of every PO — storekeeper fills actual quantities and rates for every delivered item. Card layout with no keyboard flow makes this the most time-consuming entry point in the procurement workflow.

## Owner Decisions — ALL RESOLVED

| Question | Answer |
|----------|--------|
| Split payment on Receive | Backlog — additive fields, API unchanged for now |

## Open Questions

None. Ready for PLANNING.

## Next Step

→ PLANNING agent: Impact Analysis (Gate 2) + Implementation Plan (Gate 3)
→ **Can be implemented in parallel with CR-047**
