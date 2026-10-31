# CR-048 — Intake Artifact (Gate 1)

> **ID:** CR-048
> **Type:** CR
> **Registered:** 2026-10-16
> **Agent Role:** INTAKE
> **Source:** INVESTIGATION_MASTER_PURCHASE_UX_OVERHAUL.md + INVESTIGATION_20261015_PO_COVERAGE_DAYS.md

---

## Problem Statement

`PurchaseOrderCreate.jsx` (step=items) shows all 266 inventory items pre-selected with qty=10, forcing storekeepers to uncheck ~250 items they don't need. The suggestion formula hardcodes `TARGET_DAYS = 30` with no user-selectable coverage period. The fallback when consumption data is missing returns `"10"` (arbitrary) instead of `min_qty_alert` gap. Vendor selection uses a card grid with no search. The PO Create screen should follow the same storekeeper-optimised spreadsheet-row pattern as CR-047.

## Scope

| Area | Change |
|------|--------|
| Item list | Pre-selected 266 items → empty table; OOS/low-stock items as SUGGESTED orange rows |
| Coverage selector | `TARGET_DAYS=30` hardcoded → `[3d][7d][10d][30d]` pills + custom number input, **default 3** |
| Coverage persistence | Read/write via `operational-settings` API key `po_coverage_days` — **pending BE (G-036)**, fallback to 3 |
| Suggestion formula | Port from `RequestStockForm.jsx`: `max(0, ceil(avgDaily × coverageDays − currentStock))` |
| Fallback logic | `|| "10"` → `min_qty_alert` gap (also fixes BUG-049 inline) |
| Exclude no-need items | Items with `orderQty = 0` excluded entirely (same as `RequestStockForm`) |
| Vendor select | Card grid → `Command` combobox type-to-search |
| Table layout | Same spreadsheet row as CR-047: Item | Qty | Unit | Batch(auto) | Expiry | Rate | Total |
| PO Review screen | Show item names + qty only; **no rates** (final rates set at Receive) |

## Evidence

- **Screenshot:** `control/sessions/po_flow_mockup.html` → Screen 3 (coverage selector interactive — try 7d vs 30d)
- **Code evidence:** `TARGET_DAYS = 30` at lines 215, 268 in `PurchaseOrderCreate.jsx`
- **Correct implementation reference:** `RequestStockForm.jsx` lines 25-38 (COVERAGE_OPTIONS) and 173-193 (formula)
- **Operational settings probe (2026-10-16):** `po_coverage_days` key NOT in `stored_settings` → G-036 filed
- **Source:** OWNER-REPORTED (2026-10-15/16)
- **Confidence:** CONFIRMED

## Code Reality

**PARTIAL** — PO Create flow exists. Suggestion engine exists. Spreadsheet layout, coverage selector, correct fallback, operational-settings wiring — NONE present.

```
PurchaseOrderCreate.jsx line 215:  const TARGET_DAYS = 30;  ← hardcoded
PurchaseOrderCreate.jsx line 227:  ordered_qty: isLow ? (suggestedQty || "10") : suggestedQty  ← wrong fallback
PurchaseOrderCreate.jsx line 229:  checked: isLow || (daysOfCover !== null && daysOfCover < 14)  ← doesn't exclude no-need items
```

## Duplicate Check

| Item | Result |
|------|--------|
| BUG-030 (PO Create rate=0, display_qty) | **RELATED** — different fix in same file |
| BUG-036 (consumption unit mismatch) | **RELATED** — consumption normalization used in same file |
| BUG-039 (non-history vendor dropdown) | **RELATED** — vendor selection in same file |
| BUG-043 (negative qty input) | **RELATED** — qty input in same file |
| BUG-049 (wrong "10" fallback) | **SUBSUMED** — BUG-049 fix applied as inline fix within CR-048 implementation |
| All others | **DISTINCT** |

## Blast Radius

- `PurchaseOrderCreate.jsx` — major rewrite (618 lines)
- `api.js` — add `po_coverage_days` read/write via existing `updateOperationalSettings()` (minor)
- Reuse from CR-047: `ItemSearchCombobox`, `autoBatch()`, `computeTotal()`, `KeyboardRowHandler`
- Estimated scope: **MEDIUM** (~3-4 days after CR-047 ships)
- Hotspot files: YES — `api.js` (HIGH-RISK)

## Severity

**P1 — HIGH**

266-item pre-selected list is a daily friction point. Wrong 30d suggestion produces 4× over-ordering for weekly buyers. Fallback `"10"` returns wrong data for threshold-only items.

## Backend Dependency

**G-036** — `po_coverage_days` key missing from operational-settings schema. CR-048 frontend is NOT blocked (falls back to 3d gracefully). G-036 must be resolved for persistence to work end-to-end.

## Owner Decisions — ALL RESOLVED

| Question | Answer |
|----------|--------|
| Default coverage | 3 days |
| Coverage input | Pills (3/7/10/30d) + free-text number input |
| Persistence | Via `operational-settings` API — pending BE (G-036) |
| PO Review rates | Leave blank |
| Add to catalogue | Inline modal (same as CR-047) |

## Open Questions

None. Ready for PLANNING.

## Next Step

→ PLANNING agent: Impact Analysis (Gate 2) + Implementation Plan (Gate 3)
→ **Dependency:** Implement after CR-047 ships (reuse shared components)
