# CR-049 — Gate 2: Impact Analysis

> **ID:** CR-049
> **Artifact:** 2 — Impact Analysis
> **Role:** PLANNING
> **Date:** 2026-10-18
> **Credential used:** owner@mygenietest002.com / Qplazm@10 (RID 828)
> **Code Reality:** PARTIAL — receive form exists with card-per-item layout; spreadsheet/auto-batch/totals = NONE
> **Feeds:** CR-049_ARTIFACT_3_IMPLEMENTATION_PLAN.md (Gate 3)

---

## Conflict Pre-Check (Step 1)

### L7 File Ownership

| File | Last Modifier | Last Item | Risk |
|------|--------------|-----------|------|
| `PurchaseOrderDetail.jsx` | BUG-044 (2026-07-11), CR-040 (2026-07-11) | Payment conditional; invoice duplicate pre-check | ✅ No open item |

**Conflict:** NONE. Last touch July 2026. No item currently in-flight on this file.

---

## API Probes (Step 1b)

### Probe 1 — receivePO payload (confirmed from source)

```javascript
// api.js line 1151-1155
POST /proxy/v2/inventory/purchase-order/{poId}/receive
payload: {
  purchase_date: "YYYY-MM-DD",
  payment_type: "Cash",       // currently: Cash/Credit/Online — should align with CR-047 modes
  receive_lines: [
    {
      line_id:       Number,   // PO line ID
      received_qty:  Number,
      actual_rate:   Number,   // falls back to expected_rate if blank
      batch:         String,   // optional
      expiry_date:   String,   // optional
    }
  ]
}
```

**CONFIRMED from source.** No curl probe needed — payload fully legible in codebase.

### Probe 2 — receiveLines state shape (confirmed from source)

```javascript
// PurchaseOrderDetail.jsx lines 93-107 — initialised from po.lines[]
{
  line_id:              l.id,
  inventory_master_id:  l.inventory_master_id,
  stock_title:          l.stock_title || l.ingredient_name,
  ordered_qty:          Number(l.ordered_qty) || 0,
  ordered_unit:         l.ordered_unit || l.unit,
  expected_rate:        Number(l.expected_rate) || 0,
  received_qty:         "",    // storekeeper enters
  actual_rate:          "",    // storekeeper enters
  batch:                "",    // storekeeper enters (auto-batch in CR-049)
  expiry_date:          "",    // storekeeper enters (optional)
  skip:                 false, // skip checkbox
}
```

### Probe 3 — receivePO cache invalidation (confirmed)

```javascript
// api.js line 1153
_invalidateCache(["listPOs:", "getPODetail:", "getVendorItemList:"])
_invalidateStockCaches()
```

✅ Cache already invalidates correctly on receive. No change needed.

### Probe 4 — Invoice total — was commented out

```javascript
// PurchaseOrderDetail.jsx line 479-482 — BUG-FIX comment
// const invoiceTotal = Number(rl.received_qty || 0) * Number(rl.actual_rate || rl.expected_rate || 0);
```

**FINDING:** Invoice total was intentionally commented out with `// BUG-FIX` note. Per CR-049 scope, line total should be restored as `received_qty × actual_rate`. The "BUG-FIX" was for an earlier issue with `actual_rate` defaulting. In CR-049 scope, the correct formula is confirmed: `received_qty × actual_rate` (fallback to `expected_rate` when actual not entered).

---

## Data Flow Trace (Step 2)

### Current flow (to be replaced by CR-049)

```
fetchDetail() [line 81]
  → api.getPODetail(id) → sets po.lines[] → initialises receiveLines[]
  → api.getStockInventory() → builds stockMap for stock impact display
     ↓
[User clicks "Receive Goods" button]
  → setShowReceive(true)
     ↓
[Card-per-item receive form renders — lines 375-527]
  → space-y-3 Cards, one per receiveLines[] entry
  → 4 inputs per card: Invoice Qty, Rate, Batch, Expiry
  → 2 intelligence panels: Rate Variance (full card), Stock Impact (full card)
  → No keyboard navigation
  → No auto-batch
  → No line total, no grand total
     ↓
[handleReceive() — lines 173-196]
  → filters: !skip && received_qty > 0
  → api.receivePO(id, payload)
  → cache invalidation
```

**Problems:**
1. 10-item PO = 10 scrollable cards — no keyboard flow
2. Rate Variance shown as full card panel — wastes vertical space
3. Stock Impact shown as full card panel — same
4. Invoice total is commented out — missing per-line total
5. Grand total bar: MISSING
6. Batch: manual input only, no auto-generation
7. Payment modes: Cash/Credit/Online (wrong — CR-047 aligned: Cash/Card/UPI/Bank Transfer/Others)

### New flow (CR-049 target)

```
fetchDetail() [UNCHANGED]
  → receiveLines[] initialised as before
     ↓
[Receive Goods spreadsheet table — CR-049 rewrite]
  → <table> with columns: ☐ | Item | PO Qty | Unit | Rcv Qty | Var | Rate | Batch | Expiry | Total
  → autoBatch() fires when item name + received_qty both set
  → computeLineTotal(rcv_qty, actual_rate || expected_rate) → per-line total
  → Grand total bar: sum of active line totals
  → Variance column: inline badge ("+3.2% ✓" or "+24% ⚠") replacing full panel card
  → Stock impact: single sub-line under item name replacing full panel card
  → Tab/Enter keyboard navigation: Rcv Qty → Rate → Batch → Expiry → next row
     ↓
[handleReceive() — UNCHANGED logic, same payload]
  → api.receivePO(id, payload)
```

---

## Affected Files (Step 2)

### File 1: `frontend/src/components/central-inventory/PurchaseOrderDetail.jsx`

This is a **partial rewrite** — only the receive form section (~lines 375–527) changes. All other sections (PO header, actions, timeline, line items summary table, cancel dialog) are **PRESERVED UNCHANGED**.

| Section | Current Lines | Change |
|---------|--------------|--------|
| Receive form header (Invoice Date, Invoice #, Payment Type) | 382–418 | **Payment modes updated**: Cash/Credit/Online → Cash/Card/UPI/Bank Transfer/Others |
| Card-per-line layout | 420–503 | **REPLACE**: `space-y-3` cards → `<table>` spreadsheet with CR-049 columns |
| Summary / receive buttons | 506–556 | **Extend**: add Grand Total bar above Submit button |

**Key new functions (internal to component, no new file):**

```javascript
// Reuse autoBatch from CR-047 pattern
function autoBatchReceive(stockTitle) {
  const abbrev = stockTitle.slice(0,3).toUpperCase().replace(/\s/g,'');
  const now = new Date();
  const dd  = String(now.getDate()).padStart(2,'0');
  const mon = now.toLocaleString('en',{month:'short'}).toUpperCase();
  const yy  = String(now.getFullYear()).slice(2);
  const hh  = String(now.getHours()).padStart(2,'0');
  const mm  = String(now.getMinutes()).padStart(2,'0');
  return `${abbrev}-${dd}${mon}${yy}-${hh}${mm}`;
}

// Line total: received_qty × (actual_rate || expected_rate)
function computeLineTotal(rcvQty, actualRate, expectedRate) {
  const q = Number(rcvQty), r = Number(actualRate) || Number(expectedRate) || 0;
  return q > 0 && r > 0 ? q * r : 0;
}
```

**Variance badge logic (inline, replaces full panel):**
```javascript
// In each table row:
const variance = rl.actual_rate && rl.expected_rate
  ? ((Number(rl.actual_rate) - rl.expected_rate) / rl.expected_rate * 100)
  : null;
const flagged = variance !== null && Math.abs(variance) > 10;
// Render: "+3.2% ✓" green | "+24.0% ⚠" red | "—" when no rate entered
```

**Stock impact (inline sub-line, replaces full panel):**
```javascript
// Under item name in first column:
// "0 → 126.0 kg after" when received_qty > 0
// "Stock: 0 kg" when received_qty empty
```

### File 2: `frontend/src/services/api.js`

**NO CHANGE NEEDED.** `receivePO` at line 1151 already handles the correct endpoint and cache invalidation.

### File 3: `backend/server.py`

**NO CHANGE NEEDED.** Proxy catch-all handles `/purchase-order/{id}/receive` transparently.

---

## Preserved Unchanged

| Section | Lines | Reason |
|---------|-------|--------|
| `fetchDetail()` | 81–113 | Correct — loads PO + stock data |
| `receiveLines` init shape | 93–107 | Correct — data already in right shape |
| `updateReceiveLine()` | 169–171 | Correct — simple field updater |
| `handleReceive()` payload | 173–196 | Correct — `receive_lines` shape unchanged |
| Invoice duplicate check (CR-040) | 115–140, 389–405 | Frozen CR-040 work — preserve exactly |
| Skip checkbox logic | 432–444 | Preserve as-is |
| PO header, actions, timeline | 211–374 | All sections above receive form — untouched |
| Cancel dialog | 530–556 | Below receive form — untouched |

---

## Downstream Consumer Check

| Consumer | Impact |
|----------|--------|
| `api.receivePO()` | ✅ No change — same payload, same endpoint |
| `stockMap` | ✅ Used in new table (stock impact per row) — passed to row component |
| `po.lines[]` | ✅ Shape unchanged — `receiveLines` state init unchanged |
| CR-040 invoice duplicate check | **PRESERVED** — header section kept exactly |

---

## Risk Register

| # | Risk | Level | Mitigation |
|---|------|:-----:|-----------|
| R1 | `autoBatch()` fires when `received_qty` entered but stock_title is empty (edge case) | LOW | Guard: `if (!stockTitle) return ""` |
| R2 | Skip row in table — visually must be distinct from active row | LOW | Apply `opacity-60 line-through` to row when `rl.skip === true` |
| R3 | `actual_rate` blank → use `expected_rate` in line total — produces non-zero total with no user input | LOW | Only show total when `rl.received_qty > 0` |
| R4 | Payment modes: existing `receivePayment` state uses "Cash" default — OK for Cash/Card/UPI/Bank Transfer/Others | LOW | Initial state `"Cash"` still valid as default |
| R5 | Tab navigation past Expiry in last row — should NOT auto-open new row (PO has fixed lines, can't add) | MEDIUM | `onKeyDown` on Expiry: Tab wraps to next row's Rcv Qty, NOT addRow() |
| R6 | Invoice total was commented out with `// BUG-FIX` — re-enabling must use `actual_rate || expected_rate` fallback | LOW | Formula: `received_qty × (actual_rate || expected_rate)` |

---

## Open Questions

**None.** All decisions resolved at Intake.

| Decision | Answer |
|----------|--------|
| Split payment on Receive | Backlog — single payment type only for now |
| Invoice total formula | `received_qty × actual_rate` (fallback to expected_rate) |
| Grand total bar content | Invoice Total computed + PO Estimate compared |
| New row on Tab | NO — PO has fixed lines. Tab wraps to next row |
| Auto-batch format | Same as CR-047: `{ABBREV}-{DDMONYY}-{HHMM}` |

---

## Scope Lock

**Files WILL change:**
1. `frontend/src/components/central-inventory/PurchaseOrderDetail.jsx` — receive form section only (~lines 375–527)

**Files will NOT touch:**
- `frontend/src/services/api.js`
- `backend/server.py`
- `frontend/src/lib/terminology.js` (FROZEN)
- `frontend/src/lib/screenVisibility.js` (FROZEN)
- Lines 1–374 of `PurchaseOrderDetail.jsx` (PO header, actions, timeline, items view)
- Lines 528–556 of `PurchaseOrderDetail.jsx` (receive submit + cancel dialog)

---

## Verification Matrix (seeds Gate 6 QA)

| # | Check | How to Verify |
|---|-------|---------------|
| V1 | Spreadsheet table renders inside Receive Goods (not cards) | Browser: open any sent PO → click Receive Goods → see `<table>` with column headers |
| V2 | Tab navigates Rcv Qty → Rate → Batch → Expiry → next row Rcv Qty | Browser: Tab through row 1 fields → focus moves to row 2 Rcv Qty |
| V3 | Auto-batch fires on Rcv Qty entry | Browser: enter qty → Batch auto-fills `MAK-18OCT26-HHMM` |
| V4 | Line total = received_qty × actual_rate | Browser: qty=10 rate=25 → Total shows ₹250.00 |
| V5 | Grand total bar shows sum of active line totals | Browser: 2 rows with totals → Grand Total bar sums both |
| V6 | Variance badge inline — not separate panel | Browser: enter rate different from expected → inline `+24% ⚠` badge in Var column |
| V7 | Stock impact as sub-line under item name | Browser: enter qty → item cell shows `0 → 10 kg after` |
| V8 | Skip row is visually dimmed; skipped rows excluded from total and payload | Browser: check skip → row dims; total excludes it |
| V9 | Invoice duplicate check still works (CR-040 preserved) | Browser: enter duplicate invoice # → amber warning appears |
| V10 | Payment modes: Cash/Card/UPI/Bank Transfer/Others | Browser: open payment dropdown → 5 modes, NOT Cash/Credit/Online |
| V11 | Submit calls `receivePO(id, payload)` with unchanged shape | Network tab: `receive_lines` array on POST |

---

## Gate 2 Summary

| Field | Value |
|-------|-------|
| Code reality | PARTIAL |
| Conflict | NONE |
| Files WILL change | 1 (`PurchaseOrderDetail.jsx` — receive form section) |
| Files NOT touching | api.js, server.py, frozen files, PO header/actions/cancel sections |
| Risks | 6 (R5 no-new-row on Tab = MEDIUM; rest LOW) |
| API probed | Source-confirmed (no live POs on test account) |
| Owner decisions | NONE |
| Verification checks | 11 |

**→ Gate 2 COMPLETE. Ready for Gate 3 and mock design.**
