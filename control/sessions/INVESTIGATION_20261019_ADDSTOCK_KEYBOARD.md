# INVESTIGATION REPORT — Add Stock: Invoice # (BUG-055) + Expiry Enter Navigation
> **Date:** 2026-10-19
> **Role:** INVESTIGATION
> **Screen:** `/purchase` (AddStockPurchaseForm.jsx)
> **Items:** BUG-055 (A1 — Invoice # field, Q1 now answered) + new BUG-057 (expiry Enter nav)

---

## Item 1 — BUG-055: Invoice # (A1) — Q1 answered, fix locations confirmed

### Q1 Resolution

**Owner answer (from CR-051 Purchase Report session):**
> "invoice number can be duplicate cause it depends on vendor"

**Decision for Add Stock form:** Store the value only — no
`checkInvoiceNumber()` duplicate warning. Consistent with how
Purchase Report handles it (CR-051 A2).

### Exact Fix Locations in `AddStockPurchaseForm.jsx`

**Fix 1 — State declaration (line 42 area):**
Add after `const [fare, setFare] = useState(0);` at line 42:
```javascript
const [invoiceNumber, setInvoiceNumber] = useState("");   // BUG-055
```

**Fix 2 — Header strip input (after Purchase Date block, lines 509-514):**
Insert a new `<div>` slot between Date and Fare:
```jsx
{/* Invoice # — BUG-055 */}
<div style={{ flex: "0.9", minWidth: 0 }}>
  <p className="text-[10px] font-medium text-muted-foreground mb-1">Invoice #</p>
  <Input data-testid="invoice-number-input" placeholder="e.g. INV-001"
    value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
    className="h-8 text-xs" />
</div>
```

**Fix 3 — Payload (line 207-233 block):**
Add after `tot_tax: 0,` line:
```javascript
...(invoiceNumber.trim() && { invoice_number: invoiceNumber.trim() }),  // BUG-055
```

**Fix 4 — Reset (line 196 area):**
`setRows([emptyRow()]); setVendorId(""); setFare(0);` → add `setInvoiceNumber("");`

Total: 1 state + 1 JSX block + 1 payload key + 1 reset. SMALL. 1 file only.

---

## Item 2 — NEW BUG: Enter from Expiry → qty (wrong) instead of item-select

### Symptom (from screenshot + owner feedback)

When pressing Enter in the **Expiry** date field of any row, focus jumps to
`qty-{idx+1}` (next row's QTY field). Owner expects focus to go to
`item-select-{idx+1}` (next row's item combobox button — the "Search item…"
trigger).

### Data Flow Trace

```
SpreadsheetRow.handleKeyDown("expiry", e)   [line 672]
  order = ["qty", "rate", "batch", "expiry"]
  ci = 3 (last index)
  → falls into else if (!e.shiftKey) branch [line 679]

  case A — isLast row + valid item/qty/batch:
    onTabFromLast()  → calls addRow() [line 168]
    addRow: setRows(prev => [...prev, emptyRow()])
    → NO FOCUS set after new row added
    → browser default focus lands on qty-{idx+1} (next tab-stop)

  case B — not last row OR row is incomplete:
    document.getElementById(`qty-${idx + 1}`)?.focus()   ← LINE 682
    → explicitly focuses next row's QTY
```

### Root Cause

Line 682:
```javascript
// CURRENT — wrong target:
else document.getElementById(`qty-${idx + 1}`)?.focus();
```

The item combobox is a `<button>` with `data-testid="item-select-{idx}"` (line 697).
It has no `id` attribute, so `getElementById` cannot target it.

### Fix (2 changes, same function)

**Change A — Case B line 682** (not-last row or incomplete row):
```javascript
// FIXED:
else document.querySelector(`[data-testid="item-select-${idx + 1}"]`)?.focus();
```

**Change B — Case A (onTabFromLast + setTimeout):**
```javascript
// FIXED: after addRow resolves, focus new row's item-select
if (isLast && row.itemId && Number(row.qty) > 0 && row.batch) {
  onTabFromLast();
  setTimeout(() => document.querySelector(`[data-testid="item-select-${idx + 1}"]`)?.focus(), 50);
}
```

`setTimeout(..., 50)` matches the same pattern already used at line 718
where item selection focuses the qty field via `setTimeout(..., 50)`.

### Blast Radius

| Metric | Value |
|--------|-------|
| File | `AddStockPurchaseForm.jsx` only |
| Lines changed | 2 (lines 679-683 area) |
| Other files | NONE |
| Scope | SMALL |

---

## Duplicate Check — BUG-057

| Check | Result |
|-------|--------|
| BUG-054 (Dispatch keyboard nav) | RELATED pattern — DISTINCT file/form |
| Any prior Add Stock keyboard nav bug | NONE in registry |

**Duplicate check: DISTINCT.**

---

## Evidence

| Type | Detail |
|------|--------|
| Screenshot | Owner-provided (2026-10-19): /purchase with 2 filled rows + empty row 3 |
| Code trace | Line 682: `getElementById("qty-{idx+1}")` — explicit wrong target confirmed |
| Source | OWNER-REPORTED (2026-10-19) |
| Confidence | CONFIRMED |
