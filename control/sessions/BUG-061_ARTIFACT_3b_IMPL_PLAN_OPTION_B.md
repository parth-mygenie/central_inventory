# BUG-061 — ARTIFACT 3b: IMPLEMENTATION PLAN (DESIGN REVISION — Option B)
> **ID:** BUG-061
> **Artifact:** 3b — Implementation Plan revision (Option B: Dedicated Fare column)
> **Date:** 2026-10-20
> **Role:** PLANNING
> **Gate 2 basis:** `control/sessions/INVESTIGATION_20261020_BUG061_FARE_VISIBILITY.md`
> **Owner decision:** Option B — dedicated Fare column (11th column)
> **Target file:** `frontend/src/components/central-inventory/PurchaseReport.jsx` (359 lines)

---

## Scope Lock

**Files WILL change:**
- `frontend/src/components/central-inventory/PurchaseReport.jsx`

**Files will NOT touch:** everything else.

---

## What Changes (3 edits)

The transaction-grouped layout (from the first BUG-061 plan) stays intact.
Only the Amount cell and column headers change.

| Before | After |
|--------|-------|
| Amount column shows `tot_amount` + tiny 9px fare text below | "Item Amt" column shows `line_total` only |
| No dedicated fare column | New "Fare" column — `₹{tot_fair}` in orange, bold, full-size |
| 10 columns | 11 columns |

---

## Edit 1 — Column headers: rename Amount + add Fare
**Lines 239–240**

**Current:**
```javascript
                  {["Date", isMultiStore && "Store", "Ingredient", "Vendor",
                    "Qty", "Unit Price", "Amount", "Payment", "Invoice #", "Txn ID"]
```

**New:**
```javascript
                  {["Date", isMultiStore && "Store", "Ingredient", "Vendor",
                    "Qty", "Unit Price", "Item Amt", "Fare", "Payment", "Invoice #", "Txn ID"]
```

**Changes:** `"Amount"` → `"Item Amt"` · `"Fare"` inserted between `"Item Amt"` and `"Payment"`.

**Verification:** Column header row shows 11 headers (12 with Store on multi-store accounts).

---

## Edit 2 — Transaction header row: split Amount cell into Item Amt + Fare
**Lines 287–295** (the Amount `<td>` and its hasFare sub-div)

**Current:**
```jsx
                        <td className="px-3 py-1.5 tabular-nums font-semibold whitespace-nowrap">
                          ₹{Number(m.tot_amount).toLocaleString("en-IN")}
                          {hasFare && (
                            <div className="text-[9px] font-normal text-orange-600 whitespace-nowrap mt-0.5"
                              data-testid={`pr-fare-${m.transaction_id}`}>
                              + ₹{Number(m.tot_fair).toLocaleString("en-IN")} fare
                            </div>
                          )}
                        </td>
```

**New:**
```jsx
                        {/* BUG-061 Option B: Item Amt = line_total only; Fare gets its own column */}
                        <td className="px-3 py-1.5 tabular-nums font-semibold whitespace-nowrap">
                          {isMulti
                            ? <span className="text-muted-foreground">—</span>
                            : `₹${Number(m.line_total).toLocaleString("en-IN")}`}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums whitespace-nowrap"
                          data-testid={`pr-fare-${m.transaction_id}`}>
                          {hasFare
                            ? <span className="font-semibold text-orange-600">
                                ₹{Number(m.tot_fair).toLocaleString("en-IN")}
                              </span>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
```

**Key decisions:**
- **Item Amt, single-item header:** `line_total` — e.g. Baby Corn = ₹1,000
- **Item Amt, multi-item header:** `—` — individual amounts visible in sub-rows below
- **Fare, any header:** `₹{tot_fair}` in `font-semibold text-orange-600` when > 0 — same size and weight as all other amounts, impossible to miss. `—` when 0.
- **Fare, multi-item header with fare:** shows the transaction fare (e.g. ₹200) on the header row — correct because fare is per-transaction, not per-ingredient.

**Verification:**
- Baby Corn (PUR-828-20261020-8011): Item Amt = ₹1,000, Fare = ₹200 (orange bold)
- Apple (PUR-828-20261020-8012): Item Amt = ₹100, Fare = —
- 2-item header (PUR-828-20261019-8009): Item Amt = —, Fare = —

---

## Edit 3 — Sub-rows: add blank Fare `<td>` to maintain column alignment
**Line 339** (end of sub-row, currently `<td /><td /><td />`)

**Current:**
```jsx
                          <td /><td /><td />
```

**New:**
```jsx
                          <td /><td /><td /><td />
```

**Why:** Sub-rows previously had 3 trailing blank cells (Payment, Invoice #, TXN ID).
With the new Fare column between Item Amt and Payment, they now need 4 trailing blank cells
(Fare, Payment, Invoice #, TXN ID) to keep column alignment correct.

**Verification:** Sub-rows align under correct column headers — Curry Leaf ₹88 appears under "Item Amt", not under "Fare".

---

## Verification Matrix

| # | Edit | Expected | How to check |
|---|------|----------|-------------|
| V1 | 1 | Column header "Fare" visible between "Item Amt" and "Payment" | View /reports/purchase → thead shows 11 headers |
| V2 | 2 | Single-item with fare: Item Amt = ₹1,000, Fare = ₹200 (orange bold) | PUR-828-20261020-8011 |
| V3 | 2 | Single-item no fare: Item Amt = ₹100, Fare = — | PUR-828-20261020-8012 |
| V4 | 2 | Multi-item header: Item Amt = —, Fare = — | PUR-828-20261019-8009 header |
| V5 | 3 | Sub-rows align under correct columns | Curry Leaf ₹88 under Item Amt, blank under Fare |
| V6 | all | Summary total still ₹4,598 (correctTotal unchanged) | Summary bar |
| V7 | all | BUG-056 unit price formula untouched | Baby Corn unit price ₹10 |
| V8 | all | Compile: 0 errors | frontend.out.log → "Compiled" |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|-----------|
| Sub-row column misalignment | LOW | MEDIUM | Edit 3 adds the 4th blank `<td />` — exact count verified |
| `data-testid="pr-fare-*"` moves from Amount cell to Fare cell | NONE | — | testid moves with the Fare content — test agent updated accordingly |
| Multi-item + fare: Fare shows "—" | NONE | — | Fare is on the header row (`hasFare` = `Number(m.tot_fair) > 0`) — correctly shows on multi-item header too |

---

## Post-Code Checklist

```
- [ ] registry.json: BUG-061 status updated, artifact_refs updated
- [ ] Code markers: grep -n "BUG-061 Option B" PurchaseReport.jsx → present
- [ ] Dashboard: gen_dashboard_data.js --check → PASS
- [ ] Compile: "Compiled successfully"
```

---

## Handover

```
Gate 3 ready for BUG-061 Option B.
3 edits, 1 file, ~10 lines changed.
Scope: ONLY PurchaseReport.jsx.
Awaiting Gate 4 GO.
```
