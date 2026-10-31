# INVESTIGATION — BUG-061 Fare Visibility: Design Revision
> **Date:** 2026-10-20
> **Role:** INVESTIGATION
> **Triggered by:** Owner — "fare looks too small, reinvestigate design"
> **Screenshot evidence:** Provided — fare renders as `+₹200 fare` in ~9px text below ₹1,200
> **No code. Skip gate.**

---

## Root Cause of Visibility Problem

Current implementation (`PurchaseReport.jsx` line 290):

```jsx
<div className="text-[9px] font-normal text-orange-600 whitespace-nowrap mt-0.5">
  + ₹{Number(m.tot_fair).toLocaleString("en-IN")} fare
</div>
```

| Property | Value | Problem |
|----------|-------|---------|
| `text-[9px]` | 9 pixels | Smallest readable size on screen — barely visible |
| `font-normal` | 400 weight | Blends into background |
| `div` with no background | Plain text | No visual separation from the amount above it |

The orange colour gives a hint it's there, but at 9px/normal weight it reads as a footnote rather than a key piece of financial data. On the screenshot it's easy to miss entirely.

---

## Three Design Options

---

### Option A — Pill Badge (simplest, quickest)

Make the fare a proper badge inside the Amount cell — same cell, just styled like a label.

```
┌───────────────────────┐
│ ₹1,200                │
│ [+₹200 fare]          │  ← orange pill badge (bg-orange-100, border, rounded)
└───────────────────────┘
```

**What changes:** 1 CSS tweak on line 290.
- `text-[9px] font-normal` → `text-xs font-medium` (12px, semibold)
- Add `bg-orange-100 border border-orange-200 rounded px-1.5 py-0.5 inline-flex items-center gap-0.5`

**Result on screen:**

```
Amount column:
  ₹1,200
  ┌──────────────┐
  │ +₹200 fare  │   ← orange pill, clearly visible
  └──────────────┘

Zero-fare row:
  ₹100            ← unchanged, no badge
```

**Trade-off:** Fare info is still inside the Amount cell. Works well when most purchases
have no fare (badge only appears when needed). Slightly taller rows on fare purchases.

---

### Option B — Dedicated "Fare" Column

Add an 11th column between Amount and Payment. Fare is always scannable in its own column.

```
│ DATE │ STORE │ INGREDIENT │ VENDOR │ QTY │ UNIT PRICE │ AMOUNT │ FARE  │ PAYMENT │ INVOICE # │ TXN ID │
│──────┼───────┼────────────┼────────┼─────┼────────────┼────────┼───────┼─────────┼───────────┼────────│
│ 10-20│  ...  │ Baby Corn  │  ...   │100kg│    ₹10     │ ₹1,000 │ ₹200  │  Cash   │   ooni    │ PUR-.. │
│ 10-20│  ...  │ Apple      │  ...   │ 10kg│    ₹10     │  ₹100  │  —    │  Cash   │   —       │ PUR-.. │
│ 10-19│  ...  │ 2 items    │  ...   │  —  │     —      │  ₹288  │  —    │ Partial │  cbvbb8   │ PUR-.. │
│      │       │  └Curry Leaf│       │ 11kg│    ₹8      │   ₹88  │       │         │           │        │
│      │       │  └Beet Root │       │ 10kg│    ₹20     │  ₹200  │       │         │           │        │
```

- **Amount** column reverts to `line_total` on header row for single-item (item cost only)
- **Fare** column: `₹{tot_fair}` in orange when > 0; `—` when 0; blank on sub-rows
- User can scan the entire Fare column at a glance to spot all charged fares

**Trade-off:** 11th column makes the table wider. Requires horizontal scroll on smaller screens.
The "Amount" column semantics also shift back (shows `line_total` not `tot_amount` on headers).

---

### Option C — Two-Line Amount Cell (recommended)

The Amount cell shows the **total paid** prominently on line 1, and a **breakdown** on line 2
when fare > 0. No new column. Fare is clearly readable but doesn't bloat the table width.

```
Amount column:

  No fare:                  With fare:
  ┌──────────────┐          ┌──────────────────────────────┐
  │ ₹100         │          │ ₹1,200                       │
  │              │          │ ₹1,000 items · +₹200 fare    │
  └──────────────┘          └──────────────────────────────┘
```

**Exact cell content:**
```jsx
// Amount cell (transaction header row):
₹{tot_amount}                              ← bold, font-semibold (same as today)
{hasFare && (
  <div className="text-xs text-muted-foreground font-normal mt-0.5">
    ₹{line_total} items
    <span className="text-orange-600 font-medium"> · +₹{tot_fair} fare</span>
  </div>
)}
```

**Result:**
- `₹1,200` — top line, bold, same size as all other amounts
- `₹1,000 items · +₹200 fare` — second line, `text-xs` (12px), muted grey for items part, orange+medium for fare
- No-fare rows: unchanged, single amount line

**Why this is clearest:**
1. You immediately see the total you actually paid (₹1,200) at a glance
2. The breakdown explains how it splits: items vs fare
3. Orange + medium weight on the fare part makes it impossible to miss
4. No new column — table stays at 10 columns

---

## Comparison

| | Option A (Pill badge) | Option B (Fare column) | Option C (Two-line, recommended) |
|---|---|---|---|
| Fare visibility | Good (badge is clear) | Best (own column, always scannable) | Best (breakdown always visible, bold contrast) |
| Table width | Unchanged | +1 column (wider) | Unchanged |
| Total amount clarity | ₹1,200 shown prominently | ₹1,000 shown (item only; fare separate) | ₹1,200 shown (then breakdown below) |
| Code change | 1 line | ~15 lines (new column header + cell) | ~5 lines |
| Multi-item header fare | Badge below amount | Fare column shows ₹X | Breakdown line below ₹288 |

---

## Recommendation

**Option C — Two-line Amount cell.**

The storekeeper needs to see at a glance: "what did I actually pay total?" (₹1,200) — that
stays bold and prominent. The breakdown `₹1,000 items · +₹200 fare` appears on a second line
at readable `text-xs` size with orange emphasis on the fare portion. No new column, no scroll,
no ambiguity.

---

## Owner Decision Needed

Pick one:

**A** — Pill badge: fare stays in Amount cell but becomes a proper styled badge  
**B** — Dedicated Fare column: 11th column, always visible for all rows  
**C** *(recommended)* — Two-line Amount cell: total on top, items + fare breakdown below

Once you confirm, PLANNING → Gate 3 addendum → IMPLEMENTATION (1 file, ~5 lines).
