# CR-047 — Gate 2: Impact Analysis (Complete)

> **ID:** CR-047
> **Artifact:** 2 — Impact Analysis
> **Role:** PLANNING
> **Date:** 2026-10-18 (initial) → completed 2026-10-18 (mock design addenda)
> **Agent:** PLANNING
> **Credential used for API probes:** owner@mygenietest002.com / Qplazm@10 (RID 828, type: master)
> **Code Reality:** PARTIAL (form exists, spreadsheet/add-purchase/split-payment = NONE)
> **Mock Design:** `control/sessions/CR-047_MOCK_DESIGN_REAL_DATA.html` — interactive prototype built with live API data; all behaviour patterns in this document are validated against the mock.
> **Feeds:** CR-047_ARTIFACT_3_IMPLEMENTATION_PLAN.md (Gate 3 — next step)

---

## Conflict Pre-Check (Step 1)

### L7 File Ownership

| File | Last Modifier | Last Item | Risk |
|------|--------------|-----------|------|
| `AddStockPurchaseForm.jsx` | CR-039 (2026-07-11) | Template download + file upload + parse preview | ✅ No open item |
| `api.js` | BUG-047 (2026-07-24) | deleteAddonRecipe payload fix | ✅ No open item |

**Conflict conclusion:** NONE — both files last touched July; no item currently in-flight on them.

---

## API Probes (Step 1b — live verification)

### Probe 1 — add-purchase endpoint (new, confirmed live)
```
POST /api/proxy/v2/inventory/add-purchase
Credential: owner@mygenietest002.com / RID 828

Request:
{
  "vendor_id": 282,
  "purchase_date": "2026-10-18",
  "payment_type": "Cash",
  "tot_amount": 160,
  "item_total": 160,
  "tot_fair": 0,
  "tot_tax": 0,
  "purchase_items": [
    { "Ingredient": 20856, "Unit": "kg", "quantity": 2,
      "rate": 80, "Amount": 160,
      "batch": "MAK-18OCT26-1423", "expiry_date": "2027-01-01" }
  ]
}

Response: HTTP 200
{
  "purchase_details": {
    "id": 8005,
    "transaction_id": "PUR-828-20261018-8005",
    "tot_amount": 160, "payment_type": "Cash",
    "purchase_date": "2026-10-18", "vendor_id": 282, "restaurant_id": 828
  },
  "transaction_id": "PUR-828-20261018-8005",
  "partial_payments": [],
  "added_items": [
    { "id": 13786, "ingredient": 20856, "stock_quantity": 2, "sunit": "kg",
      "purchase_id": 8005, "batch": "MAK-18OCT26-1423", "expiry_date": "2027-01-01" }
  ]
}
```
**KEY FINDING: `expiry_date` is ACCEPTED but not server-validated as mandatory.** Empty string passes. Implementation must treat it as optional.

**KEY FINDING: `batch` field accepts any string.** No length or format constraint. Auto-generated label passes cleanly.

✅ CONFIRMED. No server.py change needed. Proxy catch-all handles it.

### Probe 2 — get-inventory-master
```
75 items, 2 categories: "Vegetables & Herbs" (74), "desi dairy" (1: makkhan id=20856)
Item shape: { id, stock_title, unit, display_unit, category_id: {id, name}, ... }
```
✅ CONFIRMED. `category_id.name` used for combobox grouping.

### Probe 3 — get-vendor
```
RID 828 → 1 vendor: { id: 282, vendor_name: "masala dairy", contact_person_name: "masala man" }
```
✅ CONFIRMED.

### Probe 4 — split payment (partial_payments[])
```
{ payment_type: "partial",
  partial_payments: [{payment_mode:"Cash",amount:1500},{payment_mode:"UPI",amount:960}] }
```
⚠ **Backend does NOT validate sum(partial_payments.amount) === tot_amount** — confirmed via probe.
Frontend MUST enforce. Show balance indicator: `₹X entered of ₹Y ✓/⚠`.

---

## Data Flow Trace (Step 2)

### Current flow (to be replaced)

```
AddStockPurchaseForm.jsx:handleSubmit() [line 134]
  → for loop over validLines
  → per item: api.addStockPurchase(line.itemId, payload) [line 152]
     ↓ POST /add-stock/{inventoryMasterId} (deprecated, per-item, no split payment)
  → on success: successCount++ → toast("N items added")
```

Problems: N calls, deprecated endpoint, no split payment, wrong payment modes (Cash/Credit/Online).

### New flow (CR-047 target)

```
[Spreadsheet table: item combobox → qty → rate → batch(auto) → expiry(optional)]
     ↓
[Payment row: Mode + Amount. Split button adds 2nd leg. Balance check live.]
     ↓
[Review → Confirm → handleSubmit()]
  → Sync payment state from DOM before reading
  → ONE call: api.addPurchase(payload)
  → payload: { vendor_id, purchase_date, payment_type, tot_amount (items+fare),
               item_total (items only), tot_fair, tot_tax:0,
               [partial_payments] only if split,
               purchase_items: [{ Ingredient, Unit, quantity, rate, Amount, batch, expiry_date }] }
     ↓
  → _invalidateStockCaches()
     ↓
  → Success: show transaction_id "PUR-828-20261018-XXXX"
```

---

## Affected Files (Step 2)

### File 1: `frontend/src/services/api.js`

| Edit | Location | Change | Risk |
|------|----------|--------|------|
| A1 | After line 792 | Add `addPurchase(payload)` → `POST /proxy/v2/inventory/add-purchase` + `_invalidateStockCaches()` | LOW |
| A2 | Line 790–791 | Annotate `addStockPurchase` as `// CR-047 — DEPRECATED after this CR ships` | LOW |
| A3 | ~line 1239 exports | Add `addPurchase` to exports object | LOW |

### File 2: `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx`

**Full rewrite of Manual Entry tab + handleSubmit + confirm/success screens.**
CR-039 Upload Invoice tab (lines 261–383) **PRESERVED UNCHANGED**.

#### 2a — State shape

```javascript
// Replace current lines[] with:
const [rows, setRows] = useState([createEmptyRow()]);
const [paymentLegs, setPaymentLegs] = useState([{ mode:'Cash', amount:'', ref:'' }]);

// createEmptyRow():
{ key, itemId:'', title:'', unit:'', qty:'', rate:'', amount:'', batch:'', expiry:'' }
```

#### 2b — Header section layout

Single unified card row:
`[Vendor ▾ | flex:1.2] [Purchase Date | flex:1.0] [Fare | flex:0.55] | divider | [Payment section | flex:1.8]`

**No separate Payment card.** Payment is inline with vendor/date/fare in one strip.

#### 2c — autoBatch() — CONFIRMED FORMAT

```javascript
function autoBatch(stockTitle, rowIdx) {
  const abbrev = stockTitle.slice(0,3).toUpperCase().replace(/\s/g,'');
  const now = new Date();
  const dd  = String(now.getDate()).padStart(2,'0');
  const mon = now.toLocaleString('en',{month:'short'}).toUpperCase();
  const yy  = String(now.getFullYear()).slice(2);
  const hh  = String(now.getHours()).padStart(2,'0');
  const mm  = String(now.getMinutes()).padStart(2,'0');
  // Format: MAK-18OCT26-1423 — unique across days AND same-day purchases at different times
  const base = `${abbrev}-${dd}${mon}${yy}-${hh}${mm}`;
  // Same-minute counter for multi-row session
  const prevCount = rows.slice(0, rowIdx).filter(r => r.batch?.startsWith(base)).length;
  return prevCount > 0 ? `${base}-${prevCount+1}` : base;
}
```

**Why not `AME-OCT-18`?** Same item purchased at different times on the same day would generate identical batch labels. `AME-18OCT26-0924` vs `AME-18OCT26-1430` are distinct.

#### 2d — Spreadsheet table keyboard behaviour

**CRITICAL: `onQtyChange` and `onRateChange` must NOT call `renderRows()`.**

Calling `renderRows()` on every keystroke destroys and recreates the input DOM → cursor resets to position 0 → digits appear in reverse order.

Correct pattern:
```javascript
function onQtyChange(idx, val) {
  rows[idx].qty = val;
  const amt = computeTotal(val, rows[idx].rate);
  rows[idx].amount = amt > 0 ? amt.toFixed(2) : '';
  // Auto-batch: update DOM directly
  if (rows[idx].title && Number(val)>0 && !rows[idx].batch) {
    rows[idx].batch = autoBatch(rows[idx].title, idx);
    const batchEl = document.getElementById(`batch${idx}`);  // React ref equiv
    if (batchEl) { batchEl.value = rows[idx].batch; }
  }
  // Update amount cell in-place — preserves cursor
  const amtEl = document.getElementById(`amount${idx}`);
  if (amtEl) amtEl.value = rows[idx].amount;
  // NO re-render of the full row
  updateGrandTotal();
  updateReviewBtn();
}
```

In React, this means: do NOT trigger state update that re-renders the focused input. Use `ref` to update the amount cell imperatively. OR use uncontrolled inputs (`defaultValue` + `ref`) for qty/rate.

#### 2e — Combobox dropdown: `position:fixed` required

**CRITICAL:** The form is rendered inside a container with `overflow:hidden`. Standard `position:absolute` dropdown is clipped — appears at screen bottom-left corner.

Fix: use `position:fixed` and calculate position from `getBoundingClientRect()`:

```javascript
function openCombobox(inputRef) {
  const rect = inputRef.current.getBoundingClientRect();
  setDropdownStyle({
    position: 'fixed',
    top: rect.bottom + 4,
    left: rect.left,
    width: Math.max(280, rect.width),
  });
  setDropdownOpen(true);
}
```

Keyboard navigation in dropdown:
- ArrowDown in search input → focus first `.combobox-item`
- ArrowDown/ArrowUp on items → navigate list
- Enter on item → select
- Escape → close, return focus to trigger

#### 2f — Duplicate item detection

When same `itemId` appears in two rows: show `⚠ dup` badge on the item cell.
In combobox dropdown: show `↑ row N` indicator next to already-used items (still selectable — valid use case: same item, different expiry/batch).

```javascript
// Build per-render:
const itemIdCount = {};
rows.forEach(r => { if (r.itemId) itemIdCount[r.itemId] = (itemIdCount[r.itemId]||0)+1; });
// In each row:
const isDuplicate = row.itemId && itemIdCount[row.itemId] > 1;
```

#### 2g — Expiry field: OPTIONAL

API accepts empty `expiry_date`. Do NOT mark as required (`*`). Remove from `validLines` filter. Auto-open next row triggers on batch completion, NOT on expiry completion. `autocomplete="off"` on the date input to prevent browser auto-fill.

#### 2h — Two totals: grandTotal vs fullPayableTotal

```javascript
// Grand total bar: shows items only (label says "excl. fare")
function grandTotal(rows) {
  return rows.reduce((s,r) => s + (Number(r.qty)*Number(r.rate)||0), 0);
}

// Full payable: used in API tot_amount AND payment balance validation
function fullPayableTotal(rows, fare) {
  return grandTotal(rows) + (Number(fare)||0);
}
```

**Payment balance check compares against `fullPayableTotal`**, not `grandTotal`.
**API payload `tot_amount` = `fullPayableTotal`**, `item_total` = `grandTotal`.

#### 2i — Payment section: split leg layout rules

| Condition | Grid layout |
|-----------|-------------|
| 1 leg | Single column |
| 2 legs, neither UPI/Bank Transfer | `1fr 1fr` (side-by-side) |
| Any leg has UPI/Bank Transfer | Single column (ref sub-row needs full width) |
| 3+ legs | Single column |

Ref sub-row (for UPI/Bank Transfer only):
```
[Mode ▾][₹ amount][✕]        ← main payment row
└ Ref / Transaction ID (opt)   ← sub-row, ~220px max-width
```
NOT inline in the same row.

#### 2j — Payment state sync before submit

`onPaymentChange()` (DOM→state sync) MUST be called at the start of both:
- `handleSubmit()` — ensures `paymentLegs` reflects latest DOM values
- Confirm step render — ensures payment breakdown is correct

Reason: Mode select `onChange` re-renders the payment section (to show/hide ref sub-row template). If user changes mode then immediately clicks Confirm, state may lag behind DOM.

---

## Downstream Consumer Check

| Consumer | Impact |
|----------|--------|
| `PostSubmitConfirmation.jsx` | Extend: pass `transactionId` to show `PUR-828-...` |
| `useWriteAction.js` | Remove from submit path. Replace with local `submitting` state |
| `getStockInventory` cache | ✅ Already invalidated via `_invalidateStockCaches()` |
| `getInventoryMaster` cache | ✅ Same |
| CR-039 Upload Invoice tab | **PRESERVED UNCHANGED** — lines 261–383 |
| `poRequired` redirect | **PRESERVED UNCHANGED** |

---

## Risk Register

| # | Risk | Level | Mitigation |
|---|------|:-----:|-----------|
| R1 | Keyboard Tab/Enter navigation conflicts with browser tab order | MEDIUM | `e.preventDefault()` + manual `focusNextCell(idx, field)`. Confirmed working in mock. |
| R2 | `api.js` export list — `addPurchase` must be added | LOW | Self-test: `grep "addPurchase" api.js` → 3 hits |
| R3 | Split payment balance: backend silently accepts unbalanced | MEDIUM | Disable Confirm if `sum(partials) !== fullPayableTotal`. Mock confirms this pattern works. |
| R4 | Combobox with 75 items — keystroke performance | LOW | `useMemo` filter. 75 items well below threshold. |
| R5 | CR-039 Upload Invoice tab accidentally edited | LOW | Scope-lock comment at top of that section |
| R6 | `useWriteAction.execute()` side effects lost | LOW | Only used for `submitting` state. Replace with local state. |
| R7 | `onQtyChange`/`onRateChange` re-render destroys focused input cursor | HIGH | Do NOT call `setState` on row during keystroke. Update amount cell imperatively via ref. |
| R8 | Combobox `position:absolute` clipped by `overflow:hidden` ancestor | HIGH | Use `position:fixed` + `getBoundingClientRect()`. Confirmed fix in mock. |
| R9 | `autoBatch()` old format (`AME-OCT-18`) → duplicate batches on same-day 2nd purchase | MEDIUM | Use `{ABBREV}-{DDMONYY}-{HHMM}` format. Same-minute counter for multiple rows. |
| R10 | Payment state stale at confirm time (mode change → re-render → stale JS state) | MEDIUM | Sync DOM→state at start of handleSubmit. Pattern confirmed in mock. |

---

## Open Questions

**None.** All confirmed by Intake + API probes + mock design validation.

| Decision | Answer | Source |
|----------|--------|--------|
| Payment modes | Cash, Card, UPI, Bank Transfer, Others | Investigation |
| UPI/Bank Transfer ref field | Optional sub-row, max ~220px | Mock design |
| Fare field | Exposed (default 0), excluded from Grand Total bar | Mock design |
| Expiry field mandatory? | NO — optional per API | Mock + API probe |
| Auto-batch format | `{ABBREV}-{DDMONYY}-{HHMM}` | Mock design |
| Transaction ID on success | Yes — show `PUR-828-...` | Investigation |
| Duplicate item in same session | Show `⚠ dup` badge; still submittable | Mock design |
| Split leg side-by-side threshold | 2 legs + no ref needed → 1fr 1fr grid | Mock design |

---

## Scope Lock Declaration

**Files WILL change:**
1. `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx` — full Manual Entry tab rewrite
2. `frontend/src/services/api.js` — add `addPurchase()` + export

**Files will NOT touch:**
- `backend/server.py`
- `frontend/src/lib/terminology.js` (FROZEN)
- `frontend/src/lib/screenVisibility.js` (FROZEN)
- `frontend/src/components/central-inventory/PurchaseOrderCreate.jsx` (CR-048)
- `frontend/src/components/central-inventory/PurchaseOrderDetail.jsx` (CR-049)
- Lines 261–383 of `AddStockPurchaseForm.jsx` (CR-039 Upload Invoice — PRESERVED)

---

## Verification Matrix (seeds Gate 6 QA)

| # | Area | Check | How to Verify |
|---|------|-------|---------------|
| V1 | api.js | `addPurchase()` declared + exported | `grep -n "addPurchase" api.js` → 3+ hits |
| V2 | Form | Spreadsheet table renders (not cards) | Browser: Manual Entry → `<table>` with column headers visible |
| V3 | Form | Tab/Enter navigates cells without mouse | Browser: enter item, Tab through qty→rate→batch→expiry, no mouse |
| V4 | Form | Auto-batch format `AME-18OCT26-1423` (not `AME-OCT-18`) | Browser: select item + qty → batch shows timestamp format |
| V5 | Form | Amount auto-computes in-place (cursor does not jump) | Browser: type `2`, `5` in qty → shows `25` not `52` |
| V6 | Form | Combobox opens below item cell (not bottom-left corner) | Browser: click item cell → dropdown appears inline |
| V7 | Form | Combobox ArrowDown/ArrowUp keyboard navigation | Browser: open dropdown → ArrowDown highlights items |
| V8 | Form | Duplicate item shows `⚠ dup` badge | Browser: select same item in rows 1 and 2 → amber badge on both |
| V9 | Form | New row opens when last field complete (batch filled) | Browser: Tab out of filled batch → new empty row appears |
| V10 | Form | Grand Total = items only (fare excluded) | Browser: qty=10 rate=10 fare=100 → Grand Total = ₹100, not ₹200 |
| V11 | Payment | Single leg: Cash/Card/UPI/Bank Transfer/Others (NOT Cash/Credit/Online) | Browser: 5 options in dropdown |
| V12 | Payment | UPI → ref sub-row appears below leg; Cash → no ref row | Browser: select UPI → `└ Ref` input appears |
| V13 | Payment | 2 Cash legs side-by-side (1fr 1fr) | Browser: add split leg, both Cash → same row |
| V14 | Payment | Balance check: `sum(legs) vs fullPayableTotal (items+fare)` | Browser: items=₹100 fare=₹50 → balance shows `₹150 target` |
| V15 | Payment | State synced at confirm: mode change + immediate Review shows correct payment | Browser: change mode → click Review → payment meta shows new mode |
| V16 | Submit | Single POST to /add-purchase (not loop) | Network tab: 1 POST on Confirm |
| V17 | Submit | `purchase_items[].Ingredient` capital I, `.Unit` capital U, `.Amount` capital A | Code review |
| V18 | Submit | `tot_amount` = items + fare; `item_total` = items only | Code review of payload construction |
| V19 | Submit | `partial_payments[]` only present when `payment_type: "partial"` | Network tab: single Cash → no `partial_payments` in payload |
| V20 | Success | Transaction ID `PUR-828-YYYYMMDD-XXXX` shown on success screen | Browser: complete purchase → success page |
| V21 | CR-039 | Upload Invoice tab unchanged after rewrite | Browser: switch to Upload Invoice → OCR zone + Excel upload still there |
| V22 | Redirect | `DIRECT_PURCHASE_REQUIRES_PO` still redirects to /purchase/orders | Curl: settings.require_po_for_purchase=true → redirect |
| V23 | Cache | `_invalidateStockCaches()` called after addPurchase | Code review: `.then(r => { _invalidateStockCaches(); return r; })` |

---

## Gate 2 Summary

| Field | Value |
|-------|-------|
| Code reality | PARTIAL |
| Conflict | NONE |
| Files WILL change | 2 |
| Files NOT touching | 6+ |
| Risks | 10 identified (R7 cursor, R8 combobox fixed, R9 batch format = HIGH/MEDIUM; rest LOW/MEDIUM) |
| API probed live | YES — PUR-828-20261018-8005 created |
| Mock design validated | YES — CR-047_MOCK_DESIGN_REAL_DATA.html, ~20 sessions |
| Owner decisions needed | NONE |
| Verification checks | 23 |

**→ Gate 2 COMPLETE. Ready for Gate 3 (Implementation Plan).**
