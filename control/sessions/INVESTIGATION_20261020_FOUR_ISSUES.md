# INVESTIGATION REPORT — 4 Owner-Reported Issues
> **Date:** 2026-10-20
> **Role:** INVESTIGATION
> **Triggered by:** Owner — 4 feedback items reported with screenshots
> **Items registered:** BUG-058, BUG-059, BUG-060, BUG-061
> **Files probed:** AddStockPurchaseForm.jsx, PurchaseReport.jsx, DirectDispatchForm.jsx, vendor-item-list API

---

## Issue 1 — Review Screen: Fare Not Shown (→ BUG-058)

### Symptom
Owner screenshot shows "Confirm Stock Purchase" review screen with Fare ₹100 entered in the form.
The review header shows only Vendor / Date / Payment. Grand Total is ₹600 (items ₹500 + fare ₹100) but
there is NO Fare line, NO Invoice # line, and NO subtotal breakdown visible.

### Data Flow Trace

```
AddStockPurchaseForm.jsx:
  fare state (line 42) → fullPayableTotal = grandTotal + fare (line 92)
  confirmMode=true → renders confirm screen (lines 295–364)

Confirm screen header (lines 302–320):
  3-column grid: Vendor | Date | Payment
  ← FARE MISSING HERE
  ← INVOICE # MISSING HERE

Grand Total row (lines 346–350):
  Shows fullPayableTotal (correct: items + fare)
  ← No breakdown: no "Items: ₹500" + "Fare: ₹100" subtotal lines
```

### Root Cause
`confirmMode` render block (lines 302–321) has a 3-column header grid. `fare` and `invoiceNumber`
state variables exist and are populated, but are NOT included in the confirm screen header.
The Grand Total is mathematically correct (uses `fullPayableTotal`) but gives no visual evidence
of what the fare charge was.

### Classification
**Frontend bug** — missing fields in review screen. No backend dependency.

### Fix Location
- `AddStockPurchaseForm.jsx` lines 302–321 (header grid → add Fare + Invoice # columns)
- Lines 346–350 (Grand Total → add Items subtotal + Fare line for breakdown)

### Blast Radius
- 1 file: `AddStockPurchaseForm.jsx`
- Scope: SMALL (~10 lines)
- Hotspot: NO

---

## Issue 2 — BATCH Enter Skips Date Field (→ BUG-059)

### Symptom
Owner reports: "when the calendar input field gets totally skipped after enter on BATCH — it should be:
BATCH → date(month) → Enter → day → Enter → year → Enter → next row"

### Data Flow Trace

```
SpreadsheetRow.handleKeyDown (line 682–705):
  order = ["qty", "rate", "batch", "expiry"]

User presses Enter on batch input:
  1. onKeyDown fires on batch field
  2. handleKeyDown("batch", e) → e.preventDefault()
  3. document.getElementById('expiry-0')?.focus()   ← date field receives focus

Browser behavior on focus-during-keydown:
  4. keyup event fires on the NEWLY FOCUSED element (the date input)
  5. date input's onKeyUp={e => handleKeyDown("expiry", e)} fires
  6. handleKeyDown("expiry", e): e.key === "Enter", field "expiry" is index 3 (last)
  7. → !e.shiftKey → goes to next row / adds new row
  8. Date field was focused for ~0ms and then abandoned → skipped entirely
```

### Root Cause
**Key event transfer bug**: When `e.preventDefault()` is called on batch's `onKeyDown` and focus
is programmatically moved to the date input, the browser fires `keyup` on the newly focused element
(the date input). The date input's `onKeyUp` handler immediately sees Enter and advances past the
date field before the user has typed anything.

This is a known Chromium behaviour: `keyup` fires on the element that has focus at release time,
not the element that had focus at press time.

**Secondary**: `<input type="date">` does not natively advance through month/day/year sub-fields
on Enter — only Tab/ArrowRight do that. The desired sub-field navigation (Enter → month → day → year)
is not achievable with the native date picker. Enter can be used to confirm the date and move to
next row, but not to step through sub-fields.

### Fix Approach
Add a `justFocused` ref inside `SpreadsheetRow`:
```jsx
const justFocused = useRef(false);

// expiry input:
onFocus={() => { justFocused.current = true; }}
onKeyUp={e => {
  if (justFocused.current) { justFocused.current = false; return; }
  handleKeyDown("expiry", e);
}}
```
This drops the spurious Enter keyup that fires when focus arrives from batch,
allowing the user to actually type in the date field before Enter advances to next row.

**Note on sub-field Enter navigation**: Native `<input type="date">` sub-fields (mm/dd/yyyy)
respond to Tab and ArrowRight, not Enter. We cannot make Enter step through sub-fields without
replacing the date input with a custom picker. Recommend: Enter on date field = confirm date + next row.
This gives: BATCH → Enter → [date field focused, user types or arrow-keys date] → Enter → next row.

### Classification
**Frontend bug** — keyup event transfer on programmatic focus move. No backend dependency.

### Fix Location
- `AddStockPurchaseForm.jsx`, `SpreadsheetRow` component (~line 654)
- Add `justFocused` ref + wire `onFocus` + update `onKeyUp` guard

### Blast Radius
- 1 file: `AddStockPurchaseForm.jsx`
- Scope: SMALL (~5 lines inside SpreadsheetRow)
- Hotspot: NO

---

## Issue 3 — Dispatch: Multi-Batch Source Selection (→ BUG-060)

### Symptom
Owner: "when dispatching the source selector should be there — if I want to select 5kg from one
batch and 5kg from second batch, is that possible?"

Screenshots show: Apple has 2 FEFO segments available (AME-19OCT26-1148 and APP-19OCT26-1528).
User wants to dispatch from both simultaneously.

### Data Flow Trace

```
DirectDispatchForm.jsx:

fefoAutoSelect() (line 55–73):
  → correctly computes multi-alloc: [{segment_id:A, qty:5}, {segment_id:B, qty:5}]
  → returns allocations[] + short flag

Row build (line 219–222):
  fefoAllocs = [{seg_A, qty5}, {seg_B, qty5}]
  autoSource = fefoAllocs.length === 1
    ? { mode:"segment_id", segment_id: fefoAllocs[0].segment_id }
    : null                   ← NULL when multi-alloc → sourceSelector stays null

UI render (lines 780–813):
  Renders one <select> per alloc (2 selects for 2 batches)
  Each select has ONE option (the FEFO batch) — no alternatives to pick
  onChange: onUpdate("sourceSelector", {mode:"segment_id", segment_id: single_id})
    → overwrites row.sourceSelector to a SINGLE segment — ignores multi-alloc

Dispatch payload (line 325–330):
  { source_inventory_master_id, quantity: total_qty, source_selector: r.sourceSelector }
  → source_selector = null for multi-alloc rows
  → Entire quantity dispatched with NO source_selector
```

### Root Cause: Two layers

**Layer 1 — Frontend incomplete wiring:**
- `autoSource = null` when multi-alloc → no sourceSelector set
- `onChange` on FEFO dropdowns overwrites to single segment
- Multi-alloc rendering was scaffolded (the multi-select UI renders) but never wired to payload

**Layer 2 — API contract unknown for multi-source per item:**
- Documented contract: `items: [{source_inventory_master_id, quantity, unit, source_selector: {mode, segment_id}}]`
- Multi-batch would require either:
  - Option A: `source_selector` as array `[{segment_id: X, qty: 5}, {segment_id: Y, qty: 5}]` — NOT confirmed in any API docs
  - Option B: Two separate items[] entries for the same `source_inventory_master_id` with different `source_selector` and `qty` — UNKNOWN if API accepts duplicate master IDs in items[]

### Investigation Needed (before fix)
API probe: send `items: [{id: X, qty: 5, source_selector: {seg_A}}, {id: X, qty: 5, source_selector: {seg_B}}]`
(same master_id twice) and observe API response. If it works → Option B frontend-only fix.
If rejected → new backend gap for array source_selector.

**Cannot probe without a live dispatch call (modifies stock). Must test in dev environment.**

### Classification
**Frontend bug + possible backend gap.** Frontend scaffolding is incomplete. API contract needs probing.

### Fix Location (pending API probe)
Option B (if API accepts duplicate master_ids):
- `DirectDispatchForm.jsx`: build `payloadItems` by splitting multi-alloc rows into one item per alloc
- Remove per-alloc `<select>` dropdowns (not useful since source is FEFO-fixed per batch)
- Show FEFO badge per batch with qty, no dropdown needed

### Blast Radius
- 1 file: `DirectDispatchForm.jsx`
- Scope: MEDIUM (payload builder + UI rendering changes)
- Hotspot: NO (not in HIGH-RISK list)
- Backend gap if API doesn't support duplicate master_ids: file as G-040

---

## Issue 4 — Purchase Report Fare Not Shown (→ BUG-061) — NO-CODE / SKIP GATE

### Symptom
Owner: "purchase report doesn't show fare price — PUR-828-20261020-8011 for example"
Screenshot: Baby Corn 100kg, Amount ₹1,000 — but fare ₹200 was charged on this purchase.
Summary bar shows ₹3,898 total — excluding fares across all purchases.

### API Probe Evidence

```bash
curl vendor-item-list?from_date=2026-10-01&to_date=2026-10-21
# Auth: owner@mygenietest002.com (RID 828)

Row PUR-828-20261020-8011:
  "line_total": 1000,     ← items only
  "tot_fair":   200,      ← FARE — confirmed field name
  "tot_amount": 1200,     ← items + fare = total purchase cost
  "partial_payments": []

Other fare-bearing transactions (same dataset):
  PUR-828-20261019-8006: line_total=2000, tot_fair=300, tot_amount=2300
  PUR-828-20261019-8007: line_total=200,  tot_fair=100, tot_amount=300

Multi-item transactions (2 rows same txn_id, ZERO fare):
  PUR-828-20261019-8009: 2 rows, tot_fair=0
  PUR-828-20261019-8010: 2 rows, tot_fair=0

Root total_amount (API root field): "3998.00"
Correct total (sum of unique tot_amount per txn): 3998 + 300 + 100 + 200 = 4598
  (3998 = items total, G-038 confirmed this excludes fare)
```

### Root Cause

**Amount column** (`PurchaseReport.jsx` line 252):
```jsx
₹{Number(r.line_total).toLocaleString("en-IN")}
```
Uses `line_total` (items only). Fare is in `tot_fair` but not displayed.

**Summary total** (`PurchaseReport.jsx` line 55):
```javascript
setTotalAmount(d.total_amount ?? "0");
```
Uses API root `total_amount` = sum(line_totals). Per G-038 (L9), this field excludes fare.
Correct total must be computed as: deduplicate by transaction_id → sum unique `tot_amount`.

**Multi-row transaction safety:**
Cannot substitute `tot_amount` directly in the row Amount column — for multi-item purchases,
`tot_amount` would be the SAME value on all rows (the whole purchase total), causing double-counting.
Must add a separate "Fare" column showing `tot_fair`, displayed only on the FIRST row
per transaction_id group.

### Fix Approach (for BUG FIX agent — WHEN OWNER LIFTS NO-CODE)

1. Amount column: **no change** (keep `line_total` — correct per-item amount)
2. Add **Fare column** after Amount:
   - Pre-process rows: mark first row per transaction_id with `isFirstInTxn = true`
   - Cell: `isFirstInTxn && r.tot_fair > 0 ? ₹{r.tot_fair} : "—"`
3. Summary total:
   ```javascript
   const seen = new Set();
   const correctTotal = rows.reduce((s, r) => {
     if (!seen.has(r.transaction_id)) { seen.add(r.transaction_id); return s + Number(r.tot_amount || 0); }
     return s;
   }, 0);
   setTotalAmount(correctTotal);
   ```

**Owner instruction: NO-CODE, SKIP GATE** — investigation only, registered for awareness.
BUG-061 created at Gate 1 only. Gate 4 GO needed before implementation.

### Classification
**Frontend bug** — API has data (`tot_fair`, `tot_amount`), frontend doesn't surface it.

### Fix Location (when approved)
- `PurchaseReport.jsx` only — ~15 lines
- Scope: SMALL

---

## Summary Table

| ID | Issue | Root Cause | File | Scope | Next Step |
|----|-------|-----------|------|-------|-----------|
| BUG-058 | Review screen: fare + invoice # missing | Header grid missing fields | AddStockPurchaseForm.jsx | SMALL | PLANNING → BUG FIX |
| BUG-059 | BATCH Enter → date skipped | keyup fires on newly-focused date input | AddStockPurchaseForm.jsx | SMALL | PLANNING → BUG FIX |
| BUG-060 | Dispatch multi-batch source | Frontend wiring incomplete + API contract unknown | DirectDispatchForm.jsx | MEDIUM | API probe → PLANNING |
| BUG-061 | Purchase Report fare not shown | line_total used instead of tot_amount+tot_fair | PurchaseReport.jsx | SMALL | **NO-CODE (owner)** — Gate 1 only |

---

## Key Evidence

| Issue | Evidence |
|-------|---------|
| BUG-058 | Code trace: lines 302–321 (header grid), line 347 (Grand Total). Owner screenshot. |
| BUG-059 | Code trace: handleKeyDown lines 682–705, expiry onKeyUp line 808. Chromium keyup-on-focus-transfer confirmed. |
| BUG-060 | Code trace: autoSource=null (line 221), onChange overwrites (line 788), payload single selector (line 329). API docs show single source_selector only. |
| BUG-061 | Live API probe: PUR-828-20261020-8011 confirmed tot_fair=200, tot_amount=1200, line_total=1000. G-038 confirmed backend won't fix root total_amount field. |
