# BUG-061 — ARTIFACT 3: IMPLEMENTATION PLAN
> **ID:** BUG-061
> **Artifact:** 3 — Implementation Plan (Gate 3)
> **Date:** 2026-10-20
> **Role:** PLANNING
> **Impact Analysis:** `control/sessions/BUG-061_ARTIFACT_2_IMPACT_ANALYSIS.md`
> **Target file:** `frontend/src/components/central-inventory/PurchaseReport.jsx` (290 lines)

---

## Scope Lock

**Files WILL change:**
- `frontend/src/components/central-inventory/PurchaseReport.jsx`

**Files will NOT touch:**
- `frontend/src/services/api.js` — no API changes
- `frontend/src/lib/screenVisibility.js` — FROZEN
- `frontend/src/lib/terminology.js` — FROZEN
- `backend/server.py` — no proxy changes
- Any other file

---

## Execution Order

```
Edit 1  → line 2       Add Fragment to React import
Edit 2  → line 34      Remove totalAmount state
Edit 3  → line 55      Remove setTotalAmount from fetch handler
Edit 4  → after line 69 Add txnGroups + correctTotal useMemos
Edit 5  → line 150     totalAmount → correctTotal in summary bar
Edit 6  → lines 229–276 Replace flat tbody with transaction-grouped render
```

Rationale: Edits 1–5 are small surgical changes to the top of the file.
Edit 6 (tbody rewrite) is the largest and comes last — it depends on `txnGroups` and `Fragment`
introduced by Edits 1 + 4.

---

## Edit 1 — Add `Fragment` to React import
**Line:** 2

**Current:**
```javascript
import { useState, useEffect, useMemo } from "react";
```

**New:**
```javascript
import { useState, useEffect, useMemo, Fragment } from "react"; // BUG-061
```

**Why:** The grouped tbody render uses `<Fragment key={...}>` to group header + sub-rows per
transaction without a DOM wrapper. The `<>` shorthand does not support `key` props —
`Fragment` with an explicit key is required here.

**Verification:** `grep -n "Fragment" frontend/src/components/central-inventory/PurchaseReport.jsx`
→ shows line 2 (import) and the key usage inside tbody.

---

## Edit 2 — Remove `totalAmount` state
**Line:** 34

**Current:**
```javascript
  const [totalAmount, setTotalAmount] = useState("0");
```

**New:** *(line deleted — leave blank line or remove entirely)*
```javascript
```

**Why:** `totalAmount` is set from `d.total_amount` (API root field) which excludes fare
per G-038. It is replaced by `correctTotal` useMemo (Edit 4) which computes the correct
inclusive total from row-level `tot_amount` fields.

**Verification:** `grep -n "totalAmount" frontend/src/components/central-inventory/PurchaseReport.jsx`
→ should return 0 results after Edits 2, 3, and 5 are all applied.

---

## Edit 3 — Remove `setTotalAmount` from fetch handler
**Line:** 55

**Current:**
```javascript
        setTotalAmount(d.total_amount ?? "0");
```

**New:** *(line deleted)*
```javascript
```

**Why:** `totalAmount` state no longer exists (Edit 2). `correctTotal` derives from `rows`
state which is still set by `setRows(d.data || [])` on the line above — no replacement needed.

**Verification:** Fetch handler `then()` block (lines 52–58) should now contain only:
`setRows`, `setSummary`, `setByRestaurant` calls.

---

## Edit 4 — Add `txnGroups` + `correctTotal` useMemos
**Insert after:** the `displayRows` useMemo block (after line 69)

**Current (lines 64–69):**
```javascript
  // ── Client-side ingredient search ─────────────────────────────
  const displayRows = useMemo(() =>
    !searchText
      ? rows
      : rows.filter(r => (r.Ingredient_Name || "").toLowerCase().includes(searchText.toLowerCase())),
    [rows, searchText]);
```

**New (lines 64–69 unchanged, then add):**
```javascript
  // ── Client-side ingredient search ─────────────────────────────
  const displayRows = useMemo(() =>
    !searchText
      ? rows
      : rows.filter(r => (r.Ingredient_Name || "").toLowerCase().includes(searchText.toLowerCase())),
    [rows, searchText]);

  // ── BUG-061: group displayRows by transaction_id ───────────────
  const txnGroups = useMemo(() => {
    const map = new Map();
    displayRows.forEach(r => {
      if (!map.has(r.transaction_id)) map.set(r.transaction_id, { meta: r, lines: [] });
      map.get(r.transaction_id).lines.push(r);
    });
    return Array.from(map.values());
  }, [displayRows]);

  // ── BUG-061: correct total — dedup by txn_id, sum tot_amount ──
  // d.total_amount (API root) = sum(line_totals), excludes fare — G-038 won't fix.
  // Compute from rows: one tot_amount per unique transaction_id.
  const correctTotal = useMemo(() => {
    const seen = new Set();
    return rows.reduce((s, r) => {
      if (!seen.has(r.transaction_id)) { seen.add(r.transaction_id); return s + Number(r.tot_amount || 0); }
      return s;
    }, 0);
  }, [rows]);
```

**Notes:**
- `txnGroups` depends on `displayRows` (respects active search filter).
- `correctTotal` depends on `rows` (unfiltered — correct for the summary bar total,
  same source as the old `d.total_amount` but computes accurately).
- Both are pure derivations — no side effects, no extra renders.

**Verification:**
- `grep -n "txnGroups\|correctTotal" PurchaseReport.jsx` → shows the 2 useMemos + their usages in Edit 5 + 6.

---

## Edit 5 — Summary bar: `totalAmount` → `correctTotal`
**Line:** 150

**Current:**
```javascript
            ₹{Number(totalAmount).toLocaleString("en-IN")}
```

**New:**
```javascript
            ₹{correctTotal.toLocaleString("en-IN")}
```

**Why:** `correctTotal` is already a `number` (useMemo returns `rows.reduce(...)` which is numeric).
`Number()` wrapper is not needed but can be kept — either is safe.

**Verification:** Summary bar displays ₹4,598 (inclusive of all fares) instead of ₹3,998.

---

## Edit 6 — Replace flat tbody with transaction-grouped render
**Lines:** 229–276 (48 lines → replaced with ~85 lines)

**Current (lines 229–276):**
```jsx
              <tbody>
                {displayRows.map(r => (
                  <tr key={r.ID}
                    className="border-b border-border/20 hover:bg-muted/10 transition-colors"
                    data-testid={`pr-row-${r.ID}`}>
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums text-muted-foreground">
                      {r.Purchase_Date}
                    </td>
                    {isMultiStore && (
                      <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                        {r.Restaurant_Name}
                      </td>
                    )}
                    <td className="px-3 py-1.5 font-medium">{r.Ingredient_Name}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{r.Vendor_Name}</td>
                    <td className="px-3 py-1.5 tabular-nums whitespace-nowrap">{r.Quantity}</td>
                    <td className="px-3 py-1.5 tabular-nums whitespace-nowrap text-muted-foreground">
                      {/* BUG-056 B1: unit_price is per-gram; compute per-display-unit via line_total/stock_quantity_raw */}
                      {r.stock_quantity_raw > 0 && r.line_total > 0
                        ? `₹${(r.line_total / r.stock_quantity_raw).toLocaleString("en-IN")}`
                        : "—"}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums font-semibold whitespace-nowrap">
                      ₹{Number(r.line_total).toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-1.5">
                      {/* BUG-056 B2: render partial_payments legs when present; fallback to Payment_Type badge */}
                      {r.Payment_Type === "partial" && r.partial_payments?.length > 0
                        ? <div className="flex flex-col gap-0.5">
                            {r.partial_payments.map((leg, i) => (
                              <span key={i} className="text-[10px] whitespace-nowrap">
                                {leg.payment_mode} ₹{Number(leg.amount).toLocaleString("en-IN")}
                              </span>
                            ))}
                          </div>
                        : r.Payment_Type
                          ? <Badge variant="outline" className="text-[9px] py-0 px-1.5 whitespace-nowrap">{r.Payment_Type}</Badge>
                          : <span className="text-muted-foreground">—</span>}
                    </td>
                    {/* CR-051 A2 — Invoice # column (store-only, no duplicate check) */}
                    <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                      {r.invoice_number || "—"}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                      {r.transaction_id || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
```

**New:**
```jsx
              <tbody>
                {/* BUG-061: transaction-grouped render ─────────────────────────
                    Each group = 1 transaction header row + optional ingredient sub-rows.
                    Header row: Date/Store/Vendor/Payment/Invoice#/Amount+fare/TxnID — shown ONCE per purchase.
                    Sub-rows: ingredient detail — shown only when a purchase has 2+ ingredients.       */}
                {txnGroups.map(({ meta: m, lines }) => {
                  const isMulti = lines.length > 1;
                  const hasFare = Number(m.tot_fair) > 0;
                  return (
                    <Fragment key={m.transaction_id}>

                      {/* ── Transaction header row ── */}
                      <tr className="border-b border-border/20 bg-muted/20 hover:bg-muted/30 transition-colors"
                        data-testid={`pr-txn-${m.transaction_id}`}>
                        <td className="px-3 py-1.5 whitespace-nowrap tabular-nums text-muted-foreground">
                          {m.Purchase_Date}
                        </td>
                        {isMultiStore && (
                          <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                            {m.Restaurant_Name}
                          </td>
                        )}
                        <td className="px-3 py-1.5 font-medium">
                          {isMulti
                            ? <span className="text-muted-foreground text-[11px] italic">{lines.length} items</span>
                            : m.Ingredient_Name}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">{m.Vendor_Name}</td>
                        <td className="px-3 py-1.5 tabular-nums whitespace-nowrap">
                          {isMulti ? <span className="text-muted-foreground">—</span> : m.Quantity}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums whitespace-nowrap text-muted-foreground">
                          {/* BUG-056 B1 preserved: unit_price per-display-unit (blank for multi-item) */}
                          {isMulti ? <span className="text-muted-foreground">—</span>
                            : m.stock_quantity_raw > 0 && m.line_total > 0
                              ? `₹${(m.line_total / m.stock_quantity_raw).toLocaleString("en-IN")}`
                              : "—"}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums font-semibold whitespace-nowrap">
                          ₹{Number(m.tot_amount).toLocaleString("en-IN")}
                          {hasFare && (
                            <div className="text-[9px] font-normal text-orange-600 whitespace-nowrap mt-0.5"
                              data-testid={`pr-fare-${m.transaction_id}`}>
                              + ₹{Number(m.tot_fair).toLocaleString("en-IN")} fare
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          {/* BUG-056 B2 preserved: partial_payments legs or single badge */}
                          {m.Payment_Type === "partial" && m.partial_payments?.length > 0
                            ? <div className="flex flex-col gap-0.5">
                                {m.partial_payments.map((leg, i) => (
                                  <span key={i} className="text-[10px] whitespace-nowrap">
                                    {leg.payment_mode} ₹{Number(leg.amount).toLocaleString("en-IN")}
                                  </span>
                                ))}
                              </div>
                            : m.Payment_Type
                              ? <Badge variant="outline" className="text-[9px] py-0 px-1.5 whitespace-nowrap">{m.Payment_Type}</Badge>
                              : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                          {m.invoice_number || "—"}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                          {m.transaction_id || "—"}
                        </td>
                      </tr>

                      {/* ── Ingredient sub-rows (multi-item purchases only) ── */}
                      {isMulti && lines.map(r => (
                        <tr key={r.ID}
                          className="border-b border-border/10 hover:bg-muted/10 transition-colors"
                          data-testid={`pr-row-${r.ID}`}>
                          <td className="px-3 py-1 text-[10px] text-muted-foreground select-none">└</td>
                          {isMultiStore && <td />}
                          <td className="pl-4 pr-3 py-1 text-[11px] text-muted-foreground">{r.Ingredient_Name}</td>
                          <td />
                          <td className="px-3 py-1 tabular-nums whitespace-nowrap text-[11px] text-muted-foreground">
                            {r.Quantity}
                          </td>
                          <td className="px-3 py-1 tabular-nums whitespace-nowrap text-[10px] text-muted-foreground">
                            {r.stock_quantity_raw > 0 && r.line_total > 0
                              ? `₹${(r.line_total / r.stock_quantity_raw).toLocaleString("en-IN")}`
                              : "—"}
                          </td>
                          <td className="px-3 py-1 tabular-nums text-[11px] text-muted-foreground whitespace-nowrap">
                            ₹{Number(r.line_total).toLocaleString("en-IN")}
                          </td>
                          <td /><td /><td />
                        </tr>
                      ))}

                    </Fragment>
                  );
                })}
              </tbody>
```

---

## Verification Matrix

| # | Edit # | Expected | Self-test |
|---|--------|----------|-----------|
| V1 | 1 | `Fragment` in import | `grep -n "Fragment" PurchaseReport.jsx` → line 2 |
| V2 | 2+3 | `totalAmount` gone | `grep -n "totalAmount" PurchaseReport.jsx` → 0 results |
| V3 | 4 | `txnGroups` + `correctTotal` exist | `grep -n "txnGroups\|correctTotal" PurchaseReport.jsx` → 4+ lines |
| V4 | 5+4 | Summary shows ₹4,598 | Login → /reports/purchase → summary bar correct total |
| V5 | 6 | Single-item: 1 row (Baby Corn in Ingredient col) | PUR-828-20261020-8011 → 1 table row |
| V6 | 6 | Multi-item: header + sub-rows | PUR-828-20261019-8009 → header "2 items" + 2 sub-rows |
| V7 | 6 | Fare badge on header (orange, + ₹200 fare) | `data-testid="pr-fare-PUR-828-20261020-8011"` visible |
| V8 | 6 | No fare badge for zero-fare transactions | PUR-828-20261020-8012 → no fare badge |
| V9 | 6 | Payment shown once per multi-item transaction | PUR-828-20261019-8010 → "Partial" on header only |
| V10 | 6 | BUG-056 unit price formula preserved in sub-rows | Curry Leaf 11kg ₹88 → ₹8/kg in Unit Price col |
| V11 | all | Compile: 0 errors | `tail -5 /var/log/supervisor/frontend.out.log` → "Compiled" |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|-----------|
| `Fragment` with `key` renders correctly in React 19 | NONE | — | Standard React pattern, unchanged since React 16.2 |
| `txnGroups` Map preserves API row order | NONE | — | JS `Map` preserves insertion order |
| `isMultiStore && <td />` in sub-row creates misaligned cols | LOW | LOW | Empty `<td />` keeps column count consistent across row types |
| `correctTotal` off when search filter active | NONE | — | `correctTotal` depends on `rows` (unfiltered), same as original `totalAmount` |
| BUG-056 unit price formula broken in sub-rows | NONE | — | Exact same formula copied verbatim into sub-row Unit Price cell |
| `tot_amount` unavailable on some rows | LOW | LOW | `Number(m.tot_amount || 0)` — defaults to 0 safely |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-061 → status: "IMPLEMENTED", artifact_ref[4] Code-Gate DONE
- [ ] registry.json: BUG-061 → artifact_ref[5] QA-Report path when QA runs
- [ ] L4_BUG_TRACKER.md: BUG-061 row → IMPLEMENTED
- [ ] L7_FILE_OWNERSHIP.md: PurchaseReport.jsx entry appended for BUG-061
- [ ] Code markers:
      grep -n "BUG-061" frontend/src/components/central-inventory/PurchaseReport.jsx
      → must show at least 3 lines
- [ ] Dashboard: node control/gen_dashboard_data.js --check → PASS
- [ ] Compile: tail -5 /var/log/supervisor/frontend.out.log → "Compiled successfully"
```

---

## Handover → Owner (Gate 3 Complete)

```
Implementation Plan ready.
Artifact: control/sessions/BUG-061_ARTIFACT_3_IMPLEMENTATION_PLAN.md

6 edits, 1 file (PurchaseReport.jsx).
Scope lock: ONLY PurchaseReport.jsx. No other file.
Verification matrix: 11 checks (V1-V11, all browser/manual + 1 compile).
Owner decisions needed: NONE.

Awaiting Gate 4 GO to proceed to IMPLEMENTATION.
```
