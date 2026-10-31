# CR-GST — ARTIFACT 2: IMPACT ANALYSIS

> **Item:** CR-GST — Add GST fields to Purchase Form + Purchase Report
> **Agent Role:** PLANNING (Gate 2 only)
> **Date:** 2026-10-31
> **Code Reality:** NONE — No GST per-item input or bill-level GST UI exists. Only a hardcoded `tot_tax: 0` in the payload (line 215).

---

## 1. Conflict Pre-Check

| Target File | Last Modified By | Status | Conflict? |
|-------------|-----------------|--------|-----------|
| `AddStockPurchaseForm.jsx` | BUG-058/059 (2026-10-20) | QA_PASS | NO — stable, no active work |
| `AddStockPurchaseForm.jsx` | CR-047 (2026-10-19) | IMPLEMENTED | NO — stable, this is the live code |
| `PurchaseReport.jsx` | BUG-061 (2026-10-20) | QA_PASS | NO — stable |
| `PurchaseReport.jsx` | CR-051 (ongoing) | IN_PROGRESS | **LOW RISK** — CR-051 is the report screen itself; GST adds a column to its existing table. Parallel-safe because GST is an additive column insert, not a structural change. |
| `api.js` | — | — | **NO CHANGE NEEDED** — `addPurchase()` is a straight pass-through (line 796-798). `getVendorItemListFull()` already returns the `gst` field per item. |

---

## 2. API Readiness (Curl-Probe Results)

### 2a. Write: `POST /inventory/add-purchase`

Already accepts two new keys per the spec document (`gst_purchase.md`):

| Key | Scope | Type | Current State in Code |
|-----|-------|------|-----------------------|
| `tot_tax` | Bill level | number (≥ 0) | **Hardcoded to `0`** at line 215 |
| `gst` | Each `purchase_items[]` row | number (≥ 0) | **Not sent at all** — line 226-234 omits it |

Validation rules (server-side, 422 responses):
- All `gst` filled or all blank — no mixing
- If all `gst` filled and `tot_tax` provided: must equal sum within 0.01
- If all `gst` filled and `tot_tax` omitted: server computes sum
- Negative values → 422
- `tot_amount` should equal `item_total + tot_tax + tot_fair`

### 2b. Read: `GET /inventory/vendor-item-list` (Purchase Report data source)

Response per item already includes:
```
"gst": null          ← per-item GST (null when not entered)
"tot_amount": 1      ← bill total
"tot_fair": 1        ← fare
```

**`gst` is present in vendor-item-list responses.** No `tot_tax` at item level (that's bill-level only, returned by vendor-stock-list as `Total_Tax`).

### 2c. Read: `GET /inventory/vendor-stock-list`

Response per purchase:
```
"Total_Tax": "1.00"  ← bill-level GST
```

This endpoint is NOT currently used by PurchaseReport.jsx (it uses vendor-item-list). For the report, we derive bill-level GST by summing per-item `gst` values within each transaction group.

---

## 3. Data Flow Trace

### 3a. Purchase Form → API (Write Path)

```
User input → emptyRow() → rows state → updateRow() → row.gst (NEW)
                                                     ↓
User input → totTax state (NEW)  ──────────────────→ payload.tot_tax
                                                     ↓
handleSubmit() → payload → api.addPurchase() → POST /inventory/add-purchase
                  ↑
            purchase_items[].gst (NEW, from row.gst)
```

**Current state (line numbers in AddStockPurchaseForm.jsx):**

| Concern | Current Line | Current Code | Change Needed |
|---------|:----:|------|------|
| Row template | 62 | `{ ..., amount: "", batch: "", expiry: "" }` | Add `gst: ""` |
| Bill-level GST state | — | Does not exist | Add `useState("")` for `totTax` |
| GST total (sum of rows) | — | Does not exist | Add `useMemo` for `gstTotal` |
| Payable total | 92 | `grandTotal + fare` | Add `+ totTax` |
| Payload `tot_tax` | 215 | `tot_tax: 0` (hardcoded) | Wire to `totTax` state |
| Payload per-item `gst` | 226-234 | Not present | Add `gst` conditionally |
| Reset | 197 | No `totTax` reset | Add `setTotTax("")` |
| Header strip | 552-558 | Fare input only | Add Total GST input after Fare |
| Table colgroup | 599-608 | 9 columns (no GST) | Add 10th column for GST |
| Table header | 612 | 9 headers (no GST) | Add "GST" between Amount and Batch |
| SpreadsheetRow tab order | 710 | `["qty", "rate", "batch", "expiry"]` | Insert `"gst"` after `"rate"` |
| SpreadsheetRow GST input | — | Does not exist | Add `<Input>` for gst after Amount cell |
| Confirm table headers | 339 | 7 columns (no GST) | Add "GST" between Amount and Batch |
| Confirm table cells | 351 | Amount then Batch | Insert GST cell between |
| Confirm breakdown | 359-371 | Fare only | Add Total GST row |

### 3b. API → Report (Read Path)

```
api.getVendorItemListFull() → resp.data.data[] → rows state → displayRows → txnGroups
                                                                              ↓
                                     gst field already in each row ──→ table cell (NEW)
```

**Current state (line numbers in PurchaseReport.jsx):**

| Concern | Current Line | Current Code | Change Needed |
|---------|:----:|------|------|
| Table headers | 239-240 | `"Item Amt", "Fare", "Payment"...` | Insert `"GST"` between "Item Amt" and "Fare" |
| Txn header row | 287-292 | Item Amt cell, then Fare cell | Insert GST cell between |
| Sub-rows | 341-344 | `line_total` cell, then 4 empty `<td />`s | Insert GST cell, adjust empty `<td />` count |

---

## 4. Risk Assessment

| # | Change | File | Risk | Rationale |
|---|--------|------|:----:|-----------|
| 1 | Add `gst` to emptyRow | AddStockPurchaseForm.jsx:62 | LOW | Additive field, no downstream side effects |
| 2 | Add `totTax` state | AddStockPurchaseForm.jsx (new) | LOW | Independent state variable |
| 3 | Update `fullPayableTotal` to include GST | AddStockPurchaseForm.jsx:92 | **MEDIUM** | Changes payment auto-fill (BUG-052 effect at line 191) and split balance. Correct per API spec (`tot_amount = item_total + tot_fair + tot_tax`). Must ensure single-leg auto-fill still works. |
| 4 | Wire payload | AddStockPurchaseForm.jsx:215,226-234 | LOW | Additive keys, POS API already accepts them |
| 5 | Add GST column (colgroup + header + cells) | AddStockPurchaseForm.jsx:599-614 | LOW | Additive column. Need to re-balance widths to avoid horizontal scroll. |
| 6 | GST input in SpreadsheetRow | AddStockPurchaseForm.jsx (new cell) | LOW | Standard `<Input>` same pattern as rate/batch |
| 7 | Update tab order | AddStockPurchaseForm.jsx:710 | LOW | Insert `"gst"` into existing array |
| 8 | Total GST header input | AddStockPurchaseForm.jsx (after 558) | LOW | Same pattern as Fare input |
| 9 | Auto-sync totTax from row GSTs | AddStockPurchaseForm.jsx (new) | **MEDIUM** | useEffect referencing `validRows` — must be declared AFTER `validRows` useMemo. Previous attempt crashed due to temporal dead zone (referencing `validRows` before its `const` declaration). |
| 10 | Confirm screen columns | AddStockPurchaseForm.jsx:339,351 | LOW | Additive |
| 11 | Report table GST column | PurchaseReport.jsx:239-240,287-292,341-344 | LOW | Additive column; `gst` already in API response |
| 12 | Multi-item GST display | PurchaseReport.jsx (txn header) | LOW | Sum `lines.reduce(gst)` for header, per-item in sub-rows |

---

## 5. Downstream Consumers

| Consumer | Impact |
|----------|--------|
| Single payment auto-fill (BUG-052, line 191) | `fullPayableTotal` now includes GST → auto-fills correctly |
| Split payment balance (line 181) | `splitBalanced` uses `fullPayableTotal` → balance includes GST correctly |
| `isFormValid` (line 185) | No change — doesn't depend on GST fields |
| Grand total bar (line 642-647) | Stays "excl. fare" — shows `grandTotal` (items only). GST shown separately. |
| `addPurchase` cache invalidation (api.js:798) | No change — already invalidates stock caches |
| Purchase Report summary bar (line 83-89) | `correctTotal` sums `tot_amount` per txn — already includes GST when API includes it |

---

## 6. Files WILL Change vs WILL NOT Change

**WILL change (2 files):**
1. `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx` — ~12 edit sites
2. `frontend/src/components/central-inventory/PurchaseReport.jsx` — ~3 edit sites

**WILL NOT change:**
- `frontend/src/services/api.js` — pass-through, no transform needed
- `frontend/src/lib/terminology.js` — FROZEN, not involved
- `frontend/src/lib/screenVisibility.js` — FROZEN, not involved
- `backend/server.py` — proxy-only, no business logic to add
- `frontend/src/lib/formatters.js` — no GST formatting needed

---

## 7. Open Questions (Owner Decisions Needed)

| # | Question | Why It Matters |
|---|----------|----------------|
| Q1 | **Should `tot_amount` include GST?** The API spec example shows `tot_amount = item_total + tot_tax` (1180 = 1000 + 180). This changes the split payment balance and single-leg auto-fill to include GST. | If YES: `fullPayableTotal = grandTotal + fare + totTax`. If NO: `tot_amount` stays `grandTotal + fare` and `tot_tax` is sent separately. |
| Q2 | **Auto-sync behavior:** When all rows have `gst` filled, should `totTax` auto-populate with the sum? Or should it remain fully manual? | Auto-sync is convenient but creates a coupling. The API server auto-computes if omitted, so manual entry + server validation is also safe. |
| Q3 | **Negative clamping:** Should the frontend clamp negatives on input, or rely on server-side 422 validation? | Frontend clamp is better UX but adds onChange logic. Server already rejects negatives. |

---

## 8. Summary

- **Code Reality:** NONE — purely additive work.
- **API Ready:** YES — POS API accepts `gst` + `tot_tax` on write, returns `gst` on read.
- **Conflict Risk:** LOW — no active items on same files.
- **Highest Risk:** #3 (fullPayableTotal change) and #9 (useEffect declaration order). Both are MEDIUM.
- **Blast Radius:** SMALL (2 files, ~15 edit sites total).
- **Backend Change:** NONE.
- **api.js Change:** NONE.

**Next:** Owner answers Q1-Q3 → PLANNING agent produces Gate 3 (Implementation Plan).
