# BUG-052 — Intake Artifact (Gate 1)

> **ID:** BUG-052
> **Type:** BUG
> **Registered:** 2026-10-18
> **Agent Role:** INTAKE
> **Source:** INVESTIGATION — CR-047 implementation vs locked design delta
> **Severity:** P2 — MEDIUM

---

## Problem Statement

When using a single payment mode (not split), the payment Amount field starts blank and accepts any user-typed value. The user can enter ₹1000 for a ₹0.80 purchase with no validation or auto-correction. While the API `tot_amount` is always set to `fullPayableTotal` regardless of what the user enters in the payment field, the mismatch between the displayed amount and the actual submitted total is confusing and misleading. The locked design intent was: single payment = pay the full amount, auto-filled from grand total.

---

## Scope

`AddStockPurchaseForm.jsx` + `PaymentLegs` component:

- `legs[0].amount` initialises as `""` (empty, line 55) and is never synced to `fullPayableTotal`
- `PaymentLegs` receives `fullPayableTotal` but the balance check (`legs.length > 1` guard, line 831) is hidden when single
- No `useEffect` syncs `legs[0].amount` when `fullPayableTotal` changes
- `isFormValid` skips balance check for single payment: `(!isSplit || splitBalanced)` → no validation that `legs[0].amount === fullPayableTotal`

---

## Evidence

- **Screenshot 1:** Fare = 19.05 → fullPayableTotal should be ~₹20. Payment shows **-9** (user typed negative value — accepted with no error).
- **Screenshot 2:** Same scenario, payment shows **1000** (user typed 1000 — accepted, API still sends ₹0.80 as `tot_amount`).
- **Code reality:**
  ```javascript
  // handleSubmit line 197 — correct, always sends fullPayableTotal:
  tot_amount: parseFloat(fullPayableTotal.toFixed(2)),
  // BUT PaymentLegs line 806 — uncontrolled free input:
  <Input type="number" value={leg.amount} onChange={e => onUpdateLeg(i, "amount", e.target.value)} .../>
  // No useEffect to sync legs[0].amount when fullPayableTotal changes
  ```
- **Source:** OWNER-REPORTED ("when its single payment mode the payment amount should get auto filled right?") + confirmed by screenshots
- **Confidence:** CONFIRMED

---

## Duplicate Check

No existing BUG targets single-leg payment auto-fill. **DISTINCT.**

Related: CR-047 (implementation parent)

---

## Blast Radius

- `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx`
  - Add `useEffect` to sync `legs[0].amount` when `fullPayableTotal` changes (~5 lines)
- Optionally: when `legs.length === 1`, make amount display read-only (computed) and only editable when split
- Estimated scope: **SMALL** (~5-8 lines)
- Hotspot files: NO

---

## Severity

**P2 — MEDIUM**

The API submission is correct regardless (always uses `fullPayableTotal`). This is a UX bug — confusing display, not a data integrity issue. No permanent data is corrupted. However, the mismatch creates storekeeper confusion: they see ₹1000 in the form but the record shows ₹0.80.

---

## Owner Decisions Needed

| Question | Answer |
|----------|--------|
| Should single-payment amount be editable or locked to auto-fill? | "auto filled" — user expects it to be pre-filled. Should still be editable (user may want to override) |

So: auto-fill `legs[0].amount = fullPayableTotal` whenever total changes, but keep the input editable for override.

---

## Next Step

→ BUG FIX agent.

Fix in main component:
```javascript
useEffect(() => {
  if (legs.length === 1 && fullPayableTotal > 0) {
    setLegs(prev => [{ ...prev[0], amount: fullPayableTotal.toFixed(2) }]);
  }
}, [fullPayableTotal]);
// Note: only fires when legs.length === 1; no effect when split active
```
