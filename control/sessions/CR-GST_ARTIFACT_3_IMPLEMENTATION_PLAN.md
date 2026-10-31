# CR-GST — ARTIFACT 3: IMPLEMENTATION PLAN

> **Item:** CR-GST — Add GST fields to Purchase Form + Purchase Report
> **Agent Role:** PLANNING (Gate 3)
> **Date:** 2026-10-31
> **Depends On:** Gate 2 Impact Analysis (`CR-GST_ARTIFACT_2_IMPACT_ANALYSIS.md`)
> **Code Reality:** NONE

---

## Open Question Resolutions

| # | Question | Resolution | Rationale |
|---|----------|------------|-----------|
| Q1 | Should `tot_amount` include GST? | **YES** | API spec: `tot_amount = item_total + tot_tax + tot_fair`. Example: 1180 = 1000 + 180 + 0. |
| Q2 | Auto-sync totTax from row GSTs? | **YES** | Auto-fill when all valid rows have GST. User can still override. |
| Q3 | Frontend negative clamping? | **YES** | Better UX. Clamp in onChange handlers. |

---

## Scope Lock

**Files WILL change:**
1. `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx`
2. `frontend/src/components/central-inventory/PurchaseReport.jsx`

**Files will NOT touch:**
- `api.js`, `server.py`, `terminology.js`, `screenVisibility.js`, `formatters.js`

---

## Execution Sequence

File 1 first (AddStockPurchaseForm.jsx — all 12 edits), then File 2 (PurchaseReport.jsx — 3 edits). Within File 1, edits are ordered top-to-bottom to avoid line-number drift.

---

## Edits — File 1: AddStockPurchaseForm.jsx

### Edit 1: Add `gst` to emptyRow (line 62)

**Current (line 62):**
```js
    return { key: Math.random().toString(36).slice(2), itemId: "", title: "", unit: "", qty: "", rate: "", amount: "", batch: "", expiry: "" };
```

**New:**
```js
    return { key: Math.random().toString(36).slice(2), itemId: "", title: "", unit: "", qty: "", rate: "", amount: "", gst: "", batch: "", expiry: "" };
```

**Verify:** `grep "gst" AddStockPurchaseForm.jsx` shows `gst: ""` in emptyRow.

---

### Edit 2: Add `totTax` state (after line 43)

**Current (lines 42-44):**
```js
  const [fare, setFare] = useState(0);
  const [invoiceNumber, setInvoiceNumber] = useState("");   // BUG-055

  // Spreadsheet rows
```

**New:**
```js
  const [fare, setFare] = useState(0);
  const [invoiceNumber, setInvoiceNumber] = useState("");   // BUG-055
  const [totTax, setTotTax] = useState("");  // CR-GST — bill-level GST

  // Spreadsheet rows
```

**Verify:** `grep "totTax" AddStockPurchaseForm.jsx` shows the useState.

---

### Edit 3: Add `gstTotal` useMemo + auto-sync useEffect + update `fullPayableTotal` (lines 85-98)

**Current (lines 85-98):**
```js
  // Grand total: items only (label says "excl. fare")
  const grandTotal = useMemo(
    () => rows.reduce((s, r) => s + computeRowTotal(r.qty, r.rate), 0),
    [rows]
  );

  // Full payable = items + fare → used in API tot_amount + payment balance
  const fullPayableTotal = grandTotal + (Number(fare) || 0);

  // Valid rows for review/submit (expiry is optional)
  const validRows = useMemo(
    () => rows.filter(r => r.itemId && Number(r.qty) > 0 && r.batch.trim()),
    [rows]
  );
```

**New:**
```js
  // Grand total: items only (label says "excl. fare")
  const grandTotal = useMemo(
    () => rows.reduce((s, r) => s + computeRowTotal(r.qty, r.rate), 0),
    [rows]
  );

  // Valid rows for review/submit (expiry is optional)
  const validRows = useMemo(
    () => rows.filter(r => r.itemId && Number(r.qty) > 0 && r.batch.trim()),
    [rows]
  );

  // CR-GST — GST total: sum of per-row gst values
  const gstTotal = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.gst) || 0), 0),
    [rows]
  );

  // CR-GST — auto-sync totTax from row-level GSTs when all valid rows have gst filled
  useEffect(() => {
    const filled = validRows.filter(r => r.gst !== "" && Number(r.gst) >= 0);
    if (validRows.length > 0 && filled.length === validRows.length && gstTotal > 0) {
      setTotTax(gstTotal.toFixed(2));
    }
  }, [gstTotal, validRows]); // eslint-disable-line react-hooks/exhaustive-deps

  // Full payable = items + fare + GST → used in API tot_amount + payment balance
  const fullPayableTotal = grandTotal + (Number(fare) || 0) + (Number(totTax) || 0);
```

**⚠ CRITICAL: `validRows` declaration MUST come BEFORE the `useEffect` that references it.** The previous crash was caused by a temporal dead zone — the `useEffect` at line 100 referenced `validRows` declared at line 112. This edit moves `validRows` up, before the useEffect.

**Verify:** App loads without "can't access lexical declaration 'validRows'" error. `webpack compiled` in frontend log.

---

### Edit 4: Add `totTax` to resetForm (line 197)

**Current (line 197):**
```js
    setRows([emptyRow()]); setVendorId(""); setFare(0); setInvoiceNumber("");  // BUG-055
```

**New:**
```js
    setRows([emptyRow()]); setVendorId(""); setFare(0); setInvoiceNumber(""); setTotTax("");  // BUG-055 + CR-GST
```

**Verify:** Click "Reset" on form → Total GST field clears.

---

### Edit 5: Wire payload `tot_tax` + per-item `gst` (lines 215, 231-233)

**Current (line 215):**
```js
        tot_tax:       0,
```

**New:**
```js
        ...(totTax !== "" ? { tot_tax: Number(totTax) } : { tot_tax: 0 }),  // CR-GST
```

**Current (lines 231-233):**
```js
          Amount:     Number(r.amount) || 0, // capital A — API contract
          batch:      r.batch.trim(),
          ...(r.expiry && { expiry_date: r.expiry }),
```

**New:**
```js
          Amount:     Number(r.amount) || 0, // capital A — API contract
          ...(r.gst !== "" && { gst: Number(r.gst) }),  // CR-GST
          batch:      r.batch.trim(),
          ...(r.expiry && { expiry_date: r.expiry }),
```

**Verify:** Intercept POST payload in browser DevTools → `tot_tax` and `purchase_items[].gst` present.

---

### Edit 6: Add Total GST confirm header (after line 332)

**Current (lines 327-332):**
```jsx
              {invoiceNumber.trim() && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Invoice #</p>
                  <p className="font-medium font-mono text-[11px]">{invoiceNumber.trim()}</p>
                </div>
              )}
```

**New:**
```jsx
              {invoiceNumber.trim() && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Invoice #</p>
                  <p className="font-medium font-mono text-[11px]">{invoiceNumber.trim()}</p>
                </div>
              )}
              {/* CR-GST */}
              {Number(totTax) > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total GST</p>
                  <p className="font-medium">₹{Number(totTax).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                </div>
              )}
```

**Verify:** Enter GST → click Review → confirm header shows "Total GST" pill.

---

### Edit 7: Add GST column to confirm table header + cells (lines 339, 351)

**Current (line 339):**
```jsx
                  {["Item", "Qty", "Unit", "Rate", "Amount", "Batch", "Expiry"].map(h => (
```

**New:**
```jsx
                  {["Item", "Qty", "Unit", "Rate", "Amount", "GST", "Batch", "Expiry"].map(h => (
```

**Current (line 351):**
```jsx
                    <td className="px-3 py-2 tabular-nums font-medium">{r.amount ? `₹${Number(r.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}</td>
                    <td className="px-3 py-2"><Badge variant="secondary" className="text-[10px]">{r.batch}</Badge></td>
```

**New:**
```jsx
                    <td className="px-3 py-2 tabular-nums font-medium">{r.amount ? `₹${Number(r.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{r.gst ? `₹${Number(r.gst).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}</td>
                    <td className="px-3 py-2"><Badge variant="secondary" className="text-[10px]">{r.batch}</Badge></td>
```

**Verify:** Confirm screen table shows "GST" column between Amount and Batch.

---

### Edit 8: Add Total GST to confirm breakdown (lines 359-371)

**Current (lines 359-371):**
```jsx
          {/* BUG-058: items subtotal + fare breakdown — shown only when fare > 0 */}
          {Number(fare) > 0 && (
            <div className="border-t">
              <div className="px-4 py-1.5 flex justify-between text-xs text-muted-foreground">
                <span>Items subtotal</span>
                <span className="tabular-nums">₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="px-4 py-1.5 flex justify-between text-xs text-muted-foreground border-t border-border/30">
                <span>Fare</span>
                <span className="tabular-nums">₹ {Number(fare).toFixed(2)}</span>
              </div>
            </div>
          )}
```

**New:**
```jsx
          {/* BUG-058 + CR-GST: items subtotal + fare + GST breakdown */}
          {(Number(fare) > 0 || Number(totTax) > 0) && (
            <div className="border-t">
              <div className="px-4 py-1.5 flex justify-between text-xs text-muted-foreground">
                <span>Items subtotal</span>
                <span className="tabular-nums">₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {Number(fare) > 0 && (
                <div className="px-4 py-1.5 flex justify-between text-xs text-muted-foreground border-t border-border/30">
                  <span>Fare</span>
                  <span className="tabular-nums">₹ {Number(fare).toFixed(2)}</span>
                </div>
              )}
              {Number(totTax) > 0 && (
                <div className="px-4 py-1.5 flex justify-between text-xs text-muted-foreground border-t border-border/30">
                  <span>Total GST</span>
                  <span className="tabular-nums">₹ {Number(totTax).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          )}
```

**Verify:** Enter fare + GST → Review → breakdown shows Items subtotal, Fare, Total GST.

---

### Edit 9: Add Total GST input to header strip (after line 558)

**Current (lines 552-560):**
```jsx
                {/* Fare */}
                <div style={{ flex: "0.55", minWidth: 0 }}>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Fare</p>
                  <Input type="number" value={fare} min={0} step="0.01"
                    onChange={e => setFare(e.target.value)} className="h-8 text-xs"
                    style={{ MozAppearance: "textfield" }} />
                </div>

                {/* Divider */}
```

**New:**
```jsx
                {/* Fare */}
                <div style={{ flex: "0.55", minWidth: 0 }}>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Fare</p>
                  <Input type="number" value={fare} min={0} step="0.01"
                    onChange={e => setFare(e.target.value)} className="h-8 text-xs"
                    style={{ MozAppearance: "textfield" }} />
                </div>

                {/* CR-GST — Total GST */}
                <div style={{ flex: "0.55", minWidth: 0 }}>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Total GST</p>
                  <Input data-testid="tot-tax-input" type="number" value={totTax} min={0} step="0.01"
                    placeholder="0"
                    onChange={e => { const v = e.target.value; setTotTax(v !== "" && Number(v) < 0 ? "0" : v); }} className="h-8 text-xs"
                    style={{ MozAppearance: "textfield" }} />
                </div>

                {/* Divider */}
```

**Verify:** "Total GST" input visible in header strip, next to Fare. Entering -5 → clamped to 0.

---

### Edit 10: Add GST column to items table (colgroup + header) (lines 599-614)

**Current (lines 599-614):**
```jsx
                <colgroup>
                  <col style={{ width: 28 }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: 70 }} />
                  <col style={{ width: 50 }} />
                  <col style={{ width: 80 }} />
                  <col style={{ width: 80 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 108 }} />
                  <col style={{ width: 28 }} />
                </colgroup>
                <thead className="bg-muted/30">
                  <tr>
                    {["#", "Item *", "Qty *", "Unit", "Unit Price", "Amount", "Batch *", "Expiry", ""].map((h, i) => (
                      <th key={i} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-left px-2 py-1.5 border-b border-border">{h}</th>
                    ))}
```

**New:**
```jsx
                <colgroup>
                  <col style={{ width: 28 }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: 65 }} />
                  <col style={{ width: 48 }} />
                  <col style={{ width: 78 }} />
                  <col style={{ width: 78 }} />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 105 }} />
                  <col style={{ width: 28 }} />
                </colgroup>
                <thead className="bg-muted/30">
                  <tr>
                    {["#", "Item *", "Qty *", "Unit", "Unit Price", "Amount", "GST", "Batch *", "Expiry", ""].map((h, i) => (
                      <th key={i} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-left px-2 py-1.5 border-b border-border">{h}</th>
                    ))}
```

**Verify:** Table shows 10 columns with "GST" header between Amount and Batch.

---

### Edit 11: Add GST input to SpreadsheetRow (tab order + cell) (lines 710, 819-821)

**Current (line 710):**
```js
    const order = ["qty", "rate", "batch", "expiry"];
```

**New:**
```js
    const order = ["qty", "rate", "gst", "batch", "expiry"];  // CR-GST
```

**Current (lines 819-821):**
```jsx
      </td>

      {/* Batch */}
```

**New:**
```jsx
      </td>

      {/* CR-GST — GST per item */}
      <td className={td}>
        <Input id={`gst-${idx}`} data-testid={`gst-input-${idx}`}
          type="number" min={0} step="0.01" value={row.gst} placeholder="0"
          onChange={e => { const v = e.target.value; onUpdate("gst", v !== "" && Number(v) < 0 ? "0" : v); }}
          onKeyDown={e => handleKeyDown("gst", e)}
          className="h-[28px] text-xs" style={{ MozAppearance: "textfield" }} />
      </td>

      {/* Batch */}
```

**Verify:** Per-row GST input visible. Tab from Rate → focuses GST. Tab from GST → focuses Batch. Negative clamped.

---

### Edit 12: Add Row GST Total indicator below Grand Total bar (lines 641-647)

**Current (lines 641-647):**
```jsx
            {/* Grand total bar */}
            <div className="mx-3 mb-3 flex items-center justify-between px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
              <span className="text-[11px] font-medium text-green-700">Grand Total (excl. fare)</span>
              <span className="text-sm font-bold text-green-700 tabular-nums">
                ₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
```

**New:**
```jsx
            {/* Grand total bar */}
            <div className="mx-3 mb-1 flex items-center justify-between px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
              <span className="text-[11px] font-medium text-green-700">Grand Total (excl. fare)</span>
              <span className="text-sm font-bold text-green-700 tabular-nums">
                ₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {/* CR-GST — Row GST total indicator */}
            {gstTotal > 0 && (
              <div className="mx-3 mb-3 flex items-center justify-between px-3 py-1 bg-blue-50 border border-blue-200 rounded-md">
                <span className="text-[10px] font-medium text-blue-700">Row GST Total</span>
                <span className="text-xs font-semibold text-blue-700 tabular-nums">
                  ₹ {gstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {!gstTotal && <div className="mb-2" />}
```

**Verify:** Enter per-row GST → blue "Row GST Total" bar appears below green bar.

---

## Edits — File 2: PurchaseReport.jsx

### Edit 13: Add GST column header (line 240)

**Current (lines 239-240):**
```jsx
                  {["Date", isMultiStore && "Store", "Ingredient", "Vendor",
                    "Qty", "Unit Price", "Item Amt", "Fare", "Payment", "Invoice #", "Txn ID"]
```

**New:**
```jsx
                  {["Date", isMultiStore && "Store", "Ingredient", "Vendor",
                    "Qty", "Unit Price", "Item Amt", "GST", "Fare", "Payment", "Invoice #", "Txn ID"]
```

**Verify:** Report table has "GST" column between "Item Amt" and "Fare".

---

### Edit 14: Add GST cell to transaction header row (after line 292)

**Current (lines 287-293):**
```jsx
                        {/* BUG-061 Option B: Item Amt = line_total; Fare gets its own column */}
                        <td className="px-3 py-1.5 tabular-nums font-semibold whitespace-nowrap">
                          {isMulti
                            ? <span className="text-muted-foreground">—</span>
                            : `₹${Number(m.line_total).toLocaleString("en-IN")}`}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums whitespace-nowrap"
```

**New:**
```jsx
                        {/* BUG-061 Option B: Item Amt = line_total; Fare gets its own column */}
                        <td className="px-3 py-1.5 tabular-nums font-semibold whitespace-nowrap">
                          {isMulti
                            ? <span className="text-muted-foreground">—</span>
                            : `₹${Number(m.line_total).toLocaleString("en-IN")}`}
                        </td>
                        {/* CR-GST — GST cell */}
                        <td className="px-3 py-1.5 tabular-nums whitespace-nowrap"
                          data-testid={`pr-gst-${m.transaction_id}`}>
                          {(() => {
                            if (isMulti) {
                              const gstSum = lines.reduce((s, r) => s + (Number(r.gst) || 0), 0);
                              return gstSum > 0
                                ? <span className="font-semibold text-blue-600">₹{gstSum.toLocaleString("en-IN")}</span>
                                : <span className="text-muted-foreground">—</span>;
                            }
                            return m.gst != null && m.gst !== "" && Number(m.gst) > 0
                              ? <span className="font-semibold text-blue-600">₹{Number(m.gst).toLocaleString("en-IN")}</span>
                              : <span className="text-muted-foreground">—</span>;
                          })()}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums whitespace-nowrap"
```

**Verify:** Single-item purchase → shows per-item `gst`. Multi-item → shows sum. Null → "—".

---

### Edit 15: Add GST cell to ingredient sub-rows (line 344)

**Current (lines 341-344):**
```jsx
                          <td className="px-3 py-1 tabular-nums text-[11px] text-muted-foreground whitespace-nowrap">
                            ₹{Number(r.line_total).toLocaleString("en-IN")}
                          </td>
                          <td /><td /><td /><td />
```

**New:**
```jsx
                          <td className="px-3 py-1 tabular-nums text-[11px] text-muted-foreground whitespace-nowrap">
                            ₹{Number(r.line_total).toLocaleString("en-IN")}
                          </td>
                          {/* CR-GST */}
                          <td className="px-3 py-1 tabular-nums text-[10px] text-muted-foreground whitespace-nowrap">
                            {r.gst != null && r.gst !== "" && Number(r.gst) > 0
                              ? `₹${Number(r.gst).toLocaleString("en-IN")}`
                              : "—"}
                          </td>
                          <td /><td /><td /><td />
```

**Verify:** Multi-item sub-rows show per-item `gst` in the GST column.

---

## Risk Register

| # | Risk | Mitigation |
|---|------|------------|
| 1 | `validRows` temporal dead zone crash | Edit 3 moves `validRows` declaration above the useEffect that references it. Verified by previous crash. |
| 2 | `fullPayableTotal` change affects payment auto-fill | Correct per API spec. BUG-052 useEffect (line 190-194) auto-fills single-leg amount from `fullPayableTotal`. This will now include GST, which is correct — the payment covers the full payable total. |
| 3 | Table horizontal overflow from extra column | Edit 10 rebalances colgroup widths: Item 22%→20%, Qty 70→65, Unit 50→48, Rate 80→78, Amount 80→78, Batch 110→100, Expiry 108→105. GST column gets width 72. |
| 4 | Auto-sync loop (useEffect sets totTax → triggers re-render → runs again) | Safe: the effect only sets `totTax` when gstTotal > 0 AND all valid rows have GST filled. The `toFixed(2)` produces a stable string. No oscillation. |
| 5 | Sub-row column count mismatch | Edit 15 adds 1 `<td>` for GST but keeps the 4 trailing empty `<td />`s unchanged. The header has 12 columns (including GST), and the sub-row will also have 12 (Date + Store? + Ingredient + Vendor(empty) + Qty + UnitPrice + ItemAmt + GST + 4×empty). Needs verification — if `isMultiStore` is true, Store adds 1 column, so the empty count may need adjusting. **Verify at implementation time.** |

---

## Verification Matrix

| Edit # | File | Change Description | How to Verify | Automated? |
|:------:|------|--------------------|---------------|:---:|
| 1 | AddStockPurchaseForm.jsx:62 | Add `gst: ""` to emptyRow | grep confirms field present | NO |
| 2 | AddStockPurchaseForm.jsx:43 | Add `totTax` state | grep confirms useState | NO |
| 3 | AddStockPurchaseForm.jsx:85-98 | Reorder validRows + add gstTotal + auto-sync + fullPayableTotal | App loads without crash; `webpack compiled` in log | NO |
| 4 | AddStockPurchaseForm.jsx:197 | Add `setTotTax("")` to resetForm | Browser: click Reset → Total GST clears | NO |
| 5 | AddStockPurchaseForm.jsx:215,232 | Wire payload tot_tax + gst | DevTools: intercept POST → keys present | NO |
| 6 | AddStockPurchaseForm.jsx:332 | Add Total GST to confirm header | Browser: enter GST → Review → header shows Total GST | NO |
| 7 | AddStockPurchaseForm.jsx:339,351 | Add GST column to confirm table | Browser: confirm table has GST column | NO |
| 8 | AddStockPurchaseForm.jsx:359-371 | Add GST to confirm breakdown | Browser: breakdown shows Total GST row | NO |
| 9 | AddStockPurchaseForm.jsx:552-558 | Add Total GST input to header strip | Browser: input visible next to Fare | NO |
| 10 | AddStockPurchaseForm.jsx:599-614 | Add GST to colgroup + table header | Browser: table has 10 columns with GST | NO |
| 11 | AddStockPurchaseForm.jsx:710,819 | Add GST to tab order + input cell | Browser: Tab Rate→GST→Batch works. Negative clamped. | NO |
| 12 | AddStockPurchaseForm.jsx:641-647 | Row GST Total indicator | Browser: enter row GSTs → blue bar appears | NO |
| 13 | PurchaseReport.jsx:240 | Add GST header | Browser: report has GST column | NO |
| 14 | PurchaseReport.jsx:292 | Add GST cell to txn header | Browser: single-item shows gst; multi shows sum | NO |
| 15 | PurchaseReport.jsx:344 | Add GST cell to sub-rows | Browser: multi-item sub-rows show per-item gst | NO |

---

## Post-Code Registry Checklist (for IMPLEMENTATION agent)

- [ ] `registry.json`: CR-GST → status: IMPLEMENTED, artifact_refs updated
- [ ] L3: row updated with new status
- [ ] L7: AddStockPurchaseForm.jsx + PurchaseReport.jsx listed as MODIFIED by CR-GST
- [ ] Code markers: `// CR-GST` comment in every modified file
- [ ] Dashboard drift check: `node control/gen_dashboard_data.js --check` → PASS
