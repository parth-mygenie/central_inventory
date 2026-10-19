# BUG-055 + BUG-057 — Gate 2: Impact Analysis (Batch)

> **IDs:** BUG-055 (Invoice # field) · BUG-057 (Expiry Enter nav)
> **Gate:** 2 — Impact Analysis
> **Role:** PLANNING
> **Date:** 2026-10-19
> **Stage Dispatch:** Impact Analysis only — stop at Gate 2.
> **File:** `AddStockPurchaseForm.jsx` (both items, 1 file)

---

## Step 0 — Code Reality Check

```bash
grep -c "invoiceNumber\|invoice_number\|Invoice #" AddStockPurchaseForm.jsx
# → 0  (BUG-055: NONE confirmed)

grep -n "querySelector\|getElementById.*item\|item-select" AddStockPurchaseForm.jsx
# → line 697: data-testid="item-select-{idx}" on the button
# → NO querySelector anywhere in handleKeyDown — NONE confirmed
```

**BUG-055 Code Reality: NONE**
**BUG-057 Code Reality: NONE** — correct focus target absent, wrong target hardcoded

---

## Step 1 — Conflict Pre-Check

### L7 — Last modifier of `AddStockPurchaseForm.jsx`
CR-047 (IMPLEMENTED, 2026-10-18) — full rewrite. CR-039 preserved Upload Invoice tab.

### Registry — active items on same file

| ID | Status | Lines touched | Conflict? |
|----|:------:|---------------|:---------:|
| CR-047 | IMPLEMENTED | Full rewrite | ✅ NONE — code done |
| BUG-051 | PROPOSED | lines ~105, ~179 (hasDuplicates gate) | ✅ NONE — not started, different lines |
| BUG-052 | IMPLEMENTED | useEffect legs auto-fill | ✅ NONE — code done |
| BUG-055 | OPEN | lines 42, 214, 196, 514-522 | This item |
| BUG-057 | OPEN | lines 681-682 | This item |
| CR-052 | PROPOSED | new Excel upload — different section | ✅ NONE |

**Conflict: NONE.** BUG-055 and BUG-057 touch non-overlapping lines.
Both can be implemented in the same session.

**Execution order within session:** BUG-057 first (line 681-682) → BUG-055
(lines 42, 196, 214, 514-522). Either order is safe but
BUG-057 is smaller and verifiable independently.

---

## Step 2 — Gate 2: Impact Analysis

### 2.1 Data Flow Traces

---

#### BUG-055 — Invoice # field

```
User fills header strip:
  Vendor → Date → Fare → [Invoice # NEW] → Payment

User clicks Review & Confirm:
  handleSubmit() line 202
    payload = {
      vendor_id, purchase_date, payment_type, tot_amount,
      item_total, tot_fair, tot_tax, partial_payments?,
      purchase_items[],
      invoice_number: invoiceNumber  ← NEW (omitted when empty)
    }
    api.addPurchase(payload)         ← raw passthrough, no api.js change needed

Reset (resetForm line 195):
  setRows, setVendorId, setFare, ... invoiceNumber → setInvoiceNumber("")  ← NEW
```

State introduced: `invoiceNumber` (string, default `""`)
UI introduced: `<Input>` in header strip between Date and Fare
Payload key introduced: optional `invoice_number` (omitted when empty, no duplicate check)

---

#### BUG-057 — Expiry Enter navigation

```
User presses Enter in expiry <Input> of row idx:
  handleKeyDown("expiry", e)  [line 672]
    order = ["qty", "rate", "batch", "expiry"]
    ci = 3 (last index)
    → else if (!e.shiftKey) [line 679]

  CURRENT Case A (isLast + valid row):
    onTabFromLast()                    → addRow() appends emptyRow()
    → React state update → re-render
    → NO focus set → browser default = qty-{idx+1}   ← WRONG

  CURRENT Case B (not last OR incomplete):
    document.getElementById(`qty-${idx + 1}`)?.focus()  ← line 682 WRONG TARGET
    → no element with id="item-select-*" exists in the DOM
    → the item combobox is a <button data-testid="item-select-{idx}"> [line 697]
    → getElementById cannot find it → falls through silently to qty tab-stop

DESIRED:
  Both cases → focus document.querySelector(`[data-testid="item-select-${idx+1}"]`)
  Case A needs setTimeout(50ms) to wait for React to render the new row
  (same pattern as line 718: setTimeout(() => getElementById("qty-{idx}")?.focus(), 50))
```

No new state. No API. Pure DOM focus management.

---

### 2.2 Affected Files

| File | Change type | Edits |
|------|------------|-------|
| `AddStockPurchaseForm.jsx` | Additive (BUG-055) + 1 line replace (BUG-057) | 6 targeted changes |

**No other file is affected.** `api.js` is a raw passthrough — `addPurchase(payload)`
passes whatever keys are in `payload` through. No new export needed.

---

### 2.3 Detailed Change Map

#### BUG-055 — Change 1: State declaration

| | |
|-|-|
| File | `AddStockPurchaseForm.jsx` |
| After | Line 42 — `const [fare, setFare] = useState(0);` |
| Insert | 1 line |
| Risk | LOW — new isolated state, no existing logic touched |

```javascript
const [invoiceNumber, setInvoiceNumber] = useState("");   // BUG-055
```

---

#### BUG-055 — Change 2: Header strip input

| | |
|-|-|
| File | `AddStockPurchaseForm.jsx` |
| After | Line 514 — closing `</div>` of Purchase Date block |
| Before | Line 516 — `{/* Fare */}` comment |
| Insert | 7 lines |
| Risk | LOW — new `<div>` slot in flex row; flex layout absorbs it gracefully |

```jsx
{/* Invoice # — BUG-055 */}
<div style={{ flex: "0.9", minWidth: 0 }}>
  <p className="text-[10px] font-medium text-muted-foreground mb-1">Invoice #</p>
  <Input data-testid="invoice-number-input" placeholder="e.g. INV-001"
    value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
    className="h-8 text-xs" />
</div>
```

**Header strip order after fix:**
`Vendor | Purchase Date | Invoice # | Fare | [divider] | Payment`

---

#### BUG-055 — Change 3: Payload key

| | |
|-|-|
| File | `AddStockPurchaseForm.jsx` |
| After | Line 214 — `tot_tax: 0,` |
| Insert | 1 line |
| Risk | LOW — spread conditional: key only included when value non-empty |

```javascript
...(invoiceNumber.trim() && { invoice_number: invoiceNumber.trim() }),  // BUG-055
```

---

#### BUG-055 — Change 4: Reset

| | |
|-|-|
| File | `AddStockPurchaseForm.jsx` |
| Line | 196 — `function resetForm()` body |
| Current | `setRows([emptyRow()]); setVendorId(""); setFare(0);` |
| Change | Append `setInvoiceNumber("");` to the same line (or next line) |
| Risk | LOW — additive reset, same pattern as all other header fields |

---

#### BUG-057 — Change 5: handleKeyDown else-if body

| | |
|-|-|
| File | `AddStockPurchaseForm.jsx` |
| Lines | 679-683 — the `else if (!e.shiftKey)` block |
| Current | 5 lines |
| New | 7 lines |
| Risk | LOW — replaces one `getElementById` with `querySelector` + adds `setTimeout` for Case A |

**Current (lines 679-683):**
```javascript
} else if (!e.shiftKey) {
  e.preventDefault();
  if (isLast && row.itemId && Number(row.qty) > 0 && row.batch) onTabFromLast();
  else document.getElementById(`qty-${idx + 1}`)?.focus();
}
```

**New:**
```javascript
} else if (!e.shiftKey) {
  e.preventDefault();
  if (isLast && row.itemId && Number(row.qty) > 0 && row.batch) {
    onTabFromLast();
    setTimeout(() => document.querySelector(`[data-testid="item-select-${idx + 1}"]`)?.focus(), 50);
  } else {
    document.querySelector(`[data-testid="item-select-${idx + 1}"]`)?.focus();
  }
}
```

`setTimeout(50ms)` — same pattern as line 718 (`setTimeout(() => getElementById("qty-{idx}")?.focus(), 50)`). Required because `onTabFromLast()` calls `setRows()` — React must re-render to insert the new row's DOM button before `querySelector` can find it.

---

### 2.4 Risk Assessment

| Change | Risk | Mitigation |
|--------|:----:|-----------|
| BUG-055 Ch.1 — state | LOW | Isolated new state |
| BUG-055 Ch.2 — header input | LOW | Additive flex slot; flex absorbs extra child gracefully |
| BUG-055 Ch.3 — payload key | LOW | Spread conditional — omitted when empty, no API contract change |
| BUG-055 Ch.4 — reset | LOW | Same pattern as other resets in same function |
| BUG-057 Ch.5 — handleKeyDown | LOW | `querySelector` replaces `getElementById` for same DOM; `setTimeout` pattern already proven at line 718 |

**Overall risk: LOW.** All changes are in one leaf component.
No API changes. No shared state changes. No hooks affected.

---

### 2.5 Downstream Consumers

| Consumer | Impact |
|----------|--------|
| `api.addPurchase()` | NO change — raw passthrough. `invoice_number` key in payload is silently ignored by the proxy if empty; passed through when present. |
| Purchase Report (CR-051) | `vendor-item-list` returns `invoice_number` per row — purchases made after this fix will show invoice # in the report. Pre-fix purchases show "—". **No Purchase Report code change needed.** |
| Confirm Review screen (lines 296-350) | Currently shows: Vendor, Date, Payment summary. Invoice # not shown. Acceptable — it's reference metadata, not a core confirmation detail. |
| `resetForm()` | Extended cleanly |
| No other components import SpreadsheetRow | NONE |

---

### 2.6 Open Questions

**None.** All decisions confirmed:
- Q1 (duplicate check): store-only — no warning (owner confirmed, 2026-10-19)
- Header strip position: between Date and Fare (consistent with form flow: date → invoice # → cost → payment)
- Confirm screen: no change needed (review shows vendor/date/payment only — acceptable)

---

### 2.7 Verification Matrix (seeds Gate 6 QA)

| # | Bug | Check | How |
|---|-----|-------|-----|
| V1 | BUG-055 | "Invoice #" input visible in header strip | Browser: /purchase → Manual Entry → header shows Invoice # field |
| V2 | BUG-055 | Typing an invoice number and submitting sends it | Browser: fill form with INV-TEST-001 → submit → check toast or network payload |
| V3 | BUG-055 | Leaving Invoice # empty still submits (optional field) | Browser: submit with no invoice # → no validation error |
| V4 | BUG-055 | Reset clears the Invoice # field | Browser: fill form → Reset → Invoice # cleared |
| V5 | BUG-055 | Invoice # appears in Purchase Report for that txn | Browser: after submit → /reports/purchase → row shows Invoice # |
| V6 | BUG-057 | Enter in expiry field jumps to NEXT ROW's item search | Browser: fill row, press Enter in expiry → cursor lands on "Search item…" button of next row |
| V7 | BUG-057 | Enter in expiry of LAST complete row adds new row + focuses its item search | Browser: fill last row → Enter in expiry → new row 3 added → cursor in its item search |
| V8 | BUG-057 | Tab in expiry still follows same fixed behaviour | Browser: Tab from expiry → same new target |
| V9 | Regression | Within-row Enter navigation (qty→rate→batch→expiry) unchanged | Browser: row nav works for steps 1-3 |
| V10 | Regression | Selecting an item still focuses Qty (line 718 unchanged) | Browser: select item from combobox → cursor moves to qty |

---

## Gate 2 Summary

| Field | Value |
|-------|-------|
| Code Reality | NONE for both — all targets absent |
| Conflict | NONE |
| Files WILL change | 1 — `AddStockPurchaseForm.jsx` |
| Files NOT touching | `api.js`, any other file |
| Total edits | 5 changes (4 for BUG-055 + 1 for BUG-057) |
| Lines added | ~10 (BUG-055: +9; BUG-057: +2 net) |
| Risk | LOW overall |
| Open Questions | None |
| Verification checks | 10 |

**→ Gate 2 COMPLETE. Awaiting Gate 3 or direct BUG FIX.**
