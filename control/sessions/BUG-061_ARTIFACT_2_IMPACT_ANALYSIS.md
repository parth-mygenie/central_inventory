# BUG-061 — ARTIFACT 2: IMPACT ANALYSIS
> **ID:** BUG-061
> **Artifact:** 2 — Impact Analysis (Gate 2)
> **Date:** 2026-10-20
> **Role:** PLANNING
> **Stage dispatch:** Impact Analysis only — STOP at Gate 2
> **Investigation:** `control/sessions/INVESTIGATION_20261020_BUG061_DESIGN.md`
> **Owner decisions applied:**
>   - TXN ID column: **keep** at far right, de-emphasised mono/muted (already is)
>   - Single-item transactions: ingredient shown **inline** in transaction header (compact)

---

## Step 0 — Code Reality Check

```bash
grep -n "txnGroups\|correctTotal\|tot_fair\|tot_amount\|isFirstInTxn" \
  frontend/src/components/central-inventory/PurchaseReport.jsx
```

Result: **0 matches** — none of the proposed constructs exist in the file.

**Code Reality: NONE. Safe to proceed with full implementation.**

---

## Step 1 — Conflict Pre-Check

**L7 last modifier of `PurchaseReport.jsx`:** BUG-056 (2026-10-19) — IMPLEMENTED, QA PASS.

**Registry scan — open items on same file:**

| Item | Title | Status | Overlap? |
|------|-------|:------:|----------|
| CR-051 | Purchase Report Screen | IN_PROGRESS (Gate 5) | **Parent CR** — created this file. BUG-061 is an enhancement to the same screen. No code conflict; BUG-061 edits distinct regions (state, useMemos, tbody). Execution: BUG-061 applied to current file state. |
| BUG-056 | Unit Price + Split Payments fix | IMPLEMENTED | CLOSED for editing. Code markers at lines 246, 255. BUG-061 does not touch those lines. |
| BUG-061 | This item | PLANNED | — |

**Verdict: NO CONFLICT.** BUG-061 edits distinct regions from CR-051's Gate 5 work.
If CR-051 QA runs before BUG-061 ships: QA scope should include fare column (document as dependency).

---

## Step 2 — Data Flow Trace

```
API → getVendorItemListFull(restaurantId, filters)
  Response shape:
    data.data[]      → ingredient rows (one per ingredient per purchase)
    data.total_amount → sum(line_total) — EXCLUDES fare (G-038, backend won't fix)
    data.summary     → {total_records, scope_store_count, ...}
    data.by_restaurant → [{restaurant_id, name, type_flag, total_amount, line_count}]

State:
  rows          [line 33]  → raw ingredient rows from API
  totalAmount   [line 34]  → d.total_amount — WRONG (excludes fare) ← REMOVE
  summary       [line 35]  → summary object
  byRestaurant  [line 36]  → store breakdown
  displayRows   [line 65]  → client-side search filter on rows

Current render path:
  displayRows.map(r => <tr>)   [lines 229-276]
  → one <tr> per ingredient row
  → Amount cell [line 252]: r.line_total (item cost only)
  → Payment cell [lines 255-266]: repeats on EVERY row of same transaction ← confusing
  → Invoice # cell [lines 268-271]: repeats on EVERY row of same transaction ← confusing
  → no fare anywhere

Proposed render path:
  txnGroups.map(({meta, lines}) => <>txn header <tr> + sub-rows</>)
  → txn header: tot_amount (full payment) + fare badge + payment ONCE + invoice ONCE
  → sub-rows: ingredient + qty + unit price + line_total (only when lines.length > 1)
```

---

## Step 3 — Affected Regions (6 targeted changes)

### Region A — Remove `totalAmount` state (line 34)

**Current:**
```javascript
const [totalAmount, setTotalAmount] = useState("0");
```

**Change:** Remove entirely. Replaced by `correctTotal` useMemo (Region C).

**Downstream check:** `totalAmount` referenced only at line 150 (summary bar). Safe to remove
after Region D is applied.

---

### Region B — Remove `setTotalAmount` from fetch handler (line 55)

**Current:**
```javascript
setTotalAmount(d.total_amount ?? "0");
```

**Change:** Remove this line. `correctTotal` is derived from `rows` state — no separate state needed.

---

### Region C — Add `txnGroups` + `correctTotal` useMemos (after line 69)

**Current (lines 64–69):**
```javascript
// ── Client-side ingredient search ─────────────────────────────
const displayRows = useMemo(() =>
  !searchText
    ? rows
    : rows.filter(r => (r.Ingredient_Name || "").toLowerCase().includes(searchText.toLowerCase())),
  [rows, searchText]);
```

**Add immediately after (new lines 71–84):**
```javascript
// ── BUG-061: group displayRows by transaction for grouped render ───
const txnGroups = useMemo(() => {
  const map = new Map();
  displayRows.forEach(r => {
    if (!map.has(r.transaction_id)) map.set(r.transaction_id, { meta: r, lines: [] });
    map.get(r.transaction_id).lines.push(r);
  });
  return Array.from(map.values());
}, [displayRows]);

// ── BUG-061: correct total = dedup by txn_id + sum tot_amount ─────
// Root d.total_amount excludes fare (G-038). Compute from rows instead.
const correctTotal = useMemo(() => {
  const seen = new Set();
  return rows.reduce((s, r) => {
    if (!seen.has(r.transaction_id)) { seen.add(r.transaction_id); return s + Number(r.tot_amount || 0); }
    return s;
  }, 0);
}, [rows]);
```

**Notes:**
- `txnGroups` derives from `displayRows` (reflects active search filter).
- `correctTotal` derives from `rows` (all data, not filtered — same source as today's `totalAmount`).
- Both are pure computations — no side effects, no re-renders triggered.

---

### Region D — Summary bar: swap `totalAmount` → `correctTotal` (line 150)

**Current:**
```javascript
₹{Number(totalAmount).toLocaleString("en-IN")}
```

**New:**
```javascript
₹{correctTotal.toLocaleString("en-IN")}
```

`correctTotal` is already a Number (sum reduces to 0 initially). No `Number()` wrapper needed,
but can be kept for safety. The value now correctly includes all transaction fares.

---

### Region E — Column headers: no structural change needed

**Current headers:**
```javascript
["Date", isMultiStore && "Store", "Ingredient", "Vendor",
  "Qty", "Unit Price", "Amount", "Payment", "Invoice #", "Txn ID"]
```

**Verdict: Keep as-is.** 10 columns, same names. The "Amount" column will serve dual purpose:
- On transaction header rows: shows `tot_amount` (full payment including fare) + fare badge
- On ingredient sub-rows: shows `line_total` (individual ingredient cost)

No new column added. Fare is surfaced as an inline badge inside the Amount cell of the
transaction header — eliminates the need for a dedicated "Fare" column and avoids
increasing table width.

---

### Region F — Table body: replace flat map with grouped render (lines 229–276)

**Current (47 lines):** `displayRows.map(r => <tr>...)` — one flat row per ingredient.

**New (~80 lines):** `txnGroups.map(({meta, lines}) => ...)` — two row types:

#### Transaction Header Row
- Background: `bg-muted/20` (subtle shading to visually group)
- Shown for every transaction, regardless of item count

| Col | Content |
|-----|---------|
| Date | `meta.Purchase_Date` |
| [Store] | `meta.Restaurant_Name` (multi-store only) |
| Ingredient | If `lines.length === 1`: ingredient name. If `lines.length > 1`: `"{N} items"` in muted text |
| Vendor | `meta.Vendor_Name` |
| Qty | If `lines.length === 1`: `meta.Quantity`. If multi-item: `—` |
| Unit Price | If `lines.length === 1`: computed unit price (BUG-056 formula). If multi-item: `—` |
| Amount | `₹{tot_amount}` **bold** + conditional fare badge below:<br>`tot_fair > 0` → `<span>+ ₹{tot_fair} fare</span>` in orange |
| Payment | Badge(s) — same BUG-056 logic (partial_payments or Payment_Type) |
| Invoice # | `meta.invoice_number \|\| "—"` |
| TXN ID | `meta.transaction_id` — de-emphasised, mono font, muted colour *(owner confirmed: keep)* |

#### Ingredient Sub-row (rendered only when `lines.length > 1`)
- No background, slight indent
- One sub-row per ingredient line

| Col | Content |
|-----|---------|
| Date | `└` indicator (text-muted-foreground) |
| [Store] | blank |
| Ingredient | `r.Ingredient_Name` (indented, `pl-3`) |
| Vendor | blank |
| Qty | `r.Quantity` |
| Unit Price | BUG-056 formula: `r.line_total / r.stock_quantity_raw` |
| Amount | `₹{r.line_total}` |
| Payment | blank |
| Invoice # | blank |
| TXN ID | blank |

**Key invariant:** Payment + Invoice # appear **once per transaction** (on header only).
Fare appears **once per transaction** (on header, only when `tot_fair > 0`).
No field is ever repeated for multi-item transactions.

---

## Downstream Consumer Check

| Consumer | Current | After change | Safe? |
|----------|---------|--------------|-------|
| Summary bar (line 150) | `totalAmount` state | `correctTotal` useMemo | ✅ Same type, same display |
| Search count footer (line 281) | `displayRows.length` | unchanged | ✅ No change |
| By-store accordion (lines 169–196) | `byRestaurant` state | unchanged | ✅ No change |
| `displayRows` itself | used in tbody + footer | `txnGroups` replaces in tbody; footer still uses `displayRows.length` | ✅ |
| `summary.total_records` (line 154) | still used for count | unchanged | ✅ No change |

---

## Affected Files

| File | Lines | Change Type | Risk |
|------|-------|-------------|------|
| `PurchaseReport.jsx` | 34 | Remove `totalAmount` state | LOW |
| `PurchaseReport.jsx` | 55 | Remove `setTotalAmount` in fetch | LOW |
| `PurchaseReport.jsx` | 70–84 (new) | Add `txnGroups` + `correctTotal` useMemos | LOW |
| `PurchaseReport.jsx` | 150 | `totalAmount` → `correctTotal` | LOW |
| `PurchaseReport.jsx` | 229–276 | Replace 47 lines with ~80 (grouped render) | LOW–MEDIUM |

**Files will NOT touch:**
- `api.js` — no API changes
- `screenVisibility.js` — FROZEN, untouched
- `terminology.js` — FROZEN, untouched
- `backend/server.py` — no proxy changes
- Any other file

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|-----------|
| `txnGroups` map preserves API row order | NONE | — | `Map` preserves insertion order in JS; `displayRows` already sorted by API |
| `correctTotal` double-counts on filter | NONE | — | Deduplication uses `transaction_id` — same txn appears once regardless of filtered rows |
| Sub-row "└" in Date column looks odd | LOW | LOW | `└` is a visual convention; can use an `ArrowRight` icon or just indent with `pl-8` |
| Single-item txn: Amount cell shows `tot_amount` (not `line_total`) | INTENTIONAL | — | When fare > 0: `tot_amount > line_total` → correct. When fare = 0: `tot_amount === line_total` → identical value |
| BUG-056 unit price formula preserved | NONE | — | Formula `line_total / stock_quantity_raw` still used unchanged on both header (1-item) and sub-rows |
| `displayRows` still used in footer counter | NONE | — | Footer at line 281 uses `displayRows.length` directly — unaffected by tbody change |

---

## Open Questions

**None.** Owner decisions:
- TXN ID: keep, far right, de-emphasised ✅
- Single-item display: ingredient inline in header ✅

---

## Verification Matrix (seeds Gate 6 QA)

| # | Check | How to Verify |
|---|-------|---------------|
| V1 | Single-item purchase: shows 1 row (header only, no sub-row) | PUR-828-20261020-8011 → 1 row, Baby Corn shown in Ingredient col |
| V2 | Multi-item purchase: header + N sub-rows | PUR-828-20261019-8009 → 1 header ("2 items") + 2 sub-rows (Baby Corn, Apple) |
| V3 | Fare badge shows on header when tot_fair > 0 | PUR-828-20261020-8011 (fare ₹200) → orange `+ ₹200 fare` badge visible |
| V4 | No fare badge when tot_fair = 0 | PUR-828-20261020-8012 (no fare) → Amount col shows ₹100, no badge |
| V5 | Payment appears once per transaction (not per ingredient row) | PUR-828-20261019-8010 (2 items, partial) → payment badge on header only |
| V6 | Invoice # appears once per transaction | Same transaction → invoice "cbvbb8" on header only |
| V7 | Summary total includes fares: ₹4,598 not ₹3,998 | Summary bar → ₹4,598 for the test date range |
| V8 | Search filter still works | Type "corn" → only Baby Corn transactions visible |
| V9 | Single-item Amount = tot_amount (same as line_total when no fare) | PUR-828-20261020-8012: line_total=100, tot_amount=100 → ₹100 |
| V10 | TXN ID visible on header row, de-emphasised | All transactions: TXN ID in last col, mono/muted style |

---

## Handover → Owner (Gate 2 Complete)

```
Gate 2 Impact Analysis complete for BUG-061.
Artifact: control/sessions/BUG-061_ARTIFACT_2_IMPACT_ANALYSIS.md

1 file (PurchaseReport.jsx). 6 targeted regions.
Code Reality: NONE. No conflicts.
No new columns — fare surfaces as a badge inside the Amount cell.
No API changes. No backend changes.
Verification matrix: 10 checks.
Owner decisions needed: NONE (both answered above).

Awaiting "gate 3" to proceed to Implementation Plan.
```
