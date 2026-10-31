# INVESTIGATION — Suggested Qty / Coverage Days Logic in PO Flow

> **Date:** 2026-10-15
> **Role:** INVESTIGATION
> **Focus:** How suggested quantities are computed in PO Create vs Request Stock — and what's missing
> **No code edits made.**

---

## The Gap in One Sentence

`RequestStockForm.jsx` has a user-facing **"3 / 7 / 10 / 30 days"** coverage selector that drives suggestion quantities.  
`PurchaseOrderCreate.jsx` has **`TARGET_DAYS = 30` hardcoded** in two places with no selector at all.

---

## Evidence: Side-by-Side Formula Comparison

### RequestStockForm.jsx (CORRECT — has selector)

```javascript
// Line 25-29 — selector options exist
const COVERAGE_OPTIONS = [
  { value: 3, label: "3 days" },
  { value: 7, label: "7 days" },   ← default
  { value: 10, label: "10 days" },
  { value: 30, label: "30 days" },
];
const [coverageDays, setCoverageDays] = useState(7); // defaults to 7

// Line 175 — formula uses the selector value
const projectedNeed = avgDaily * coverageDays;
orderQty = max(0, ceil(projectedNeed - currentStock));

// Fallback: if NO consumption data → use min_qty_alert threshold
} else if (minQty > 0 && currentStock < minQty) {
  orderQty = ceil(minQty - currentStock); // gap to threshold
}
// items with no consumption AND no threshold → excluded entirely
```

### PurchaseOrderCreate.jsx (INCORRECT — hardcoded 30d, no selector)

```javascript
// Line 215 — HARDCODED, repeated at line 268 too
const TARGET_DAYS = 30;
suggestedQty = max(0, ceil(TARGET_DAYS * dailyConsumption - currentQty));

// Fallback: if NO consumption data
ordered_qty: isLow ? (suggestedQty || "10") : suggestedQty
//                               ^^^^ arbitrary hardcoded "10" — not based on min_qty_alert
```

---

## What This Means for the Storekeeper

| Scenario | RequestStockForm | PurchaseOrderCreate | Should be |
|----------|-----------------|---------------------|-----------|
| Maida: 4.2 kg/day, 0 in stock, want 7d | Suggests **29.4 kg** | Suggests **126 kg** (30d) | **29.4 kg** (storekeeper chose 7d) |
| Maida: 4.2 kg/day, 0 in stock, want 30d | Suggests **126 kg** | Suggests **126 kg** | **126 kg** ✓ |
| Oil: no consumption data, min threshold 5 ltr, 2 ltr in stock | Suggests **3 ltr** (gap to min) | Suggests **10** (random) | **3 ltr** |
| Rice: 0 kg/day, no threshold, 0 in stock | Excluded from list | Pre-selected with qty **10** | Excluded |

---

## Three Specific Gaps

### Gap 1 — No Coverage Days Selector on PO Create
**Location:** `PurchaseOrderCreate.jsx` lines 215 and 268  
**Current:** `const TARGET_DAYS = 30;` hardcoded  
**Missing:** A `[3d] [7d] [10d] [30d]` pill selector (identical to `RequestStockForm`)  
**Impact:** Storekeeper ordering weekly (7d) gets 4× more stock suggested than needed

---

### Gap 2 — Fallback Logic Uses "10" Instead of min_qty_alert
**Location:** `PurchaseOrderCreate.jsx` line 227  
```javascript
ordered_qty: isLow ? (suggestedQty || "10") : suggestedQty
```
**Problem:** When `dailyConsumption = 0` (no consumption history), falls back to `"10"` regardless of the item's actual minimum threshold (`min_qty_alert`).  
**`RequestStockForm` fallback (correct):**
```javascript
} else if (minQty > 0 && currentStock < minQty) {
  orderQty = ceil(minQty - currentStock); // gap to threshold
}
```

---

### Gap 3 — Items With No Need Are Pre-Selected
**Location:** `PurchaseOrderCreate.jsx` line 229  
```javascript
checked: isLow || (daysOfCover !== null && daysOfCover < 14)
```
**Problem:** Items where `daysOfCover === null` (no consumption data) AND `isLow === false` are neither checked NOR excluded — they appear in the full list of 266 items, all pre-loaded, most pre-checked with qty=10.  
**`RequestStockForm` approach (correct):**
```javascript
if (orderQty <= 0) return null; // item excluded entirely from list
```

---

## The Correct Formula (from RequestStockForm — to be ported to PO Create)

```
Step 1: storekeeper selects coverage days (default 7d)

Step 2 per item:
  IF avgDaily > 0:
    orderQty = max(0, ceil(avgDaily × coverageDays - currentStock))
    show: "X.X kg/day · Y days cover · ordering Z kg for {coverageDays} days"
  ELSE IF min_qty_alert > 0 AND currentStock < min_qty_alert:
    orderQty = ceil(min_qty_alert - currentStock)
    show: "No consumption data · gap to min threshold: Z kg"
  ELSE:
    exclude item (don't show in suggested list)

Step 3:
  Show as SUGGESTED orange row
  Storekeeper can override qty
  Storekeeper can add non-suggested items via type-to-search
```

---

## Where Each Signal Lives

| Signal | API field | Used in RequestStockForm? | Used in PO Create? |
|--------|-----------|:---:|:---:|
| Daily consumption | `daily-consumption-report` → `total_consumed` | ✅ | ✅ |
| Coverage days (selector) | Frontend state only | ✅ (3/7/10/30d) | ❌ hardcoded 30d |
| Min stock threshold | `stock-inventory` → `min_qty_alert` | ✅ fallback | ❌ ignored (uses "10") |
| Current stock | `stock-inventory` → `display_qty` | ✅ | ✅ |
| Days of cover | computed | ✅ shown | ✅ shown |

---

## What the Mockup Should Show

In the PO Items screen (Screen 3), the header should include a **Coverage Days pill selector**:

```
VENDOR [Fresh Farms ▼]  DELIVERY [date]  NOTES [...]  COVER [3d] [7d] [10d] [30d]
                                                                    ▲ default 7d
```

When storekeeper changes from 7d → 30d:
- Suggested quantities recalculate instantly
- "SUGGESTED" orange rows update qty fields live

The hint under each suggested item should read:
```
Maida: 0 kg stock · 4.2 kg/day · ordering 29.4 kg for 7 days
Onion: 12.4 kg stock · 4.1 kg/day · ordering 16.3 kg for 7 days  ← not 111!
```
vs. current (hardcoded 30d):
```
Maida: ordering 126 kg
Onion: ordering 111 kg  ← 4× overstocked
```

---

## Recommendation

**Add to CR-047 scope:**
- Port `COVERAGE_OPTIONS` (3/7/10/30d) selector from `RequestStockForm` → `PurchaseOrderCreate` 
- Port `min_qty_alert` fallback from `RequestStockForm` → `PurchaseOrderCreate`
- Change default from 30d → **7d** for PO Create (weekly ordering is more common for vendor purchases)
- Remove the arbitrary `"10"` fallback
- Exclude items with no need (same as `RequestStockForm` — `if (orderQty <= 0) return null`)

**All changes are in one file:** `PurchaseOrderCreate.jsx`

---

## Files Referenced

| File | Finding |
|------|---------|
| `PurchaseOrderCreate.jsx` lines 215, 268 | `TARGET_DAYS = 30` hardcoded |
| `PurchaseOrderCreate.jsx` line 227 | `suggestedQty \|\| "10"` bad fallback |
| `PurchaseOrderCreate.jsx` line 229 | `checked: isLow \|\| daysOfCover < 14` — doesn't exclude no-need items |
| `RequestStockForm.jsx` lines 25-38 | `COVERAGE_OPTIONS` + `coverageDays` state — correct pattern to port |
| `RequestStockForm.jsx` lines 173-193 | Full suggestion formula — correct |
| `RequestStockForm.jsx` lines 396-407 | Coverage selector JSX — copy this UI |
