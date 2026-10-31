# INVESTIGATION — BUG-061: Purchase Report Design + Fare Addition
> **Date:** 2026-10-20
> **Role:** INVESTIGATION
> **Triggered by:** Owner — "report seems a little confusing" + "how will fare be added"
> **File:** `frontend/src/components/central-inventory/PurchaseReport.jsx`
> **API probed:** vendor-item-list (live, RID 828, last 30 days)

---

## Step 1 — What Is Confusing Right Now

The root problem is a **data model mismatch**: a "purchase" in the user's mind is ONE event
(one trip to the vendor, one payment, one invoice, one fare). But the API returns ONE ROW
per *ingredient* in that purchase. A purchase of Apple + Beet Root appears as TWO rows that
look identical apart from the ingredient name.

This causes three specific confusions:

### Confusion A — Fare is invisible
`Amount` column = `line_total` (item cost only). No fare anywhere.
Baby Corn PUR-828-20261020-8011: shows ₹1,000. Actual payment: ₹1,200.

### Confusion B — Multi-item purchases look like separate purchases
PUR-828-20261019-8009 (Baby Corn + Apple, same trip):

| Date | Ingredient | Amount | Payment | Invoice | TXN ID |
|------|------------|--------|---------|---------|--------|
| 2026-10-19 | Baby Corn | ₹120 | Cash | cbvbb8 | PUR-...-8009 |
| 2026-10-19 | Apple | ₹120 | Cash | cbvbb8 | PUR-...-8009 |

Two rows, identical vendor/payment/invoice/TXN — looks like two separate cash purchases.
User has to scan to the last column (TXN ID) to realise they're one event.

### Confusion C — Payment + Invoice # repeat per ingredient row
PUR-828-20261019-8010 (Curry Leaf + Beet Root, split payment):

| Ingredient | Amount | Payment | Invoice # | TXN ID |
|------------|--------|---------|-----------|--------|
| Curry Leaf | ₹88 | Cash ₹200 Card ₹88 | cbvbb8 | PUR-...-8010 |
| Beet Root | ₹200 | Cash ₹200 Card ₹88 | cbvbb8 | PUR-...-8010 |

"Cash ₹200 + Card ₹88" appearing twice looks like the payment happened twice.

### Summary bar also wrong
Root `total_amount` = `₹3,998` (sum of `line_total` across all rows — excludes fare).
Correct total including fares = `₹4,598`. Delta = `₹600` missing.

---

## Step 2 — Data Structure (live API)

```
8 transactions, 10 ingredient rows:

PUR-...-8005 │ 1 item  │ fare ₹0   │ tot ₹160
PUR-...-8006 │ 1 item  │ fare ₹300 │ tot ₹2,300
PUR-...-8007 │ 1 item  │ fare ₹100 │ tot ₹300   (partial: Cash+UPI)
PUR-...-8008 │ 1 item  │ fare ₹0   │ tot ₹10
PUR-...-8009 │ 2 items │ fare ₹0   │ tot ₹240   ← Baby Corn + Apple
PUR-...-8010 │ 2 items │ fare ₹0   │ tot ₹288   ← Curry Leaf + Beet Root (partial)
PUR-...-8011 │ 1 item  │ fare ₹200 │ tot ₹1,200
PUR-...-8012 │ 1 item  │ fare ₹0   │ tot ₹100

Key facts:
  tot_fair    — the TOTAL fare for the whole transaction; same value on ALL rows of a txn
  tot_amount  — items + fare for the whole transaction; same value on ALL rows of a txn
  line_total  — per-ingredient cost only; different per row
```

This confirms: `tot_fair` and `tot_amount` are **transaction-level** fields stored redundantly
on every ingredient row. They must NEVER be summed directly across all rows (double-counts
on multi-item transactions).

---

## Step 3 — Proposed Design: Transaction-Grouped Table

### Concept

Replace the flat row-per-ingredient table with a **grouped layout**: each purchase event
becomes a **transaction header row** followed by its **ingredient sub-rows**.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 2026-10-19  masala dairy  Partial  cbvbb8  —  ₹288  PUR-828-20261019-8010   [▸] │  ← TXN header
│   └ Curry Leaf    11 kg   ₹8    ₹88                                              │  ← ingredient row
│   └ Beet Root     10 kg   ₹20   ₹200                                             │  ← ingredient row
├─────────────────────────────────────────────────────────────────────────────────┤
│ 2026-10-20  masala dairy  Cash  ooni  +₹200 fare  ₹1,200  PUR-828-20261020-8011 │  ← TXN header (fare visible)
│   └ Baby Corn    100 kg   ₹10   ₹1,000                                           │  ← ingredient row
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Transaction Header Row

Shown once per purchase event. Spans the full table.

| Field | Value | Notes |
|-------|-------|-------|
| Date | `r.Purchase_Date` | |
| Store | `r.Restaurant_Name` | multi-store only |
| Vendor | `r.Vendor_Name` | |
| Payment | badge(s) | same as today |
| Invoice # | `r.invoice_number` | |
| Fare | `+₹{tot_fair}` pill (orange) | **only when tot_fair > 0** |
| Total | `₹{tot_amount}` bold | replaces Amount on header |
| TXN ID | `r.transaction_id` | mono font |

Styling: `bg-muted/20` background, `font-medium`, `text-xs`.
Single-item transactions: ingredient name shown IN the header row (no sub-row needed — avoids visual clutter for the common 1-item case).

### Ingredient Sub-rows

Shown only when a transaction has **more than 1 ingredient**.

| Field | Value |
|-------|-------|
| Indent indicator | `└` in first cell |
| Ingredient | `r.Ingredient_Name` |
| Qty | `r.Quantity` |
| Unit Price | `line_total / stock_quantity_raw` |
| Item Amount | `r.line_total` |

Styling: no background, indent `pl-5`, `text-muted-foreground`.

### Fare Placement (answers "how it gonna add")

```
Fare is a TRANSACTION-LEVEL charge.
It appears ONCE on the transaction header row, NEVER on ingredient sub-rows.

When tot_fair > 0:
  <span className="text-[9px] font-medium bg-orange-100 text-orange-700 rounded px-1.5 py-0.5">
    + ₹{tot_fair} fare
  </span>

When tot_fair = 0: nothing rendered (no clutter for no-fare purchases).
```

This design means:
- PUR-...-8011: header shows `+ ₹200 fare` and `₹1,200` total (Baby Corn ₹1,000 + fare ₹200)
- PUR-...-8007: header shows `+ ₹100 fare` and `₹300` total (Avocado ₹200 + fare ₹100)
- PUR-...-8009: header shows no fare tag, ₹240 total, then 2 sub-rows (Baby Corn ₹120, Apple ₹120)

### Summary Bar Fix

```javascript
// Replace: setTotalAmount(d.total_amount ?? "0")
// With a computed useMemo that deduplicates by transaction_id:

const correctTotal = useMemo(() => {
  const seen = new Set();
  return rows.reduce((sum, r) => {
    if (!seen.has(r.transaction_id)) {
      seen.add(r.transaction_id);
      return sum + Number(r.tot_amount || 0);
    }
    return sum;
  }, 0);
}, [rows]);
```

`totalAmount` state is no longer needed — `correctTotal` replaces it everywhere.
Result: ₹4,598 (correct) instead of ₹3,998 (today).

---

## Step 4 — Column Layout Comparison

| Today (flat) | Proposed (grouped) |
|---|---|
| Date per ingredient row | Date on transaction header only |
| Store per ingredient row | Store on transaction header only |
| Ingredient | Ingredient in header (1-item) or sub-row (multi-item) |
| Vendor per ingredient row | Vendor on transaction header only |
| Qty | Qty in header (1-item) or sub-row |
| Unit Price | Unit Price in header (1-item) or sub-row |
| Amount (line_total) | Item Amt in header (1-item) or sub-row; Total (tot_amount) on header |
| Payment — REPEATS | Payment on transaction header ONCE |
| Invoice # — REPEATS | Invoice # on transaction header ONCE |
| **Fare: MISSING** | **Fare pill on transaction header when > 0** |
| TXN ID | TXN ID on transaction header |

**Net result: every field appears exactly once per purchase event, regardless of ingredient count.**

---

## Step 5 — Pre-Processing Logic (for PLANNING)

```javascript
// useMemo on displayRows → array of transaction groups
const txnGroups = useMemo(() => {
  const map = new Map();
  displayRows.forEach(r => {
    if (!map.has(r.transaction_id)) {
      map.set(r.transaction_id, { meta: r, lines: [] });
    }
    map.get(r.transaction_id).lines.push(r);
  });
  return Array.from(map.values());
}, [displayRows]);
```

`txnGroups[i].meta` = first row (holds Date, Vendor, Payment, Invoice #, tot_fair, tot_amount, TXN ID).
`txnGroups[i].lines` = all ingredient rows.

Render:
```
txnGroups.map(({ meta, lines }) => (
  <>
    <TransactionHeaderRow meta={meta} isMultiStore={isMultiStore} />
    {lines.length > 1 && lines.map(r => <IngredientSubRow r={r} isMultiStore={isMultiStore} />)}
  </>
))
```

Single-item transaction: header shows ingredient + qty + unit price + item amount inline.
Multi-item transaction: header shows item count + fare + total; sub-rows show each ingredient.

---

## Step 6 — Scope Assessment

| Change | File | Lines | Risk |
|--------|------|-------|------|
| `txnGroups` useMemo | PurchaseReport.jsx | +8 | LOW |
| `correctTotal` useMemo | PurchaseReport.jsx | +8 | LOW |
| Table tbody: flat rows → grouped render | PurchaseReport.jsx | ~40 replace | LOW |
| `totalAmount` state removed | PurchaseReport.jsx | -2 | LOW |
| `TransactionHeaderRow` sub-component | PurchaseReport.jsx | +30 | LOW |
| `IngredientSubRow` sub-component | PurchaseReport.jsx | +15 | LOW |

**1 file only. MEDIUM scope (~100 lines changed/added). No API changes. No backend changes.**

---

## Root Cause Classification

| Issue | Category | Action |
|-------|----------|--------|
| Flat rows cause payment/invoice repeat | Frontend design gap | → PLANNING (redesign table) |
| Fare not visible | Frontend bug | → PLANNING (add fare pill to txn header) |
| Summary total excludes fare | Frontend bug (G-038 backend won't fix) | → PLANNING (correctTotal useMemo) |
| Single/multi-item visual confusion | Frontend design gap | → PLANNING (grouped layout) |

**No backend changes needed. All fixes in `PurchaseReport.jsx`.**

---

## Recommended Next Step

→ **Owner review of proposed design above, then PLANNING (Gates 2–3) → IMPLEMENTATION.**

Open questions for owner before planning:
1. For single-item transactions (most common case) — show ingredient name + qty IN the header row (compact), or always use sub-rows (consistent but more rows)?
   **Recommendation: Show inline on header for 1-item, sub-rows only for 2+ items.**

2. Should the Txn ID column stay at the far right, or move it to be less prominent (since it's a system ID most users don't need)?
   **Recommendation: Keep, but make it de-emphasised (mono, muted colour — already is).**
