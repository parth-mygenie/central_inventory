# BUG-056 — Intake Artifact (Gate 1)

> **ID:** BUG-056
> **Type:** BUG
> **Registered:** 2026-10-19
> **Agent Role:** INVESTIGATION → INTAKE
> **Severity:** P1 — HIGH (both issues visible to owner on first use of new screen)
> **Related to:** CR-051 (Purchase Report — post-implementation display gaps)
> **Sprint:** S5
> **Investigation:** `control/sessions/INVESTIGATION_20261019_CR051_DISPLAY.md`

---

## Two Bugs (B1 + B2) in `PurchaseReport.jsx`

### B1 — Unit Price shows per-gram API value, not per-display-unit

**Symptom:** Unit Price column shows ₹0.08, ₹0.1, ₹0.2, ₹0.01
**Expected:** ₹80/kg, ₹100/kg, ₹200/kg, ₹10/kg

**Root cause:** `r.unit_price` from the POS API is stored per-gram (base unit).
Line 246 renders it directly:
```javascript
// PurchaseReport.jsx line 246 — WRONG
{r.unit_price > 0 ? `₹${r.unit_price}` : "—"}
```

`unit_price × 1000 = per-kg price` holds for all kg items confirmed in screenshot.

**Correct formula** (more reliable — avoids unit parsing):
```javascript
// line_total ÷ stock_quantity_raw = per-display-unit price
const upx = r.stock_quantity_raw > 0 ? r.line_total / r.stock_quantity_raw : 0;
upx > 0 ? `₹${upx.toLocaleString("en-IN")}` : "—"
```

**Fix:** 1 line change at line 246.

---

### B2 — Split payment shows "partial" badge; individual legs not rendered

**Symptom:** Avocado (PUR-828-20261019-8007) shows badge "partial"
**Expected:** "Cash ₹100 · UPI ₹200"

**Root cause:** `r.partial_payments` array is returned by the API (G-039 CLOSED —
backend confirmed, `[{Cash,100,null},{UPI,200,null}]`) but `PurchaseReport.jsx`
lines 251-255 never access it — only `r.Payment_Type` is read:
```javascript
// PurchaseReport.jsx lines 252-254 — INCOMPLETE
{r.Payment_Type
  ? <Badge>{r.Payment_Type}</Badge>
  : "—"}
```

**Fix:** Replace 5 lines (251-255) with conditional — when
`Payment_Type === "partial"` and `partial_payments.length > 0`, render each
leg. Fall back to badge for non-partial or legacy rows.

---

## Code Reality

**NONE** (for the correct behaviour):
- B1 correct formula: absent — line 246 uses raw `unit_price`
- B2 legs display: absent — `partial_payments` never accessed

---

## Duplicate Check

| Check | Result |
|-------|--------|
| BUG-036 (gm→kg app-wide) | RELATED pattern — DISTINCT (different file, different field) |
| G-039 (partial_payments backend gap) | CLOSED — backend live, frontend gap is new |
| Any prior CR-051 bug | NONE — first reported |

**Duplicate check: DISTINCT.**

---

## Blast Radius

| Metric | Value |
|--------|-------|
| Files | 1 — `PurchaseReport.jsx` |
| api.js | NO change |
| Lines changed | B1: 1 line; B2: 5 lines → 8 lines |
| Scope | SMALL |

---

## Severity

**P1 — HIGH**
Both bugs are immediately visible on first use of the new screen.
Unit prices are wrong for every row. Split payment rows are uninformative.
No workaround within the app.

---

## Open Questions

None. Both root causes confirmed. No owner decisions needed.

---

## Next Step

→ **BUG FIX agent** directly (SMALL scope, 1 file, root causes pinpointed).
Gate 3 plan waivable (policy: Impl-Plan waivable for bugs; fixes fully
specified here).
