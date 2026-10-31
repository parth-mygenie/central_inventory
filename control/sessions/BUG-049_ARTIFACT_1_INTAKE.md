# BUG-049 — Intake Artifact (Gate 1)

> **ID:** BUG-049
> **Type:** BUG
> **Registered:** 2026-10-16
> **Agent Role:** INTAKE
> **Source:** INVESTIGATION_MASTER_PURCHASE_UX_OVERHAUL.md + INVESTIGATION_20261015_PO_COVERAGE_DAYS.md

---

## Problem Statement

`PurchaseOrderCreate.jsx` uses `|| "10"` as a fallback quantity when an item has no consumption history. This produces an arbitrary suggestion of "10" regardless of the item's actual minimum threshold. The correct fallback — already implemented in `RequestStockForm.jsx` — is to compute the gap between current stock and `min_qty_alert`.

## Reproduction

1. Open PO Create → select vendor
2. Item with `dailyConsumption = 0` AND `min_qty_alert > 0` AND `currentStock < min_qty_alert`
   e.g. Oil: stock 2 ltr, `min_qty_alert` = 5 ltr → correct suggestion = **3 ltr**
3. Actual behaviour: suggestion shows **10** (arbitrary)

## Root Cause

**Two locations** in `PurchaseOrderCreate.jsx`:

```javascript
// Line 227 — By Vendor mode
ordered_qty: isLow ? (suggestedQty || "10") : suggestedQty
//                                   ^^^^ wrong — ignores min_qty_alert

// Line 285 — By Item Need mode
ordered_qty: shouldCheck ? (suggestedQty || "10") : suggestedQty
//                                          ^^^^ same wrong fallback
```

**Correct logic (from RequestStockForm.jsx lines 188-192):**
```javascript
} else if (minQty > 0 && currentStock < minQty) {
  orderQty = Math.ceil(minQty - currentStock); // gap to min threshold
}
// else: no consumption, no threshold, or already stocked → exclude item
```

## Evidence

- **Code:** `PurchaseOrderCreate.jsx` lines 227, 285 — confirmed by grep
- **Reference:** `RequestStockForm.jsx` lines 188-192 — correct implementation
- **Source:** AGENT-DISCOVERED during coverage days investigation (2026-10-16)
- **Confidence:** CONFIRMED

## Code Reality

**CONFIRMED BUG** — Two instances of `|| "10"` at lines 227 and 285.

## Duplicate Check

**DISTINCT** — No existing BUG covers this specific fallback logic in PO Create.
RELATED to CR-048 (same file, same scope) — BUG-049 fix will be applied inline within CR-048 implementation plan.

## Blast Radius

- `PurchaseOrderCreate.jsx` lines 227 and 285 — two targeted changes
- Estimated scope: **SMALL** (< 1 hour standalone, or merged into CR-048)

## Severity

**P2 — MEDIUM**

Wrong data shown in the suggestion column for threshold-only items. Storekeeper can manually override. Not a crash or data corruption — but misleading intelligence that undermines the PO Create screen's value.

## Fix Strategy

**Option A (fast):** Fix BUG-049 as a standalone before CR-048
**Option B (recommended):** Merge fix into CR-048 implementation plan (same file, same session)

## Open Questions

None.

## Next Step

→ Merge into CR-048 implementation plan (PLANNING agent)
→ OR standalone BUG FIX role if owner wants it shipped before CR-048
