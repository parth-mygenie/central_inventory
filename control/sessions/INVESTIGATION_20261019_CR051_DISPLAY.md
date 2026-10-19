# INVESTIGATION REPORT — CR-051 Purchase Report: Unit Price + Split Payment Display
> **Date:** 2026-10-19
> **Role:** INVESTIGATION
> **Triggered by:** Owner-reported via screenshot (2026-10-19)
> **Screen:** `/reports/purchase` (CR-051, just implemented)
> **File:** `frontend/src/components/central-inventory/PurchaseReport.jsx`
> **Outcome:** 2 root causes confirmed → register as BUG-056 (batch)

---

## Screenshot Evidence

From owner screenshot (2026-10-19):

| Row | Qty | Amount | Unit Price (shown) | Payment (shown) |
|-----|-----|--------|--------------------|-----------------|
| Avocado | 1 kg | ₹10 | **₹0.01** ← wrong | Cash |
| Avocado | 2 kg | ₹200 | **₹0.1** ← wrong | **partial** ← incomplete |
| American Corn | 10 kg | ₹2,000 | **₹0.2** ← wrong | Cash |
| makkhan | 2 kg | ₹160 | **₹0.08** ← wrong | Cash |

Expected:
- Unit prices: ₹10/kg, ₹100/kg, ₹200/kg, ₹80/kg
- Partial payment row: "Cash ₹100 · UPI ₹200" (not just "partial")

---

## B1 — Unit Price: API returns per-gram, rendered as-is

### Data Flow Trace

```
vendor-item-list API response (per record):
  unit_price: 0.08         ← numeric, POS base unit = GRAM
  stock_quantity_raw: 2    ← qty in DISPLAY unit (kg)
  line_total: 160          ← total rupees (numeric)
  Quantity: "2 kg"         ← display string

PurchaseReport.jsx line 246:
  {r.unit_price > 0 ? `₹${r.unit_price}` : "—"}
                                    ↑
  renders raw per-gram value directly → ₹0.08 displayed
```

### Proof (arithmetic)

| Item | unit_price (API) | × 1000g/kg | = per-kg | stock_qty_raw | line_total check |
|------|:----------------:|:----------:|:--------:|:-------------:|:----------------:|
| makkhan | 0.08 | × 1000 | **₹80/kg** | 2 kg | 80×2=160 ✓ |
| American Corn | 0.2 | × 1000 | **₹200/kg** | 10 kg | 200×10=2000 ✓ |
| Avocado (1kg) | 0.01 | × 1000 | **₹10/kg** | 1 kg | 10×1=10 ✓ |
| Avocado (2kg) | 0.1 | × 1000 | **₹100/kg** | 2 kg | 100×2=200 ✓ |

### Root Cause

`unit_price` in the POS API is stored per-gram (the base unit), not per the
display unit shown in `Quantity`. `PurchaseReport.jsx` line 246 renders
`r.unit_price` directly without converting to display unit.

### Correct Computation

The most reliable formula (avoids unit parsing entirely):
```
display_unit_price = stock_quantity_raw > 0
  ? (line_total / stock_quantity_raw)
  : 0
```

This is safe because `line_total` (₹ total) ÷ `stock_quantity_raw` (qty in
display unit, e.g. kg) gives price per display unit regardless of what the
base unit is.

Display: `stock_quantity_raw > 0 ? "₹" + (line_total / stock_quantity_raw).toLocaleString("en-IN") : "—"`

Show "—" when `line_total === 0` (free items, no cost recorded).

### Fix Location

`PurchaseReport.jsx` line 246 — 1 line change.

---

## B2 — Split Payment: `partial_payments[]` ignored, only `Payment_Type` shown

### Data Flow Trace

```
vendor-item-list API response (G-039 — CLOSED, backend confirmed):
  Payment_Type: "partial"
  partial_payments: [
    { payment_mode: "Cash",  amount: 100, transaction_id: null },
    { payment_mode: "UPI",   amount: 200, transaction_id: null }
  ]
  (non-split rows return partial_payments: [])

PurchaseReport.jsx lines 251-255:
  {r.Payment_Type
    ? <Badge variant="outline">{r.Payment_Type}</Badge>
    ↑
    renders "partial" as a static badge — r.partial_payments is NEVER read
    → no legs displayed
```

### Root Cause

`PurchaseReport.jsx` was written using `r.Payment_Type` only. The
`partial_payments` array was confirmed available in the API (G-039 CLOSED,
2026-10-19) but was not wired into the CR-051 implementation — it was a
known gap in the scope at Gate 3 time.

The component needs to:
1. Detect `r.Payment_Type === "partial"` AND `r.partial_payments?.length > 0`
2. Render each leg: `{mode} ₹{amount}` joined with `·`
3. Fall back to plain `Payment_Type` badge when `partial_payments` is empty
   (backwards compat for rows that pre-date the backend change)

### Fix Location

`PurchaseReport.jsx` lines 251-255 — replace 5 lines (~8 new lines).

Sketch:
```jsx
<td className="px-3 py-1.5">
  {r.Payment_Type === "partial" && r.partial_payments?.length > 0
    ? <div className="flex flex-col gap-0.5">
        {r.partial_payments.map((leg, i) => (
          <span key={i} className="text-[10px] whitespace-nowrap">
            {leg.payment_mode} ₹{Number(leg.amount).toLocaleString("en-IN")}
          </span>
        ))}
      </div>
    : r.Payment_Type
      ? <Badge variant="outline" className="text-[9px] py-0 px-1.5 whitespace-nowrap">
          {r.Payment_Type}
        </Badge>
      : <span className="text-muted-foreground">—</span>}
</td>
```

---

## Blast Radius

| Metric | Value |
|--------|-------|
| Files affected | 1 — `PurchaseReport.jsx` only |
| Lines changed | 2 changes: line 246 (1 line), lines 251-255 (5→8 lines) |
| api.js | NO change — `partial_payments` already in response payload |
| Other screens | NONE |
| Scope | SMALL |

---

## Root Cause Classification

| Bug | Category | Action |
|-----|----------|--------|
| B1 (unit price) | Frontend display bug — API base unit not converted | → BUG FIX: line 246 formula change |
| B2 (split payment) | Frontend display gap — partial_payments array ignored | → BUG FIX: lines 251-255 conditional render |

No backend changes needed. Both fixes are in `PurchaseReport.jsx` only.

---

## Duplicate Check

| Check | Result |
|-------|--------|
| BUG-036 (gm→kg normalisation) | RELATED pattern (same gm base unit issue) — DISTINCT file/screen |
| G-039 (partial_payments backend) | CLOSED — backend data is available; this is a frontend display gap only |
| Any prior Purchase Report bug | NONE — screen just created (CR-051) |

**Duplicate check: DISTINCT for both. No prior registration covers these.**

---

## Evidence

| Type | Detail |
|------|--------|
| Screenshot | Owner-provided (2026-10-19): unit prices ₹0.08/₹0.1/₹0.2/₹0.01; "partial" badge |
| Code trace | B1: line 246 `r.unit_price` raw; B2: lines 251-255 no `partial_payments` access |
| API proof | B1: 0.08×1000=80, line_total/stock_quantity_raw=80 ✓; B2: G-039 CLOSED confirms array |
| Source | OWNER-REPORTED (screenshot, 2026-10-19) |
| Confidence | CONFIRMED |
