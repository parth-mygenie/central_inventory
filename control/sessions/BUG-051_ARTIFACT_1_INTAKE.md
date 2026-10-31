# BUG-051 — Intake Artifact (Gate 1)

> **ID:** BUG-051
> **Type:** BUG
> **Registered:** 2026-10-18
> **Agent Role:** INTAKE
> **Source:** INVESTIGATION — CR-047 implementation vs locked design delta
> **Severity:** P1 — HIGH

---

## Problem Statement

The Add Stock form allows the user to select the same item in multiple rows AND submit the purchase. The CR-047 locked design and Gate 2 Impact Analysis both specified that duplicate item selection should be prevented. The implementation adds a visual `⚠` amber badge when duplicates exist but does not gate the Confirm button. As a result, two `purchase_items[]` entries with the same `Ingredient` ID are sent to `add-purchase`, creating two overlapping purchase records for the same item.

---

## Scope

`AddStockPurchaseForm.jsx`:

1. `validRows` (line 94–97) — does not exclude duplicate `itemId` rows from submission
2. `isFormValid` (line 179) — does not check `hasDuplicates`
3. The "Review & Confirm" button is not disabled when duplicates exist

---

## Evidence

- **Screenshot:** User-provided — Row 1: Apple, Row 2: Apple. Form shows "Review & Confirm (2 items)" — both rows eligible for submission.
- **Code reality:**
  ```javascript
  // line 94-97 — no duplicate exclusion
  const validRows = useMemo(
    () => rows.filter(r => r.itemId && Number(r.qty) > 0 && r.batch.trim()),
    [rows]
  );
  // line 179 — no hasDuplicates check
  const isFormValid = validRows.length > 0 && vendorId && (!isSplit || splitBalanced);
  ```
- **`itemIdCount` exists** (line 100–104) but is only passed to `SpreadsheetRow` for visual badge — never used to gate submission.
- **Source:** AGENT-DISCOVERED via investigation of screenshots
- **Confidence:** CONFIRMED — code trace confirms gate is absent

---

## Duplicate Check

No existing BUG targets duplicate item selection gating on Add Stock. **DISTINCT.**

Related: CR-047 (implementation parent — this is a post-implementation UX gap)

---

## Blast Radius

- `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx`
  - Add `hasDuplicates` derived from `itemIdCount` (~2 lines)
  - Add `&& !hasDuplicates` to `isFormValid` (~1 line)
  - Optionally show inline message when button is disabled due to duplicates
- Estimated scope: **SMALL** (~5 lines + optional message)
- Hotspot files: NO (`AddStockPurchaseForm.jsx` is not on the HIGH-RISK list)

---

## Severity

**P1 — HIGH**

A duplicate purchase submission creates two stock records for the same item under the same PO session — data integrity issue. The UX also contradicts the design intent ("user should not be able to select same item twice").

---

## Owner Decisions Needed

| Question | Answer |
|----------|--------|
| Should duplicate submission be blocked (hard gate) or just warned? | User confirmed: **BLOCK** — "same item should not be selected in form" |

---

## Next Step

→ BUG FIX agent.

Fix:
```javascript
const hasDuplicates = useMemo(
  () => Object.values(itemIdCount).some(c => c > 1),
  [itemIdCount]
);
const isFormValid = validRows.length > 0 && vendorId && !hasDuplicates && (!isSplit || splitBalanced);
```
Add inline message near Confirm button: `⚠ Remove duplicate items before confirming` when `hasDuplicates`.
