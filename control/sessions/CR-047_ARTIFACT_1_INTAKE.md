# CR-047 — Intake Artifact (Gate 1)

> **ID:** CR-047
> **Type:** CR
> **Registered:** 2026-10-16
> **Agent Role:** INTAKE
> **Source:** INVESTIGATION_MASTER_PURCHASE_UX_OVERHAUL.md + INVESTIGATION_20261016_ADD_PURCHASE_API.md

---

## Problem Statement

`AddStockPurchaseForm.jsx` presents each purchase item as a stacked card, requiring mouse-click navigation between fields. Storekeepers entering 20–30 items daily have no keyboard-driven flow. The form also calls the deprecated `add-stock/{id}` endpoint in a per-item loop, which does not support split payments. The new `add-purchase` endpoint (batch call + `partial_payments[]`) is live on the POS API and not yet wired.

## Scope

| Area | Change |
|------|--------|
| Layout | Card-per-item → single-row spreadsheet table |
| Keyboard | Tab/Enter drives field-to-field and row-to-row |
| Item search | `<Select>` → `Command` combobox with fuzzy search |
| Batch | Manual input → auto-generated `{ITEM}-{MON}-{DD}` |
| Total | Manual input → computed `unit_price × qty` (overridable) |
| Auto-row | New row opens when last field of current row is complete |
| API | `add-stock/{id}` loop → `add-purchase` (all items, one call) |
| Payment modes | Old: Cash/Credit/Online → New: **Cash/Card/UPI/Bank Transfer/Others** |
| Split payment | Add `partial_payments[]` when user adds 2nd payment type |
| Fare field | `tot_fair` exposed as optional, default 0. `tot_tax` hidden, always 0. |
| Confirm page | Add per-line unit price + total + grand total + transaction ID |
| Add to catalogue | Inline modal (stays on form) |

## Evidence

- **Screenshot:** `control/sessions/purchase_form_mockup.html` (interactive mockup)
- **Curl evidence:** Probed `add-purchase` live (RID 807) — purchase_id 7995, 7996 created. Split payment confirmed. Proxy needs zero changes.
- **Source:** OWNER-REPORTED (2026-10-15)
- **Confidence:** CONFIRMED (investigation + live API probes)

## Code Reality

**PARTIAL** — `AddStockPurchaseForm.jsx` exists with old card layout and old endpoint. Spreadsheet pattern, `add-purchase` wiring, split payment UI — NONE of these exist yet.

```
AddStockPurchaseForm.jsx lines 134-167: handleSubmit → per-item loop, calls addStockPurchase()
api.js line 790-791: addStockPurchase → POST /proxy/v2/inventory/add-stock/{id}
```

## Duplicate Check

| Item | Result |
|------|--------|
| BUG-010 (add-stock payload estimation) | **RELATED** — CR-047 supersedes it by replacing the endpoint entirely |
| All others | **DISTINCT** |

## Blast Radius

- `AddStockPurchaseForm.jsx` — full rewrite (~542 lines → new layout)
- `api.js` — add new `addPurchase()` function (keep `addStockPurchase` until CR-047 ships, then deprecate)
- Shared utilities to create: `autoBatch()`, `computeTotal()`, `KeyboardRowHandler`, `ItemSearchCombobox`
- Estimated scope: **MEDIUM** (~3-4 days)
- Hotspot files: YES — `api.js` (HIGH-RISK per CI-R5)

## Severity

**P1 — HIGH**

Core daily storekeeper workflow. Currently functional but requiring significant manual effort for every purchase session. Replacement API (`add-purchase`) is live — existing `add-stock` endpoint is deprecated. Split payment is fully supported by backend but completely absent from frontend.

## Owner Decisions — ALL RESOLVED

| Question | Answer |
|----------|--------|
| Payment modes | Cash, Card, UPI, Bank Transfer, Others |
| UPI ref field | Optional |
| Fare field | Exposed (default 0). Tax hidden (always 0). |
| Transaction ID on success | Yes — show `PUR-807-...` |
| Add to catalogue | Inline modal |

## Open Questions

None. All owner questions answered. Ready for PLANNING.

## Next Step

→ PLANNING agent: Impact Analysis (Gate 2) + Implementation Plan (Gate 3)
